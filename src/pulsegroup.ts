/** @module pulsegroup Create Configuration for joining our pulseGroup object */

import fs = require("fs");
import os = require("os");
import http = require("http");
import { exec, ExecException, fork, ChildProcess } from 'child_process';
import express = require("express");
import { dump, now, MYVERSION, median, mint2IP, nth_occurrence, ts  } from "./lib";
import { logger, LogLevel } from "./logger";
import { NodeAddress, IncomingPulse, SenderMessage, SenderPayloadType } from "./types";
import { grapherStoreOwls } from "./grapher";
import { setWireguard, addPeerWGStanza, addMyWGStanza } from "./wireguard";

logger.setLevel(LogLevel.ERROR);  //wbn-turn off extraneous for debugging
// Define constants
const PULSEFREQ=1;  // (in seconds) how often to send pulses
const MEASURE_RTT=false;   //ping across wireguard interface
const FIND_EFFICIENCIES=true; //search for better paths through intermediaries
const WG_PULSEFREQ=2; //send pings over wireguard mesh every other second
const SECURE_PORT=65020;
const CHECK_SW_VERSION_CYCLE_TIME = 15; // wbnwbnwbnCHECK SW updates every 15 seconds
const NO_MEASURE = -99999;
const DEFAULT_START_STATE = "QUARANTINE"; // "SINGLESTEP"; console.log(ts()+"EXPRESS: ALL NODES START IN SINGLESTEP (no pulsing) Mode");
logger.info("pulsegroup: ALL NODES START IN " + DEFAULT_START_STATE + " Mode");


// const DEVIATION_THRESHOLD=20;  // Threshold to flag a matrix cell as "interesting", exceeding this percentage from median

// Define data structures used in the protocol

/** App configuration settings obtained from ENV variables */
export class Config {
    DARPDIR: string;
    GENESIS: string;
    GENESISPORT: number;
    GEO: string;
    HOSTNAME: string;
    IP: string;
    PORT: number;
    PUBLICKEY: string;
    VERSION: string;
    WALLET: string;
    constructor() {
        if (!process.env.DARPDIR) {
            logger.warning("No DARPDIR environmental variable specified ");
            process.env.DARPDIR = process.env.HOME + "/darp";
            logger.warning(`DARPDIR defaulted to " + ${process.env.DARPDIR}`);
        }
        this.DARPDIR = process.env.DARPDIR;

 


        var PORT = 65013;
        if (process.env.PORT) {
            PORT = parseInt(process.env.PORT);
        }
        logger.info(`Starting with PORT=${PORT}`);
        this.PORT = PORT;

        var GENESISPORT = PORT;
        if (process.env.GENESISPORT) {
            GENESISPORT = parseInt(process.env.GENESISPORT); //Unless otherwise specified GENESIS PORT is same as user's port
            logger.info(`Setting GENESISPORT to ${GENESISPORT}`);
        }
        this.GENESISPORT = GENESISPORT;

        if (!process.env.HOSTNAME) {
            process.env.HOSTNAME = os.hostname().split(".")[0].toUpperCase();
            logger.warning(`No HOSTNAME environmental variable specified + ${process.env.HOSTNAME}`);
        }
        var HOSTNAME = process.env.HOSTNAME; //multiport - may want to tack port to name?
        if (PORT != 65013) {
            HOSTNAME += "@" + PORT;
        }
        this.HOSTNAME = HOSTNAME;

        if (!process.env.VERSION) {
            process.env.VERSION = fs.readFileSync("./SWVersion", { encoding: "utf8", flag: "r" }).trim();
            logger.warning(`No VERSION environmental variable specified - setting to ${process.env.VERSION}`);
        }
        this.VERSION = process.env.VERSION || "NoVersion";

        if (!process.env.MYIP) {
            logger.warning("No MYIP environmental variable specified - GENESIS node will find IP from incoming message");
            process.env.MYIP = process.env.GENESIS; // MYIP();
        } else {
            process.env.MYIP = process.env.MYIP.replace(/['"]+/g, ""); //\trim string
        }
        this.IP = process.env.MYIP||"";

//        if (!process.env.GENESIS) {
//            logger.error(`No GENESIS environmental variable specified - EXITTING`);
//            process.exit(86);
//        }
        this.GENESIS = process.env.GENESIS||"";
        if (this.GENESIS=="") {
            console.log(`Finding a GENESIS node to connect to`);
            let genesisNodeList=process.env.GENESISNODELIST;
            console.log(`I am ${this.IP} genesisNodeList=${genesisNodeList}`);
            if (genesisNodeList) {
                let genesisNodes=genesisNodeList.split(",");
                var isGenesisNode=false;
                //console.log(`Seaching for genesis node to use as genesis node`);
                for (var g in genesisNodes) {
                    //console.log(`checking ${genesisNodes[g]} against ${this.GENESIS}`);
                    if (genesisNodes[g]==this.IP) {
                        isGenesisNode=true;
                        //console.log(`GOT IT`);
                    }
                }
                if (!isGenesisNode) {
                    this.GENESIS=genesisNodes[Math.floor(Math.random() * genesisNodes.length)];
                    console.log(`Setting random genesis node: ${this.GENESIS}`);
                } else {
                    console.log(`WE ARE GENESIS NODE`);
                    this.GENESIS=this.IP;
                }
            } else {
                console.log(`pulseGroup(): We have no GENESISNODELIST `);
            }
        }


        var PUBLICKEY = process.env.PUBLICKEY || "noPublicKey";
        if (!PUBLICKEY) {
            try {
                PUBLICKEY = fs.readFileSync("../wireguard/publickey", "utf8");
                PUBLICKEY = PUBLICKEY.replace(/^\n|\n$/g, "");
                logger.info("pulled PUBLICKEY from publickey file: >" + PUBLICKEY + "<");
            } catch (err) {
                logger.warning("PUBLICKEY lookup failed");
                PUBLICKEY = "deadbeef00deadbeef00deadbeef0013";
            }
        }
        this.PUBLICKEY = PUBLICKEY;

        var GEO = HOSTNAME; //passed into docker
        GEO = GEO.toUpperCase().split(".")[0].split(":")[0].split(",")[0].split("+")[0];  //remove problem characters
        this.GEO = GEO;

        this.WALLET = process.env.WALLET || "auto";

    }
}

/** Node configuraton details */
export class MintEntry {
    mint: number;
    geo: string;

    port: number;
    ipaddr: string;
    publickey: string;

    state: string;
    bootTimestamp: number;
    version: string;
    wallet: string;
    lastPulseTimestamp: number;
    lastOWL: number;
    constructor(mint: number, geo: string, port: number, incomingIP: string, publickey: string, version: string, wallet: string) {
        this.mint = mint;
        this.geo = geo;
        this.port = port;
        this.ipaddr = incomingIP; //set by genesis node on connection
        this.publickey = publickey;
        this.state = DEFAULT_START_STATE;
        this.bootTimestamp = now(); //RemoteClock on startup  ****
        this.version = version; //software version running on remote system ********
        this.wallet = wallet; // **
        this.lastPulseTimestamp = 0; //for timing out and validating lastOWL
        this.lastOWL = NO_MEASURE; //most recent OWL measurement
    }
}

/** Contains stats for and relevent fields to configure wireguard. */
export class PulseEntry {
    outgoingTimestamp: number; // from message layer
    pulseTimestamp: number; // from message layer

    mint: number; // Genesis node would send this
    geo: string; // record index (key) is <geo>:<genesisGroup>
    group: string; // DEVPOS:DEVOP.1 for genesis node start
    ipaddr: string; // DEVPOS:DEVOP.1 for genesis node start
    port: number; // DEVPOS:DEVOP.1 for genesis node start
    seq: number; // last sequence number heard
    owl: number; // delete this when pulseTimestamp is >2 secs old
    owls: string;
    history: number[]; // history of last 60 owls measured
    medianHistory: number[]; // history of 1-minute medians

    bootTimestamp: number;
    version: string;
    inPulses: number;
    outPulses: number;
    pktDrops: number;
    lastMsg: string;
    rtt: number; //round trip measures help ID route asymetry and therefore optmizatioj opportuniies

    constructor(mint: number, geo: string, group: string, ipaddr: string, port: number, version: string) {
        this.mint = mint;
        this.geo = geo;
        this.group = group;
        this.ipaddr = ipaddr;
        this.port = port;
        this.seq = 1;
        this.owl = NO_MEASURE;
        this.pulseTimestamp = 0;
        this.owls = "1"; // startup - I am the only one here
        this.history = [];
        this.medianHistory = [];
        this.rtt = NO_MEASURE;

        this.bootTimestamp = now(); // RemoteClock on startup  **** - we abandon the pulse when this changes
        this.version = version; // software version running on sender's node
        this.inPulses = 0;
        this.outPulses = 0;
        this.pktDrops = 0;
        this.lastMsg = "";
        this.outgoingTimestamp = 0; // sender's timestamp on send
    }
}

type Pulses = { [x: string]: PulseEntry };
export type PulseGroups = { [x: string]: PulseGroup };

/** Main object containing all details about a group of nodes */
export class PulseGroup {
    groupName: string;
    groupOwner: string;
    mintTable: MintEntry[];
    pulses: Pulses;
    rc: string;
    ts: number;
    nodeCount: number;
    nextMint: number;
    cycleTime: number;
    matrix: number[][];
    csvMatrix: number[];
    constructor(me: MintEntry, genesis: MintEntry, pulse: PulseEntry) {
        this.groupName = me.geo + ".1";
        this.groupOwner = me.geo;
        this.mintTable = [me, genesis]; // simplification: me should always be mintTable[0], genesis node should always be mintTable[1]
        this.pulses = {
            [genesis.geo + ":" + genesis.geo + ".1"]: pulse,
        }; // store statistics for this network segment
        this.rc = "";
        this.ts = now();
        this.nodeCount = 1; // how many nodes in this pulsegroup
        this.nextMint = 2; // assign IP. Allocate IP out of 10.10.0.<mint>
        this.cycleTime = PULSEFREQ; // pulseGroup-wide setting: number of seconds between pulses
        this.matrix = [];
        this.csvMatrix = [];
    }
}

/** PulseGroup object with all necessary functions for sending and receiving pulses */
export class AugmentedPulseGroup {
    // attributes from PulseGroup
    groupName: string;
    groupOwner: string;
    mintTable: MintEntry[];
    pulses: Pulses;
    rc: string;
    ts: number;
    nodeCount: number;
    nextMint: number;
    cycleTime: number;
    matrix: number[][];     //should go away - we can peruse owls in pulseTable to get this
    csvMatrix: number[];    //goes away

    // additional attributes
    adminControl: string;
    config: Config;
    extraordinaryPaths: { [index:string] : { startTimestamp:number, lastUpdated:number, aSide:string, zSide:string, direct:number, relayMint: number, intermediary:string, intermediaryPathLatency:number, srcToIntermediary:number, intermediaryToDest:number, delta:number } };   //@wbnwbnwbn
    incomingPulseQueue: IncomingPulse[];   //queue of incoming pulses to handle TESTING
    
    // child processes for sending and receiving the pulse messages
    receiver: ChildProcess;
    sender: ChildProcess;

    constructor(config: Config, pulseGroup: PulseGroup) {
        this.groupName = pulseGroup.groupName;
        this.groupOwner = pulseGroup.groupOwner;
        this.mintTable = pulseGroup.mintTable; // Simplification: me should always be mintTable[0], genesis node should always be mintTable[1]
        this.pulses = pulseGroup.pulses; //store statistics for this network segment
        this.rc = pulseGroup.rc;
        this.ts = pulseGroup.ts;
        this.nodeCount = pulseGroup.nodeCount; //how many nodes in this pulsegroup
        this.nextMint = pulseGroup.nextMint; //assign IP. Allocate IP out of 10.10.0.<mint>
        this.cycleTime = pulseGroup.cycleTime; //pulseGroup-wide setting: number of seconds between pulses
        this.matrix = pulseGroup.matrix; //should go away - we can always peruse the pulseTable owls
        this.csvMatrix = pulseGroup.csvMatrix; //should go away
        
        this.adminControl = "";
        this.config = config;
        this.extraordinaryPaths = {}; //object array of better paths through intermediaries @wbnwbnwbn
        this.incomingPulseQueue = []; //queue of incoming pulses to handle TESTING
        
        this.receiver = fork(config.DARPDIR + '/dist/receiver.js', [config.PORT.toString()]);
        this.receiver.on('exit', (code) => {
            logger.warning(`Receiver process exited with code ${code}`);
        });
        this.receiver.on('message', (incomingMessage: string) => {
            logger.debug(`AugmentedPulseGroup has received message from receiver: ${incomingMessage}`);
            this.recvPulses(incomingMessage);
        });
        
        this.sender = fork(config.DARPDIR + '/dist/sender.js', [(PULSEFREQ * 1000).toString()]);
        this.sender.on('exit', (code) => {
            logger.warning(`Sender process exited with code ${code}`);
        });
        this.sender.on('message', (message) => {
            logger.debug(`AugmentedPulseGroup has received message from sender: ${message}`);
        });
    }

    forEachNode = (callback: CallableFunction) => {
        for (var node in this.pulses) callback(node, this.pulses[node]);
    };

    forEachMint = (callback: CallableFunction) => {
        for (var mint in this.mintTable) callback(mint, this.mintTable[mint]);
    };

    flashWireguard = () => {
        logger.info(`flashWireguard()`);
        var myStanza = "";
        var peerStanza = "";
        for (var m in this.mintTable) {
            const mintEntry = this.mintTable[m];
            if (mintEntry != null) {
                if (m == "0")
                    myStanza = addMyWGStanza(
                        mintEntry.geo,
                        mintEntry.ipaddr,
                        mintEntry.port,
                        mintEntry.mint,
                        mintEntry.publickey
                    );
                else
                    peerStanza += addPeerWGStanza(
                        mintEntry.geo,
                        mintEntry.ipaddr,
                        mintEntry.port,
                        mintEntry.mint,
                        mintEntry.publickey
                    );
            }
        }
        logger.debug(`flashWireguard(): myStanza=${myStanza} peerStanza=${peerStanza}`); // create first dummy wireguard confiig file (only me)
        //console.log(`flashWireguard(): myStanza=${myStanza} peerStanza=${peerStanza}`); // create first dummy wireguard confiig file (only me)
        setWireguard(myStanza + "\n" + peerStanza);
    };

    //TODO: is this the only place that nodes are added?  I do it manually somewhere...?
    addNode = (geo: string, group: string, ipaddr: string, port: number, publickey: string, version: string, wallet: string): MintEntry => {
        this.deleteNode(ipaddr, port); // remove any preexisting entries with this ipaddr:port
        var newMint = this.nextMint++; // get a new mint for new node
        this.pulses[geo + ":" + group] = new PulseEntry(newMint, geo, group, ipaddr, port, this.config.VERSION);
        var newNode = new MintEntry(newMint, geo, port, ipaddr, publickey, version, wallet);
        this.mintTable[newMint] = newNode;
        // newPulseGroup.nodeCount++;
        logger.warning(
            "addNode(): added mintEntry and empty pulse entry " +
                dump(newNode) +
                dump(this.pulses[geo + ":" + group])
        );
        console.log(
            "addNode(): added mintEntry and empty pulse entry " +
                dump(newNode) +
                dump(this.pulses[geo + ":" + group])
        );
        this.nodeCount = Object.keys(this.pulses).length;

        return this.mintTable[newMint];
    };

    // Genesis node controls population - it can delete mintTable, pulse and owl for the mint
    deleteNode = (ipaddr: string, port: number) => {
        for (var m in this.mintTable) {
            const mintEntry = this.mintTable[m];
            if (mintEntry && m != "0" && m != "1") {
                // ignore first mints me and genesis node - don't delete those
                if (mintEntry.ipaddr == ipaddr && mintEntry.port == port) {
                    logger.warning( `deleteNode(): deleting mint ${mintEntry.mint}`);
                    console.log( `deleteNode(): deleting mint ${mintEntry.mint}`);
                    delete this.mintTable[mintEntry.mint];
                }
            }
        }
        var deletedMint = -1;
        for (var pulseLabel in this.pulses) {
            const pulseEntry = this.pulses[pulseLabel];
            if (pulseEntry.ipaddr == ipaddr && pulseEntry.port == port) {
                logger.warning(`deleteNode: deleting pulse ${pulseLabel}`);
                console.log(`deleteNode: deleting pulse ${pulseLabel}`);
                deletedMint = pulseEntry.mint;
                delete this.pulses[pulseLabel];
            }
        }

        /*  delete code
        //remove mint from the group owner's owls list
        if (this.isGenesisNode()) {
            var groupOwnerPulseLabel = this.groupOwner + ":" + this.groupName;
            var groupOwnerPulseEntry = this.pulses[groupOwnerPulseLabel];
            if (groupOwnerPulseEntry != null) {
                var owlEntryAry = groupOwnerPulseEntry.owls.split(",");
                var newOwls = ""; // copy all but deleted OWLs to control population
                for (var o in owlEntryAry) {
                    if (parseInt(owlEntryAry[o]) != deletedMint) {
                        newOwls += owlEntryAry[o] + ",";
                    }
                }
            }
        }
        /***/

        this.nodeCount = Object.keys(this.pulses).length;
    };

    // Build matrix of objects for each segment
    buildMatrix = () => {
        //return ;
        var matrix: number[][] = [];
        for (var pulse in this.pulses) {
            const pulseEntry = this.pulses[pulse];

            if (now() - pulseEntry.pulseTimestamp < 2 * PULSEFREQ*1000) {  //! miss 2 poll cycles
                // valid pulse - put all my OWLs into matrix
                var ary = pulseEntry.owls.split(",");

                for (var owlEntry in ary) {
                    var m = parseInt(ary[owlEntry].split("=")[0]);
                    var owl = NO_MEASURE;
                    var strOwl = ary[owlEntry].split("=")[1];

                    if (typeof strOwl != "undefined") {
                        owl = parseInt(strOwl);
                    }

                    if (typeof matrix[m] == "undefined") {
                        matrix[m] = [];
                    }

                    matrix[m][pulseEntry.mint] = owl; // pulse measured to peer
                }

                if (typeof matrix[pulseEntry.mint] == "undefined") {
                    matrix[pulseEntry.mint] = [];
                }

                matrix[pulseEntry.mint][this.mintTable[0].mint] = pulseEntry.owl; // pulse measured to me
            } else {
                // old pulse - clear these entries
                if (pulseEntry.pulseTimestamp!=0) 
                    logger.warning(`buildMatrix(): ${pulseEntry.geo} mint#${pulseEntry.mint} has an old pulseTimestamp ${pulseEntry.pulseTimestamp}. TODO: Enter NO_OWL for all values to this node`);
                
                //it is possible that the node has not received a pulse yet - so value==0
                
                    // node did not respond - so we have no data - no entry, should we mark call all NO_OWL
                // newPulseGroup.forEachNode(function(index:string,groupNode:PulseEntry) {
                //    if ((index!="0") && (groupNode.mint!=nodeEntry.mint))
                //        matrix[groupNode.mint][nodeEntry.mint]=NO_OWL;  //clear out previously published measurements
                //});

                // if (typeof newPulseGroup.mintTable[0].mint=="undefined")  return console.log("UNDEFINED MINT 0 - too early");
                // console.log(`nodeEntry.mint=${nodeEntry.mint} mymint=${newPulseGroup.mintTable[0].mint}`);

                if (typeof matrix[pulseEntry.mint] == "undefined") {        //wbnwbnwbn-TODO: should
                    matrix[pulseEntry.mint] = [];                           //
                }                                                           //
                matrix[pulseEntry.mint][this.mintTable[0].mint] = NO_MEASURE; // this guy missed his pulse - mark his entries empty
            }
        }

        // replace existing matrix
        this.matrix = matrix;
    };

    // Send our OWL measurements to all in the pulseGroup
    // TODO: SECURITY - least privelege principle -
    //         DO NOT pulse nodes in Quarantine the same - only send OWLs and mints for you and new guys
    //         until they are out of quarantine
    //         and commnicating over secure MeshChannel
    //         then they get all nodes as needed to measure/communicate
    // TODO: pulse (measure OWLs) over secure channel - just change to private addr
    pulse = () => {
        var nodeList: NodeAddress[] = [];
        var owls = "";
        //
        //  First make owls list to pulse and highlight segments that should be looked aty with a FLAG '@'
        //
        for (var pulse in this.pulses) {
            var pulseEntry = this.pulses[pulse];
            nodeList.push(new NodeAddress(pulseEntry.ipaddr, pulseEntry.port));
            nodeList.push(new NodeAddress(mint2IP(pulseEntry.mint), SECURE_PORT)); // wbnwbn send to secure channel also
            pulseEntry.outPulses++;

            // this section flags "interesting" cells to click on and explore
            var flag = "";
            if (pulseEntry.owl == NO_MEASURE) {
                owls += pulseEntry.mint + ",";
            } else {
                var medianOfMeasures = median(pulseEntry.history);
                if (pulseEntry.medianHistory.length > 0 && pulseEntry.owl!=0) {   //medianHistory will take a minute to get an entry
                    // use medianHistory to identify a median to deviate from
                    var medianOfMedians = median(pulseEntry.medianHistory);
                    var deviation = Math.round(
                        (Math.abs(medianOfMedians - pulseEntry.owl) * 100) /
                            medianOfMedians
                    );
                    var delta = Math.abs(medianOfMedians - pulseEntry.owl);  //# ms different
                    //TURN ON TO DEBUG FLAGGING
                     //if (deviation!=0) 

                     if ( ( delta>5) && (pulseEntry.owl>3) && (deviation>20) ) {  //flag if off by 20% from median saving more than 5ms
                        //console.log(`pulse(): geo=${pulseEntry.geo} pulseEntry.owl=${pulseEntry.owl} medianOfMeasures=${medianOfMeasures} medianOfMedians=${medianOfMedians} deviation=${deviation}% delta=${delta}`);
                            // flag if deviation is > 10ms - we can improve that
                            //console.log(ts()+`pulse(): Flagging ${pulseEntry.mint}-${this.mintTable[0].mint}=${pulseEntry.owl}  delta=${delta} geo=${pulseEntry.geo} --> ${this.config.GEO} nodeEntry.owl=${pulseEntry.owl}@ medianOfMeasures=${medianOfMeasures} medianOfMedians=${medianOfMedians} deviation=${deviation}%`);
                            logger.info(`pulse(): Flagging ${pulseEntry.mint}-${this.mintTable[0].mint}=${pulseEntry.owl}  delta=${delta} geo=${pulseEntry.geo} to ${this.config.GEO} nodeEntry.owl=${pulseEntry.owl}@ medianOfMeasures=${medianOfMeasures} medianOfMedians=${medianOfMedians} deviation=${deviation}%`);
                            flag = "@";
                    }
                }
            }

            if (pulseEntry.owl == NO_MEASURE) {
                owls += pulseEntry.mint + ",";
            } else {
                owls += pulseEntry.mint + "=" + pulseEntry.owl + flag + ",";
            }
        }

        owls = owls.replace(/,+$/, ""); // remove trailing comma
        var myEntry = this.pulses[this.config.GEO + ":" + this.groupName];
        logger.debug(`pulse(): looking for my entry to pulse: ${this.config.GEO}:${this.groupName}`);
        
        if (myEntry == null) {
            logger.warning(`Cannot find ${this.config.GEO}:${this.groupName}`);
        } else {
            myEntry.seq++;
            const myMint = this.mintTable[0].mint;
            const pulseMessage = 
                "0," + 
                this.config.VERSION + "," + 
                this.config.GEO + "," + 
                this.groupName + "," + 
                myEntry.seq + "," + 
                this.mintTable[0].bootTimestamp + "," + 
                myMint + "," + 
                owls;
            logger.debug(`pulseGroup.pulse(): pulseMessage=${pulseMessage} to ${dump(nodeList)}`);
            // sendPulses(pulseMessage, ipary);  //INSTRUMENTATION POINT
            const nodelistMessage = new SenderMessage(SenderPayloadType.NodeList, nodeList)
            this.sender.send(nodelistMessage)

            const outgoingMessage = new SenderMessage(SenderPayloadType.OutgoingMessage, pulseMessage)
            this.sender.send(outgoingMessage)
        }

        this.timeout(); // and timeout the non-responders
        if (this.adminControl == "RESYNCH") {
            logger.info("Resynching with genesis node...");
            this.syncGenesisPulseGroup(); // fetch new config from genesis
            this.adminControl = "";
        }
        // this.mintTable[0].state = "UP";
        this.mintTable[0].lastPulseTimestamp = now();
        var timeNow=this.mintTable[0].lastPulseTimestamp;  //
        var sleepTime=PULSEFREQ*1000-timeNow%1000;

        // INSTRUMENTATION POINT shows load on node - DO NOT DELETE
        //console.log(`timeNow%1000=${timeNow%1000} sleeping ${sleepTime} ms`);
        //console.log(ts()+`** pulsing took=${now()%1000} ms since we started on second boundary`);
        setTimeout(this.pulse, sleepTime); //pull back to on-second boundary
    };

    isGenesisNode = (): Boolean => {
        return this.mintTable[0].geo == this.groupOwner;
    };

    // Two different timeouts
    // 1) update packetLoss counters and clear OWLs in pulseEntry
    // 2) remove nodes that timeout (Genesis manages group population)
    //    or non-genesis nodes remove the group when genesis node goes away for n=~15 seconds
    // All pulseTimes are assumed accurate to my local clock
    timeout = () => {
        console.log(ts()+`timeout()`);
        const startingPulseEntryCount = Object.keys(this.pulses).length;

        if (this.isGenesisNode()) {  
            console.log(`timeout(): GENESIS NODE path`);
            for (var m in this.mintTable) { // GENESIS NODE - time out and delete expired entries 
                const mintEntry=this.mintTable[m];
                if (mintEntry.lastPulseTimestamp==0) {
                    console.log(`timeout(): GENESIS node ignoring pulseStamp==0  ${mintEntry.geo} ${mintEntry.mint}`);
                } else {
                    var elapsedMSincePulse = now() - this.mintTable[m].lastPulseTimestamp;

                    if (elapsedMSincePulse > 1.5 * this.cycleTime * 1000) {  //after n cycles no mintTable updates - remove
                        console.log(`TIMEOUT : elapsedMSincePulse=${elapsedMSincePulse} mintTable=${this.mintTable[m]}`);
                        // timeout the node
                        logger.debug(`m=${m} elapsedMSincePulse=${elapsedMSincePulse} clearing OWL in mint entry which missed at least one cycle ${this.mintTable[m].geo}`);
                        console.log(`m=${m} elapsedMSincePulse=${elapsedMSincePulse} clearing OWL in mint entry which missed at least one cycle ${this.mintTable[m].geo}`);

                        //find the p
                        const pulseEntry=this.pulses[mintEntry.geo+":"+this.groupName];
                        if (pulseEntry) {
                            pulseEntry.owl = NO_MEASURE;
                            pulseEntry.owls = "1";
                            pulseEntry.pktDrops++;
                        }
                        this.mintTable[m].lastOWL = NO_MEASURE;  // we don't have a valid OWL
                        if (this.mintTable[m].state != "QUARANTINE") {
                            this.mintTable[m].state = "NR";  // we don't know this node's state
                            console.log(`timeout(): Setting ${this.mintTable[m].geo} to Not Reachable`);
                        }
                        
                        if (elapsedMSincePulse > 5 * this.cycleTime * 1000) {  //after 5 cycles
                            // timeout node after 5 seconds
                            console.log(`timeout(): TIMING OUT AND DELETING geo=${this.mintTable[m].geo} mint=${this.mintTable[m].mint} NODE with ${elapsedMSincePulse} ms old timestamp `);
                            this.deleteNode(this.mintTable[m].ipaddr, this.mintTable[m].port);
                        }
                    }
                }
            }
        } else {    //I am NOT GENESIS NODE - time out 
            console.log(`timeout(): NON-GENESIS NODE path`);
            if (this.mintTable[1].lastPulseTimestamp!=0) {      //All I can do is time out GENESIS node
                var age = (now() - this.mintTable[1].lastPulseTimestamp)/1000;
                console.log(`have not heard from GENESIS node in age=${age} seconds`);
                if (age > 10) {              //after 10 seconds we say genesis is gone
                    logger.error(`timeout(): Genesis node disappeared. age of = ${age} ms Exit, our work is done. Exitting. newpulseGorup=${dump(this)}`);
                    console.log(`have not heard from GENESIS node in more than 10 seconds - exitting, reloading software`);
                    process.exit(36);
                }
                //NOT GENESIS NODE - timeout and update pktDrops for all mint 
                for (var m in this.mintTable) { // NOT-GENESIS NODE - time out expired entries 
                    const mintEntry=this.mintTable[m];
                    if (mintEntry.lastPulseTimestamp==0) {
                        console.log(`timeout(): NON-GENESIS node ignoring pulseStamp==0  ${mintEntry.geo} ${mintEntry.mint}`);
                    } else {
                        var elapsedMSincePulse = now() - this.mintTable[m].lastPulseTimestamp;
    
                        if (elapsedMSincePulse > 1.5 * this.cycleTime * 1000) {  //after n cycles no mintTable updates - remove
                            console.log(`TIMEOUT : elapsedMSincePulse=${elapsedMSincePulse} mintTable=${this.mintTable[m]}`);
                            // timeout the node
                            logger.debug(`m=${m} elapsedMSincePulse=${elapsedMSincePulse} clearing OWL in mint entry which missed at least one cycle ${this.mintTable[m].geo}`);
                            console.log(`m=${m} elapsedMSincePulse=${elapsedMSincePulse} clearing OWL in mint entry which missed at least one cycle ${this.mintTable[m].geo}`);
    
                            //find the p
                            const pulseEntry=this.pulses[mintEntry.geo+":"+this.groupName];
                            if (pulseEntry) {
                                pulseEntry.owl = NO_MEASURE;
                                pulseEntry.owls = "1";
                                pulseEntry.pktDrops++;
                            }
                            this.mintTable[m].lastOWL = NO_MEASURE;  // we don't have a valid OWL
                            if (this.mintTable[m].state != "QUARANTINE") {
                                this.mintTable[m].state = "NR";  // we don't know this node's state
                                console.log(`timeout(): Setting ${this.mintTable[m].geo} to Not Reachable`);
                            }
                            
                            if (elapsedMSincePulse > 5 * this.cycleTime * 1000) {  //after 5 cycles
                                // timeout node after 5 seconds
                                console.log(`timeout(): TIMING OUT AND DELETING geo=${this.mintTable[m].geo} mint=${this.mintTable[m].mint} NODE with ${elapsedMSincePulse} ms old timestamp `);
                                this.deleteNode(this.mintTable[m].ipaddr, this.mintTable[m].port);
                            }
                        }
                    }
                }
      
            } else {
                console.log(`I am NOT GENESIS Node and genesis node pulseTimestamp==0 geo=${this.mintTable[1].geo}`);
            }

        }


        //
        // if timeout changed the population, flashWireguard files
        //
        if (startingPulseEntryCount != Object.keys(this.pulses).length) {
            logger.info(`timeout(): nodeC0unt Changed from ${startingPulseEntryCount} setting newPulseGroup.nodeCount=${this.pulses.length}`);
            console.log(`timeout(): nodeC0unt Changed from ${startingPulseEntryCount} setting newPulseGroup.nodeCount=${this.pulses.length}`);
            this.flashWireguard();  //node list changed recreate wireguard file
        }
        this.nodeCount = Object.keys(this.pulses).length;
        this.buildMatrix();    //goes way - eventually remove this - it is easy enough to search existing pulse OWLs with getOWLs.from()
        
        
        if (this.isGenesisNode()) {     //save pulseGroup in JSON format in filesystem
            const fs = require('fs');
            let copy = JSON.parse(JSON.stringify(this));  //make a copy -//remove stuff - this file will be fetched and procesed by many
                //TODO: loop through pulses remove history and medianHistory - really should move this to a separate object
            for( var p in copy.pulses) {
//                console.log(`trimming history from record pulse=${copy.pulses[p]}`);
                delete copy.pulses[p].history;
                delete copy.pulses[p].medianHistory;
            }
            delete copy.sender;
            delete copy.receiver;
            delete copy.config;                         

            let strCopy=JSON.stringify(copy);           //and put it backj into lightweight JSON stringify format
            let filename=this.config.IP+"."+this.config.PORT+'.json';
            fs.writeFile(filename, strCopy, (err) => {
                if (err) throw err;
                //console.log(`pulse group object stored in file ${filename} asynchronously`);
            });
        }

        /*
            var genesislist=process.env.GENESISNODELIST||"";
            var genesisNodes=genesislist.split(",");
            
            console.log(`genesisNodes=${genesisNodes}`);
            for (var node in genesisNodes ) {
                //console.log(`Here we would UDP pulse our matrix to every other genesis node: ${genesisNodes[node]}`);

                //send UDP datagram of pulseGroupsObject
                //wbnwbnwbn - here use raw send
                var dgram = require('dgram');

                var client = dgram.createSocket('udp4');
                var matrixPulseMsg=JSON.stringify(this.mintTable);
                //client.send(matrixPulseMsg, 0, matrixPulseMsg.length, 65013, genesisNodes[node]); //send matrix pulse to all other genesis nodes
                console.log(ts()+`sent matrix pulse to ${genesisNodes[node]} msg=${matrixPulseMsg}`);
            }
            
            //if (isGenesisNode) {
            //    pullState from a Genesis Node[i]
            //    
            //}
        }  /**/
    };



    //
    //  @wbnwbnwbnwbn
    //
    getOWLfrom = (srcMint:number,owls:string) : number => {
            var ary = owls.split(",");
            for (var i = 0; i < ary.length; i++) {
                var mint = parseInt(ary[i].split("=")[0]);
                if (mint == srcMint) {
                    var owl = ary[i].split("=")[1];
                    if (typeof owl != "undefined" && owl != null) {
                        // console.log("returning srcMint="+srcMint+" owl="+owl);
                        return parseInt(owl);
                    } else {
                        return NO_MEASURE; // no OWL measurement
                    }
                }
            }
            return NO_MEASURE; // did not find the srcMint
    };
    //
    //  
    //      Secret sauce - the measures are relative so skews are systematic and offset each other
    //                  we only need to know if it is faster through intermediary
    //  TODO: Strategy 2 - use matrix to quickly find OWLs, don't look up through owl table for all the cells
    //
    findEfficiencies = () => {      //run every second - compute intensive
        if (!FIND_EFFICIENCIES) return;
        const s=new Date(); const startTimestampFE=s.getTime();

        for (var srcP in this.pulses) {
            var srcEntry = this.pulses[srcP];
            for (var destP in this.pulses) {
                var destEntry = this.pulses[destP];     //this code is passed n-squared times!!!
                if (typeof this.matrix[srcEntry.mint] != "undefined") {
                    //console.log(`findEfficiencies(): matrix=${dump(this.matrix[srcEntry.mint])} ${dump(this.matrix[destEntry.mint])} ${dump(destEntry)} ${dump(srcEntry)}`);
                    var direct = this.matrix[srcEntry.mint][destEntry.mint];  // 
                    //var direct = this.getOWLfrom(srcEntry.mint, destEntry.owls);  // ^^^^^get direct latency measure
                    //console.log(ts()+"findEfficiencies(): Here we would compare srcEntry.mint="+srcEntry.mint+"-destEntry.mint="+destEntry.mint+" direct="+direct);
                    if (destEntry!=srcEntry && typeof direct != "undefined" ) {  //avoid self-self, direct owl has a value
                        for (var iP in this.pulses) {
                            var intermediaryEntry = this.pulses[iP];  //this code is passed n-cubed times
                            //console.log(`intermediaryEntry.mint=${intermediaryEntry.mint}`);
                            if (intermediaryEntry != srcEntry && intermediaryEntry != destEntry) {
                                var srcToIntermediary = this.matrix[srcEntry.mint][intermediaryEntry.mint];  //^^^^^ these lookups done n-cubed times
                                
                                //console.log(`srcToIntermediary=${srcToIntermediary}`);
                                if (typeof srcToIntermediary != "undefined" ) {
                                //var srcToIntermediary = this.getOWLfrom(srcEntry.mint, intermediaryEntry.owls);  //^^^^^ these lookups done n-cubed times
                                    var intermediaryToDest = this.matrix[intermediaryEntry.mint][destEntry.mint]; //^^^^^
                                    //console.log(`intermediaryToDest=${intermediaryToDest}`);
                                    //var intermediaryToDest = this.getOWLfrom(intermediaryEntry.mint, destEntry.owls); //^^^^^
                                    if (typeof srcToIntermediary != "undefined" && typeof intermediaryToDest != "undefined") {
                                        //  We have a path to compare against the direct path
                                        var intermediaryPathLatency = srcToIntermediary + intermediaryToDest;   //^^^^^^ possible better path through intermeidary
                                        var delta=intermediaryPathLatency - direct;
                                        //console.log("*  PATH       "+srcEntry.geo+"-"+destEntry.geo+"="+direct+" through "+intermediaryEntry.geo+" intermediaryPathLatency="+intermediaryPathLatency+" delta="+delta);
                                        if (srcToIntermediary != NO_MEASURE && intermediaryToDest != NO_MEASURE && delta < -10) {
                                            var dd=new Date();
                                            //console.log("*  extraordinary PATH       "+srcEntry.geo+"-"+destEntry.geo+"="+direct+" through "+intermediaryEntry.geo+" intermediaryPathLatency="+intermediaryPathLatency+" delta="+delta);
                                            // This overwrites existing entry, replacing timestamp
                                            const pulseIndex:string=srcEntry.geo+"-"+destEntry.geo;
                                            if (typeof this.extraordinaryPaths[pulseIndex] == "undefined") {
                                                //console.log("New extraordinary path: "+srcEntry.geo+"-"+destEntry.geo);
                                                this.extraordinaryPaths[pulseIndex] = { startTimestamp:dd.getTime(), lastUpdated:dd.getTime(), aSide:srcEntry.geo, zSide:destEntry.geo, direct:direct, relayMint:intermediaryEntry.mint, intermediary:intermediaryEntry.geo, intermediaryPathLatency:intermediaryPathLatency, srcToIntermediary:srcToIntermediary, intermediaryToDest:intermediaryToDest, delta:delta };
                                            } else {
                                                //var startTimestamp=this.extraordinaryPaths[srcEntry.geo+"-"+destEntry.geo].startTimestamp;
                                                //console.log("Existing startTimestamp="+startTimestamp);
                                                this.extraordinaryPaths[pulseIndex] = { startTimestamp:this.extraordinaryPaths[pulseIndex].startTimestamp, lastUpdated:dd.getTime(), aSide:srcEntry.geo, zSide:destEntry.geo, direct:direct, relayMint:intermediaryEntry.mint, intermediary:intermediaryEntry.geo, intermediaryPathLatency:intermediaryPathLatency, srcToIntermediary:srcToIntermediary, intermediaryToDest:intermediaryToDest, delta:delta };
                                            }
                                            //console.log(` findEfficiencies(): extraordinary route: ${dump(this.extraordinaryPaths[pulseIndex])}`);
                                        }
                                        
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        //
        //  remove extraordinarty path entries with old lastUpdated fields @wbnwbnwbnwbn
        //
        const d=new Date();const timeNow=d.getTime();
        for (var e in this.extraordinaryPaths) {
            var extraordinaryPath=this.extraordinaryPaths[e];
            // console.log("extraordinaryPath: "+JSON.stringify(extraordinaryPath,null,2));
            var freshness=timeNow-extraordinaryPath.lastUpdated;
            // console.log("freshness="+freshness);
            if (freshness>2000) {
                //console.log(`timeout(): deleting old extraordoinary path ${this.extraordinaryPaths[e].aSide}-${this.extraordinaryPaths[e].zSide} lasted ${duration} ms`);
                delete this.extraordinaryPaths[e]; // delete extraordinary not extraordinary any more
            } else {

                var duration=timeNow-extraordinaryPath.startTimestamp;
                if (duration>10000) {  //if a path lasts more than 10 seconds we assume worse path starts sending 100pkts/sec
                    //  Simulate relaying 10 packets per second traffic
                    //  credit relay, debit users
                    // HACK: to demoinstrate math, assume that a better path DRAWS 100 pkts per second while available
                    //BETTER ALGO needed here
    //              console.log(`HERE WE simulate RElAYING packets on behalf of others, so assume 10*1500bytes=10messages and 15KB through mint #${extraordinaryPath.relayMint} ${extraordinaryPath.aSide}-${extraordinaryPath.intermediary}`);
                    if ((typeof this.pulses[extraordinaryPath.intermediary+':'+this.groupName] != "undefined" ) && 
                        (typeof this.pulses[extraordinaryPath.aSide+':'+this.groupName] != "undefined")) {
                        this.pulses[extraordinaryPath.intermediary+':'+this.groupName].inPulses +=100;   //relay meas forwrd 10 pktys/sec
                        this.pulses[extraordinaryPath.intermediary+':'+this.groupName].outPulses+=100;   //we assume those with better path, use it for 10 pkts
                        this.pulses[extraordinaryPath.aSide+':'+this.groupName].inPulses -=100;   //relay meas forwrd 10 pktys/sec
                        this.pulses[extraordinaryPath.aSide+':'+this.groupName].outPulses-=100;   //we assume those with better path, use it for 10 pkts
                        // bump the in/outMsgs by 10 pkts
                    } else {
                        console.log(`findEfficiencies(): this.pulses[extraordinaryPath.intermediary+':'+this.groupName]=${this.pulses[extraordinaryPath.intermediary+':'+this.groupName]} this.pulses[extraordinaryPath.aSide+':'+this.groupName]=${this.pulses[extraordinaryPath.aSide+':'+this.groupName]}`);
                    }
                }
            }
        }
        //if (Object.keys(this.extraordinaryPaths).length>0) console.log(`findEfficiencies():${dump(this.extraordinaryPaths)}`);  //INSTRUMANTATION
        this.mintTable[0].lastPulseTimestamp = timeNow;
        var sleepTime=PULSEFREQ*1000-timeNow%1000+600; //let's run find efficiencies happens in last 400ms
        //console.log(`Processing findEfficiencies() took ${timeNow-startTimestampFE}ms . Launching findEfficiencies() in ${sleepTime}ms`);
        setTimeout(this.findEfficiencies,sleepTime);  //run again in a second
    }

    checkSWversion = () => {
        if (this.groupOwner == this.config.GEO) {
            return logger.info(`Point your browser to Genesis Node for instrumentation: http://${this.mintTable[0].ipaddr}:${this.mintTable[0].port}`);
        }

        const url = encodeURI("http://" + this.mintTable[1].ipaddr + ":" + this.mintTable[1].port + "/version?ts=" + now() +
                              "&x=" + (now() % 2000)); //add garbage to avoid caches

        http.get(url, (res) => {
            res.setEncoding("utf8");
            let body = "";

            res.on("data", (data) => {
                body += data;
            });

            res.on("error", (error) => {
                logger.info("checkSWversion():: checkSWversion CAN'T REACH GENESIS NODE");
                // Error handling here never triggered TODO
            });

            res.on("end", () => {
                var genesisVersion = JSON.parse(body);
                var mySWversion = MYVERSION();  // find the Build.*
                logger.info(`checkSWversion(): genesis SWversion==${dump(genesisVersion)} MY SW Version=${mySWversion} me.version=${this.config.VERSION}`);
                if (genesisVersion != mySWversion) {
                    // Software reload
                    logger.error(`checkSWversion(): NEW SOFTWARE AVAILABLE - GroupOwner said ${genesisVersion} we are running ${mySWversion}. Process exitting`);
                    process.exit(36);
                }
            });
        });
        setTimeout(this.checkSWversion, CHECK_SW_VERSION_CYCLE_TIME * 1000); // Every 60 seconds check we have the best software
    };
    
    processIncomingPulse = (incomingPulse: IncomingPulse) => {
       // look up the pulse claimed mint
       var incomingPulseEntry = this.pulses[incomingPulse.geo + ":" + incomingPulse.group];
       var incomingPulseMintEntry = this.mintTable[incomingPulse.mint];

       if (incomingPulseEntry == null || incomingPulseMintEntry == null) {
           // show more specifics why pulse is ignored
           logger.info(`IGNORING ${incomingPulse.geo}:${incomingPulse.group} - we do not have this pulse ${incomingPulse.geo + ":" + incomingPulse.group} as a mint #${incomingPulse.mint} entry `);
           console.log(`IGNORING ${incomingPulse.geo}:${incomingPulse.group} - we do not have this pulse ${incomingPulse.geo + ":" + incomingPulse.group} as a mint #${incomingPulse.mint} entry pulseEntry=${incomingPulseEntry} mintEntry=${incomingPulseMintEntry}`);
           return;
       }

       // pulseGroup owner controls population - GROUP OWNER PULSE HANDLER
       if (this.groupOwner === incomingPulseEntry.geo) {  //Is this a groupOwner PULSE?
           //console.log(`**************************************************       Group Owner Pulse logic ....`);
           // group owner pulse here (SECURITY HOLE-more authentiction needed ip:port)

            if (this.groupOwner != this.mintTable[0].geo) { // use genesis nodes' incoming owls to manage population
                const owlsAry = incomingPulse.owls.split(",");
                // addNode/resynch with groupOwner if we don't have this mint, optimize would be fetch only mint we are missing
                for (var o in owlsAry) {
                    const owlEntry = owlsAry[o];
                    var mint = parseInt(owlEntry.split("=")[0]);
                    var srcMintEntry = this.mintTable[mint];
                    //console.log(`owlEntry=${owlEntry} mint=${mint} srcMintEntry=${srcMintEntry}`);    //#1
                    //console.log(`owlEntry=${owlEntry} mint=${mint} mintTable[mint]==${dump(self.mintTable[mint])}`);    //#2
                    if (srcMintEntry == null) {
                        console.log(`We do not have this mint and group Owner announced it: ${mint}`);
                        //we do not have this mint in our mintTale
                        logger.info(`Owner announced a  MINT ${mint} we do not have - HACK: re-syncing with genesis node for new mintTable and pulses for its config`);
                        console.log(`Owner announced a  MINT ${mint} we do not have - HACK: re-syncing with genesis node for new mintTable and pulses for its config`);
                        this.syncGenesisPulseGroup();  // HACK: any membership change we need resync
                        return;
                    }
                }

                // find each pulse in the group owner announcement or delete/resync
                for (var pulse in this.pulses) {
                    var myPulseEntry = this.pulses[pulse];
                    var found = false;
                    //var owlsAry = incomingPulse.owls.split(","); // TODO: test probably dont need this
                    for (var o in owlsAry) {
                        var owlmint = parseInt(owlsAry[o].split("=")[0]);
                        if (owlmint == myPulseEntry.mint) {
                            found = true;
                        }
                    }
                    // deleteNode if its mint is not in announcement
                    if (!found) {
                        logger.info(`Owner no longer announces  MINT ENTRY ${myPulseEntry.mint} - DELETING mintTable entry, pulseTable entry, and groupOwner owl`);
                        console.log(`Owner no longer announces  MINT ENTRY ${myPulseEntry.mint} in owls (${myPulseEntry.owls}) - DELETING mintTable entry, pulseTable entry, and groupOwner owl`);
                        this.deleteNode(this.mintTable[myPulseEntry.mint].ipaddr, this.mintTable[myPulseEntry.mint].port);
                        return;
                    }
                }
            }
            this.mintTable[1].state = "UP";   //Genesis Node is UP
            this.mintTable[1].lastPulseTimestamp=incomingPulse.pulseTimestamp;  //we received a pulse from the genesis node - update mintTable
           //if (incomingPulseEntry.owls.match(/[0-9]*=[0-9]*/)myMint)) {  //if Genesis node is sending me my OWL, we are UP
           this.mintTable[0].state = "UP";   // mark self as UP since we got a pulse from genesis node  - this should be when he sees his owl measurement in the announcement
           this.mintTable[this.mintTable[0].mint].state = "UP";   // mark self as UP since we got a pulse from genesis node
           //}
           //console.log(`processIncomingPulse(): Marking node UP`);
               //console.log(`GroupOwner Pulse processed - marked group Owner UP`);
        } else {         //Message NOT from groupOwner.
           //console.log(`====================================================    NON-Group Owner Pulse logic ....`);
           if (this.mintTable[0].mint==1) {    //Am I group owner?
                if (this.mintTable[incomingPulseEntry.mint]!=null) {    //I am group owner, do I know this guy? 
                    if (this.mintTable[incomingPulseEntry.mint].state=="QUARANTINE") {   //Can we help it out of Quarwtine?
                        //console.log(`Received a pulse from a node we labeled as QUARANTINED ... flash wireguard - we have a new node for everyone`);                                  
                        //console.log(`FLASHING WG group ower receiving pulse from non-genesis node ${dump(incomingPulse)}`);                    
                         this.flashWireguard();
                        this.mintTable[incomingPulseEntry.mint].state="UP" //Genesis is READY TO ACCEPT nodes
                    }
                } else {
                    //Node is not in QUARANTINE
                }
            } else {
                //console.log(`I am not group owner`);
            }
           // Pulse from ANYONE - we must be out of Quarantine
           if (this.mintTable[0].state == "QUARANTINE") {
               logger.info(`Received non-genesis pulse - I am accepted in this pulse group - I must have transitioned out of Quarantine`);
               //console.log(`Received non-genesis pulse - I am accepted in this pulse group - I must have transitioned out of Quarantine`);
               this.mintTable[0].state = "UP";
               this.mintTable[this.mintTable[0].mint].state = "UP";   // mark self as UP since we got a pulse from genesis node

               //
               //   Start everything
               //
            //    setInterval(self.measurertt,WG_PULSEFREQ*1000);  
            //    self.secureTrafficHandler((data: any) => {
            //        console.log(`secureChannel traffic handler callback: ${data}`);
            //    });
           }

       }

        // with mintTable and pulses updated, handle valid pulse: we expect mintEntry to --> mint entry for this pulse
        if (incomingPulseEntry !== undefined) {
            this.ts = now(); // we got a pulse - update the pulseGroup timestamp

            // copy incoming pulse into my pulse record
            incomingPulseEntry.inPulses++;
            incomingPulseEntry.lastMsg = incomingPulse.lastMsg;
            incomingPulseEntry.pulseTimestamp = incomingPulse.pulseTimestamp;
            incomingPulseEntry.owl = incomingPulse.owl;
            incomingPulseEntry.seq = incomingPulse.seq;
            incomingPulseEntry.owls = incomingPulse.owls;
            incomingPulseEntry.history.push(incomingPulseEntry.owl);

            // store 60 samples
            if (incomingPulseEntry.history.length > 60 ) {
                incomingPulseEntry.history.shift(); // drop off the last sample
            }

            var d = new Date(incomingPulseEntry.pulseTimestamp);
            if (d.getSeconds() == 0 && incomingPulseEntry.history.length >= 60 ) {   //no median until we have 60 samples
                incomingPulseEntry.medianHistory.push(
                    Math.round(median(incomingPulseEntry.history))
                );
                                // store 60 samples
                if (incomingPulseEntry.medianHistory.length > 60*4) {   //save only 4 hours worth of data for now
                    incomingPulseEntry.medianHistory.shift(); // drop off the last samples
                }
            }

            // TODO: Also resync if the groupOwner has removed an item
           this.storeOWL(incomingPulse.geo, this.mintTable[0].geo, incomingPulse.mint);  // store pulse latency To me

       } else {
           logger.warning(`Received pulse but could not find a matching pulseRecord for it. Ignoring until group owner sends us a new mintTable entry for: ${incomingPulse.geo}`);

           //newPulseGroup.fetchMintTable();  //this should be done only when group owner sends a pulse with mint we havn't seen
           //maybe also add empty pulse records for each that don't have a pulse record
       }
    }
    //called every 10ms to see if there are pkts to process
    workerThread = () => {
        setTimeout(this.workerThread, 100);  // queue up incoming packets and come back again to batch process every 100 milliseconds
        
        if (this.incomingPulseQueue.length==0) {
            return;
        }
        
        for (var pulse=this.incomingPulseQueue.pop(); pulse != null; pulse=this.incomingPulseQueue.pop()) {
            this.processIncomingPulse(pulse);
        }
    }
    //
    //  recvPulses
    //
    recvPulses = (incomingMessage: string) => {
        // try {
            // const incomingPulse = await parsePulseMessage(incomingMessage)
        var ary = incomingMessage.split(",");
        const pulseTimestamp = parseInt(ary[0]);
        const senderTimestamp = parseInt(ary[1]);
        const OWL = pulseTimestamp - senderTimestamp;
        var owlsStart = nth_occurrence(incomingMessage, ",", 9); //owls start after the 7th comma
        var pulseOwls = incomingMessage.substring(owlsStart + 1, incomingMessage.length);
        const incomingPulse: IncomingPulse = {
            pulseTimestamp: pulseTimestamp,
            outgoingTimestamp: senderTimestamp,
            msgType: ary[2],
            version: ary[3],
            geo: ary[4],
            group: ary[5],
            seq: parseInt(ary[6]),
            bootTimestamp: parseInt(ary[7]), //if genesis node reboots --> all node reload SW too
            mint: parseInt(ary[8]),
            owls: pulseOwls,
            owl: OWL,
            lastMsg: incomingMessage,
        };
        this.incomingPulseQueue.push(incomingPulse);  //tmp patch to test
    };

    // Store one-way latencies to file or graphing & history
    storeOWL = (src: string, dst: string, srcMint: number) => {
        const pulseLabel = src + ":" + this.groupName;
        const pulseEntry = this.pulses[pulseLabel];
        if (pulseEntry != null) {
            var strDataPoints = ""; // format: { label: "22:37:49", y: 10 }, we have no timestamps yet in this model
            for (var dp in pulseEntry.medianHistory) {
                strDataPoints += `{ label: "median", y: ${pulseEntry.medianHistory[dp]} },`;
            }
            for (var dp in pulseEntry.history) {
                strDataPoints += `{ label: "current", y: ${pulseEntry.history[dp]} },`;
            }
            grapherStoreOwls(src, dst, strDataPoints); // store OWL in a way the grapher can parse it
        }
    };

    // Sync this pulseGroup object with genesis node pulseGroup object: copy mint table and update (add/del) pulse entries so we match the genesis node
    syncGenesisPulseGroup = () => {

        if (this.isGenesisNode()) {
            console.log("syncGenesisPulseGroup(): GENESIS node does not sync with itself but will set Wireguard files");

            logger.warning("syncGenesisPulseGroup(): GENESIS node does not sync with itself but will set Wireguard files");
            this.flashWireguard(); // change my wg config
            return; // genesis node dies not fetch its own configuration
        }
        console.log("syncGenesisPulseGroup(): Non-GENESIS NODE SYNCHING!!!!");
        console.log("syncGenesisPulseGroup(): Non-GENESIS NODE SYNCHING!!!!");
        console.log("syncGenesisPulseGroup(): Non-GENESIS NODE SYNCHING!!!!");


        var url = encodeURI('http://' + this.mintTable[1].ipaddr + ":" + this.mintTable[1].port + "/pulsegroup/" + this.groupName + "/" + this.mintTable[0].mint);
        
        
        
        
        var url = encodeURI('http://' + this.mintTable[1].ipaddr + ":" + this.mintTable[1].port + "/pulsegroups/");  //@wbnwbnwbn
        console.log(`pulseGroups=${url}`);





        logger.info(`syncGenesisPulseGroup(): url=${url}`);
        const self = this;

        // Fetch mintTable and pulses from genesis node
        http.get(url, function (res) {
            res.setEncoding("utf8");
            var body = "";
            res.on("data", function (data) {
                body += data;
            });
            res.on("end", function () {
                var groupOwnerPulseGroup = JSON.parse(body);
                console.log(`syncGenesisPulseGroup(): fetched new groupOwnerPulseGroup from genesis node: ${dump(groupOwnerPulseGroup)}`);
                var mintTable = groupOwnerPulseGroup.mintTable;

                if (groupOwnerPulseGroup.groupOwner != self.config.GEO) {
                    mintTable[0] = self.mintTable[0]; // wbnwbnwbn INSTALL MY mintTable[0]
                }
                self.mintTable = mintTable; // with us as #0, we have the new PulseGroup mintTable

                //console.log(`after copy from genesisNode, self.mintTable=${dump(self.mintTable)}`);
                // TODO - don't copy timeStamps - they are relative to genesis clock

                var pulses = groupOwnerPulseGroup.pulses;
                for (var pulse in pulses) {
                    // Add all pulses that we don't have
                    if (typeof self.pulses[pulse] == "undefined") {
                        logger.info(`syncGenesisPulseGroup(): Adding new pulse entry as my own: ${pulse}`);
                        self.pulses[pulse] = pulses[pulse];  // save our new pulse entry
                    }
                }
                for (var pulse in self.pulses) {
                    // Delete all node we have that the group owner does not
                    if (typeof pulses[pulse] == "undefined") {
                        logger.info(`syncGenesisPulseGroup(): Removing pulse entry that genesis node does not have: ${pulse}`);
                        delete self.pulses[pulse];  //delete this pulse we have but groupOwner does not have
                    }
                }
                self.nodeCount = Object.keys(self.pulses).length;
                logger.warning("Flashing Wireguard configs");

                self.flashWireguard(); //send mintTable to wireguard to set config

            });
        });
    };

    measurertt = () => {
        if (!MEASURE_RTT) return;  // can not spin up 1 ping process per node per second
        console.log(`measurertt()`);
        for (var p in this.pulses) {
            const pulseEntry = this.pulses[p]; //do we need to check if this pulse still exists?

            //TODO: This code should not launch upto 150 ping processes per second - needs to be a simple ping daemon in "C"
            const ip = mint2IP(pulseEntry.mint);
            const pingCmd = `(ping -c 1 -W 1 ${ip} 2>&1)`;
            exec(pingCmd, (error: ExecException | null, stdout: string, stderr: string) => {
                    //64 bytes from 10.10.0.1: seq=0 ttl=64 time=0.064 ms
                    var i = stdout.indexOf("100%");
                    if (i >= 0) {
                        pulseEntry.rtt = NO_MEASURE; // UNREACHABLE
                        //console.log(`${pulseEntry.geo} did not respond to ping over encrypted tunnel ${ip}`);
                        return;
                    }

                    var ary = stdout.split(" ");
                    var address = ary[8];
                    var octets = address.split(".");
                    var mint = parseInt(octets[2]) * 254 + parseInt(octets[3]); //TODO: we should verify mint here
                    if (ary[6] == "bytes") {
                        //if we have a measure
                        var timeEquals = ary[11];
                        if (typeof timeEquals != "undefined") {
                            var rtt = parseInt(timeEquals.split("=")[1]);
                            //TODO: here we store or clear the rttMatrix element
                            //console.log(`**** address: ${address} to see who replied... measurertt(): ${pulseEntry.geo} rtt = `+rtt);
                            //TODO: store in rttHistory, rttMedian
                            //console.log(`*******  mint=${mint} saving measure to record of pulseEntry.geo=${pulseEntry.geo}`);
                            pulseEntry.rtt = rtt;
                        } else {
                            //console.log(`******measurertt(): ${pulseEntry.geo} rtt = -99999`);
                            //clear in rttHistory, rttMedian
                            pulseEntry.rtt = NO_MEASURE;
                            //console.log(`*******clearing measure to record of pulseEntry.geo=${pulseEntry.geo}`);
                        }
                    }
                }
            );
        }
    };

    //
    //  this is where the messgaes over secure qireguard mesh is handled - not working yet
    //
    secureTrafficHandler = (callback: CallableFunction) => {
        var app = express();
        var self = this;
//        var server = app.listen(SECURE_PORT, mint2IP(this.mintTable[0].mint), function () {
        var server = app.listen(SECURE_PORT, '0.0.0.0', function () {
                //TODO: add error handling here
            const serverAdddress = server.address();
            if (typeof serverAdddress !== "string" && serverAdddress !== null ) {
                var host = serverAdddress.address;
                //var port = serverAdddress.port;
                console.log(`DARP ENCRYPTED MESH Traffic handler listening at http://${host}:${SECURE_PORT}`);

            } else {
                logger.error("Express app initialization failed");
                console.log(`FAILED DARP ENCRYPTED MESH Traffic handler listening`);
            }
        }).on('data', function(err,data) {
            console.log(`secureTrafficHandler(): got secure data ${err} ${data} on port ${SECURE_PORT}`);
        }).on('error', function(err) {    
            console.log("Trying agin in 10 sec", err);
            setTimeout(self.secureTrafficHandler, 10*1000);
        });
    };
}

/**
 * Initiates construction of the pulsegroup object by sneding the request to the genesis node
 * @param {Config} config contains constants and environmental variables, such as ip and port
 */
export const getPulseGroup = async (config: Config): Promise<PulseGroup> => {
    const configurl = "http://" + config.GENESIS + ":" + config.GENESISPORT +
        "/nodefactory?geo=" + config.GEO +
        "&port=" + config.PORT +
        "&publickey=" + config.PUBLICKEY +
        "&genesisport=" + config.GENESISPORT +
        "&version=" + config.VERSION +
        "&wallet=" + config.WALLET +
        "&myip=" + config.IP +
        "&ts=" + now();
    var pulseGroupObjectURL = encodeURI(configurl);

    logger.info(
        `getPulseGroup(): getting pulseGroup from url=${pulseGroupObjectURL}`
    );

    return new Promise((resolve, reject) => {
        const req = http.get(pulseGroupObjectURL, (res) => {
            if (res.statusCode != 200) {
                return reject(
                    new Error(`getPulseGroup(): received status code ${res.statusCode}`)
                );
            }

            var data = "";
            res.on("data", (stream) => {
                data += stream;
            });

            res.on("error", () => {
                return reject(
                    new Error(`getPulseGroup(): received error from ${pulseGroupObjectURL}`)
                );
            });

            res.on("end", () => {
                var newPulseGroup: PulseGroup = JSON.parse(data);
                logger.info(`getPulseGroup(): from node factory: ${dump(newPulseGroup)}`);

                if (newPulseGroup.mintTable[1].publickey == config.PUBLICKEY) {
                    logger.info(`getPulseGroup(): My publickey matches genesis node public key - I am genesis node : GENESIS node already configured.`);
                } else {
                    logger.info(`getPulseGroup(): Configuring non-genesis node ...`);
                }
                return resolve(newPulseGroup);
            });
        });
        req.end();
    });
};
