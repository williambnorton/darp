/** @module pulsegroup Create Configuration for joining our pulseGroup object */
/*  ALPHA  CODE  */
import fs = require("fs");
import os = require("os");
import http = require("http");
import express = require("express");
import { dump, now, MYVERSION, median, mint2IP, nth_occurrence, ts, Log  } from "./lib";
import { logger, LogLevel } from "./logger";
import { NodeAddress, IncomingPulse } from "./types";
import { grapherStoreOwls } from "./grapher";
import { setWireguard, addPeerWGStanza, addMyWGStanza } from "./wireguard";
import { addPulseGroup } from "./pulsegroups";
import { collapseTextChangeRangesAcrossMultipleVersions } from "typescript";

var dgram = require("dgram");

logger.setLevel(LogLevel.ERROR);  //wbn-turn off extraneous for debugging
// Define constants

const PULSEFREQ=1;  // (in seconds) how often to send pulses

const MEASURE_RTT=true;   //ping across wireguard interface
//const FIND_EFFICIENCIES=true; //search for better paths through intermediaries

const SECURE_PORT=65020;    

const CHECK_SW_VERSION_CYCLE_TIME = 60; // CHECK for new SW updates every 60 seconds
const NO_MEASURE = 99999;       //value to indis=cate no measurement exists
const DEFAULT_START_STATE = "QUARANTINE"; // "SINGLESTEP"; console.log(ts()+"EXPRESS: ALL NODES START IN SINGLESTEP (no pulsing) Mode");
logger.info("pulsegroup: ALL NODES START IN " + DEFAULT_START_STATE + " Mode");
const GENESIS_NODE_TIMEOUT=15;    // go away when our GENESIS node is unreachable, our optimization group no longer helps its creator.
const STAT_HOURS_TO_STORE=1;    //hpow many hours of data to collect and store
// const DEVIATION_THRESHOLD=20;  // Threshold to flag a matrix cell as "interesting", exceeding this percentage from median

// Define data structures used in the protocol

/** App configuration settings obtained from ENV variables */

//
//  Config - this should be eventually for all pulseGroups
//
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
    GENESISNODELIST: string;
    BOOTTIMESTAMP: number;
    MAXNODES: number;
    constructor() {
        if (!process.env.DARPDIR) {
            logger.warning("No DARPDIR environmental variable specified ");
            process.env.DARPDIR = process.env.HOME + "/darp";
            logger.warning(`DARPDIR defaulted to " + ${process.env.DARPDIR}`);
        }
        this.DARPDIR = process.env.DARPDIR;

        this.BOOTTIMESTAMP = now();

        var PORT = 65013;
        if (process.env.MY_PORT) {
            PORT = parseInt(process.env.MY_PORT);
        }
        logger.info(`Starting with PORT=${PORT}`);
        this.PORT = PORT;

        var GENESISPORT = PORT;  //DEFAULT TO 65013
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
        //console.log(`&&&&&&&&&&&&&   @WBN       pulsegroup.ts in constructor VERSION=${this.VERSION} MYVERSION()=${MYVERSION()}`);

        if (!process.env.MY_IP) {
            console.log("No MY_IP environmental variable specified - ERROR - but I will try and find an IP myself from incoming message");
            process.exit(1)
        }
        this.IP = process.env.MY_IP.replace(/['"]+/g, "");  //trim quotes

        //console.log(`pulseGroup constructor this.IP=${this.IP}`);

        var GEO = HOSTNAME; //passed into docker
        GEO = GEO.toUpperCase().split(".")[0].split(":")[0].split(",")[0].split("+")[0];  //remove problem characters
        this.GEO = GEO;

//        if (!process.env.GENESIS) {
//            logger.error(`No GENESIS environmental variable specified - EXITTING`);
//            process.exit(86);
//        }
        this.GENESIS=process.env.GENESIS||"";
        //console.log(`GENESIS=${process.env.GENESIS}`);

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


        this.GENESISNODELIST = process.env.GENESISNODELIST || "SELF";
        this.WALLET = process.env.WALLET || "auto";
        this.MAXNODES = 75;
        console.log(`config constructor made: ${JSON.stringify(this,null,2)}`);
    }
}
export const CONFIG=new Config();   //use this gloablly to fill in my PUBLIC KEY/IP/etc.

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
    constructor(mint: number, geo: string, port: number, incomingIP: string, publickey: string, version: string, wallet: string, bootTimestamp: number) {
        this.mint = mint;
        this.geo = geo;
        this.port = port;
        this.ipaddr = incomingIP; //set by genesis node on connection
        this.publickey = publickey;
        this.state = DEFAULT_START_STATE;
        this.bootTimestamp = bootTimestamp; //RemoteClock when node started  ****
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
    relayCount: number;   //how many pkts relayed on this segment
    pktDrops: number;
    lastMsg: string;
    rtt: number;   //round trip measures across public Internet
    wgrtt: number; //round trip measures across wireguard encrypted tunnel

    constructor(mint: number, geo: string, group: string, ipaddr: string, port: number, version: string, bootTimestamp: number) {
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
        this.wgrtt = NO_MEASURE;

        this.bootTimestamp = bootTimestamp; // RemoteClock on startup  **** - we abandon the pulse when this changes
        this.version = version; // software version running on sender's node
        this.relayCount = 0;
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
    // additional attributes
    adminControl: string;
    config: Config;

    constructor(pulseGroup: PulseGroup) {
        this.groupName = pulseGroup.groupName;
        this.groupOwner = pulseGroup.groupOwner;
        this.mintTable = pulseGroup.mintTable; // Simplification: me should always be mintTable[0], genesis node should always be mintTable[1]
        this.pulses = pulseGroup.pulses; //store statistics for this network segment
        this.rc = pulseGroup.rc;
        this.ts = pulseGroup.ts;
        this.nodeCount = pulseGroup.nodeCount; //how many nodes in this pulsegroup
        this.nextMint = pulseGroup.nextMint; //assign IP. Allocate IP out of 10.10.0.<mint>
        this.cycleTime = pulseGroup.cycleTime; //pulseGroup-wide setting: number of seconds between pulses       
        this.adminControl = "";
        this.config = new Config();  //pulse Object needs to know some things about the node config
    }
    
/*
    //This could be used to avoid duplicating the firstEntry code
    forEachNode = (callback: CallableFunction) => {
        for (var node in this.pulses) callback(node, this.pulses[node]);
    };
*/

/*
    forEachMint = (callback: CallableFunction) => {
        for (var mint in this.mintTable) if (this.mintTable[mint]!=null) callback(mint, this.mintTable[mint]);
    };
*/
    flashWireguard = () => {
        console.log(`flashWireguard()`);
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
    //  this is NEVER CALLED!!! Our current hack is to fetch new mint table when a new node is pulsed
    addNode = (geo: string, group: string, ipaddr: string, port: number, publickey: string, version: string, wallet: string, bootTimestamp: number): MintEntry => {
        this.deleteNode(ipaddr, port); // remove any preexisting entries with this ipaddr:port
        var newMint = this.nextMint++; // get a new mint for new node
        this.pulses[geo + ":" + group] = new PulseEntry(newMint, geo, group, ipaddr, port, this.config.VERSION, bootTimestamp );
        var newNode = new MintEntry(newMint, geo, port, ipaddr, publickey, version, wallet, bootTimestamp);
        this.mintTable[newMint] = newNode;
        // newPulseGroup.nodeCount++;
        logger.warning(
            "addNode(): added mintEntry and empty pulse entry " +
                dump(newNode) +
                dump(this.pulses[geo + ":" + group])
        );
        Log(ts()+"addNode(): added mintEntry and empty pulse entry " + geo + ":" + group + " " + ipaddr );
        this.nodeCount = Object.keys(this.pulses).length;

        return this.mintTable[newMint];
    };

    // Genesis node controls population - it can delete mintTable, pulse and owl for the mint, also delete pulse entries with this node
    deleteNode = (ipaddr: string, port: number) => {
        for (var m in this.mintTable) {
            const mintEntry = this.mintTable[m];
            if (mintEntry && m != "0" && m != "1") {
                // ignore first mints me and genesis node - don't delete those
                if (mintEntry.ipaddr == ipaddr && mintEntry.port == port) {
                    logger.warning( `deleteNode(): deleting mint ${mintEntry.mint}`);
                    Log( ts()+`deleteNode(): deleting pulse ${mintEntry.geo+":"+this.groupName} ${mintEntry.ipaddr}`);
                    delete this.pulses[mintEntry.geo+":"+this.groupName];
                    console.log( `deleteNode(): deleting mint ${mintEntry.mint}`);
                    delete this.mintTable[mintEntry.mint];
                }
            }
        }

        this.nodeCount = Object.keys(this.pulses).length;
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
        //  First make OWL list for the pulse message
        //      to pulse and highlight segments that should be looked aty with a FLAG '@'
        //
        //console.log(`pulse(): working on pulseGroup=${JSON.stringify(this,null,2) }`);
        //console.log(ts()+`pulse(): ${this.groupName}`);
        for (var pulse in this.pulses) {
            var pulseEntry = this.pulses[pulse];
            nodeList.push(new NodeAddress(pulseEntry.ipaddr, pulseEntry.port));
            //nodeList.push(new NodeAddress(mint2IP(pulseEntry.mint), SECURE_PORT)); // wbnwbn send to secure channel also
            pulseEntry.outPulses++;
            owls += pulseEntry.mint + "=" + pulseEntry.owl + ",";

        }
        owls = owls.replace(/,+$/, ""); // remove trailing comma
        var myEntry = this.pulses[this.config.GEO + ":" + this.groupName];
        logger.debug(`pulse(): looking for my entry to pulse: ${this.config.GEO}:${this.groupName}`);
        
        if (myEntry == null) {
            logger.warning(`pulse(): Cannot find pulse Entry for ${this.config.GEO}:${this.groupName}`);
        } else {
            myEntry.seq++;
            const myMint = this.mintTable[0].mint;
            var pulseMessage = 
                "0," + 
                this.config.VERSION + "," + 
                this.config.GEO + "," + 
                this.groupName + "," + 
                myEntry.seq + "," + 
                this.mintTable[0].bootTimestamp + "," + 
                myMint + "," + 
                owls;

                //TEST - Chasing down measurement difference running by hand and in code
                var client = dgram.createSocket('udp4');
                const outgoingTimestamp = now().toString();
                pulseMessage = outgoingTimestamp + "," + pulseMessage;
                const pulseBuffer = Buffer.from(pulseMessage);

                nodeList.forEach(function (node: NodeAddress) {
                    //console.log(ts()+`Sending ${pulseMessage} to ${node.ipaddr}:${node.port}`);
                    client.send(pulseBuffer, 0, pulseBuffer.length, node.port, node.ipaddr, (error:string) => {
                        if (error) {
                            console.log(`Sender error: ${error}`);
                        }
                    });
                });


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
        if (this.adminControl!="STOP")
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
        //console.log(ts()+`timeout() `);
        var mustFlash=false;  //if node add/delete
        const startingPulseEntryCount = Object.keys(this.pulses).length;

        //console.log(ts()+`timeout() ${this.mintTable[1].lastPulseTimestamp}`);

        if (this.mintTable[1].lastPulseTimestamp!=0 && now()-this.mintTable[1].lastPulseTimestamp> (GENESIS_NODE_TIMEOUT*1000) ) {
            console.log(`timeout(): GENESIS NODE MIA for ${GENESIS_NODE_TIMEOUT} seconds -- EXITTING...`);
            Log(`timeout(): GENESIS NODE MIA for 15 seconds -- EXITTING...`);
            
            this.adminControl="STOP"; //@wbnwbn
            //process.exit(36);
        }

        for (var m in this.mintTable) {
//            if ((m != "0") && m != "1" && this.mintTable[m] && this.mintTable[m].lastPulseTimestamp != 0) {
            if ((m != "0") && this.mintTable[m] && this.mintTable[m].lastPulseTimestamp != 0) {
                    // ignore mintTable[0]
                var elapsedMSincePulse = now() - this.mintTable[m].lastPulseTimestamp;

                if (elapsedMSincePulse > 2.5*this.cycleTime * 1000) {  //after __ cycles no mintTable updates - mark as pkt loss
                    logger.debug(`m=${m} elapsedMSincePulse=${elapsedMSincePulse}  ${this.mintTable[m].geo} missed OWL`);
                    console.log(`m=${m} elapsedMSincePulse=${elapsedMSincePulse}  ${this.mintTable[m].geo} missed OWL`);

                    this.mintTable[m].lastOWL = NO_MEASURE;  // we don't have a valid OWL
                    if (this.mintTable[m].state != "QUARANTINE") {
                        Log(`STATE CHANGE: ${this.mintTable[m].geo} ${this.mintTable[m].state} -> Not Reachable`);
                        this.mintTable[m].state = "NR";  // we don't know this node's state
                    }
                    //TODO: Update pktDrop
                    if (this.isGenesisNode()) {
                        // Genesis only code path
                        logger.debug("I am genesis node not seeing mint ${m} him for elapsedMSincePulse=" + elapsedMSincePulse);
                        console.log("I am genesis node not seeing mint ${m} him for elapsedMSincePulse=" + elapsedMSincePulse);
                        if (elapsedMSincePulse > 5 * this.cycleTime * 1000) {  //after 5 cycles
                            // timeout node after 5 seconds
                            logger.debug(`timeout(): DELETE GENESIS NODE geo=${this.mintTable[m].geo} mint=${this.mintTable[m].mint} NODE with ${elapsedMSincePulse} ms old timestamp `);
                            console.log(`timeout(): DELETE GENESIS NODE geo=${this.mintTable[m].geo} mint=${this.mintTable[m].mint} NODE with ${elapsedMSincePulse} ms old timestamp `);
                            Log(`timeout(): DELETE GENESIS NODE geo=${this.mintTable[m].geo} mint=${this.mintTable[m].mint} NODE with ${elapsedMSincePulse} ms old timestamp `);
                            this.deleteNode(this.mintTable[m].ipaddr, this.mintTable[m].port);
                            delete this.pulses[this.mintTable[m].geo+":"+this.groupName];  //delete the pulse Entry also
                            mustFlash=true;  //we changed the population, we must flash WG for ourselves
                        }
                    } else {
                        // not genesis - we can only time out genesis
                        var age = now() - this.mintTable[1].lastPulseTimestamp;
                        if (age > GENESIS_NODE_TIMEOUT * 1000) {              //after 60 seconds we say genesis is gone
                            logger.error(`timeout(): Genesis node disappeared. age of = ${age} ms Exit, our work is done. Exitting. newpulseGorup=${dump(this)}`);
                            console.log(`timeout(): Genesis node disappeared. age of = ${age} ms Exit, our work is done. Exitting. newpulseGorup=${dump(this)}`);
                            Log(`timeout(): Genesis node disappeared. age of = ${age} ms Exit, our work is done. Exitting. newpulseGorup=${dump(this)}`);
                            Log(`timeout(): Genesis node disappeared. age of = ${age} ms Exit, our work is done. Exitting. newpulseGorup=${dump(this)}`);
                            Log(`timeout(): Genesis node disappeared. age of = ${age} ms Exit, our work is done. Exitting. newpulseGorup=${dump(this)}`);
                            Log(`timeout(): Genesis node disappeared. age of = ${age} ms Exit, our work is done. Exitting. newpulseGorup=${dump(this)}`);
                            Log(`timeout(): Genesis node disappeared. age of = ${age} ms Exit, our work is done. Exitting. newpulseGorup=${dump(this)}`);
                            Log(`timeout(): Genesis node disappeared. age of = ${age} ms Exit, our work is done. SHOULD Exitting. newpulseGorup=${dump(this)}`);
                           //this.adminControl="STOP"; //@wbnwbn
                            //process.exit(36);
                        }

                        // we may timeout the group owner and kill the pulsegroup
                        // if (elapsedMSincePulse > 60 * 1000 ) console.log("group owner has been unreachable for 1 minute: "+elapsedMSincePulse);
                    }
                    // TODO: Nodes can be upgraded to "BUSY" if someone else has a measurement to it
                }
            } else { 
                /* Skipping over self (Mint0) and empty mint entries BUT lastPulseTimestamp=0 .... Genesis Node or Me - we timeout Genesis node elsewhere  */ 
                if (m!="0" && this.mintTable[m] && this.mintTable[m].lastPulseTimestamp==0 &&  typeof(this.pulses[this.mintTable[m].geo+":"+this.groupName])=="undefined") {
                    console.log(`HERE We delete abandoned mintEntry - there is no longer a pulse entry for it`);
                    Log(`timeout(): deleting abandoned ${this.mintTable[m].geo} (${this.mintTable[m].ipaddr}:${this.mintTable[m].port}) mintEntry - there is no longer a pulse entry for it`);
                    delete this.mintTable[m];     //Remove abandoned mintTable entry - ToDo: investigate why a mint is abandoned - not deleted when the pulse timedout
                    mustFlash=true;  //we changed the population, we must flash WG for ourselves
                }
            }
        }

        for (var p in this.pulses) {
            var pulseEntry = this.pulses[p];

            if ((pulseEntry) && (pulseEntry.pulseTimestamp != 0) && (pulseEntry.mint != 1)) {
                // don't timeout genesis pulse
                var elapsedMSincePulse = now() - pulseEntry.pulseTimestamp;

                if (elapsedMSincePulse > 2 * this.cycleTime * 1000) {
                    //timeout after 2 seconds
                    pulseEntry.owl = NO_MEASURE;
                    pulseEntry.owls = "1";
                    pulseEntry.pktDrops++;
                    Log(`timeout(): ${pulseEntry.geo}:${pulseEntry.group} PKT DROP  pktDrops=${pulseEntry.pktDrops}`);

                    // only Genesis can delete inactive/unwanted nodes within the group
                    if (this.isGenesisNode()) {
                        if (elapsedMSincePulse > 10 * this.cycleTime * 1000) {
                            logger.warning(`timeout() : Genesis DELETING Node ${this.pulses[p].geo} with ${elapsedMSincePulse} ms old timestamp `);
                            console.log(`timeout() : Genesis DELETING Node ${this.pulses[p].geo} with ${elapsedMSincePulse} ms old timestamp `);
                            Log(`timeout() : Genesis DELETING Node ${this.pulses[p].geo} with ${elapsedMSincePulse} ms old timestamp `);
                            this.deleteNode(pulseEntry.ipaddr, pulseEntry.port);
                            delete this.pulses[pulseEntry.geo+":"+this.groupName];  //delete the pulse Entry also
                            mustFlash=true;  //we changed the population, we must flash WG for ourselves

                            /*
                            if (newPulseGroup.mintTable[pulseEntry.mint]==null) { //delete this.pulses[p];
                                    logger.warning(`DELETEING pulse ${p}`);  //log when timing out to debug
                                    delete this.pulses[p];
                                } else {
                                    logger.warning(`will delete pulse when mint is gone`);
                                }
                            */
                        }


                    }
                }
            }

            if (this.isGenesisNode() && pulseEntry.pulseTimestamp==0 && pulseEntry.outPulses>10 && pulseEntry.inPulses==0) {
                logger.warning(`timeout() : Genesis DELETING Node ${this.pulses[p].geo} NeverHeadFromHim `);
                console.log(`timeout() : Genesis DELETING Node ${this.pulses[p].geo} NeverHeadFromHim`);
                Log(`timeout() : Genesis DELETING Node ${this.pulses[p].geo} NeverHeadFromHim`);
                this.deleteNode(pulseEntry.ipaddr, pulseEntry.port);
                delete this.pulses[pulseEntry.geo+":"+this.groupName];  //delete the pulse Entry also
                mustFlash=true;  //we changed the population, we must flash WG for ourselves

            }


        }


        //
        // if timeout changed the population, flashWireguard files
        //
        //if (startingPulseEntryCount != Object.keys(this.pulses).length) {
        if (mustFlash==true) {
            logger.info(`timeout(): mustFlash==true population changed from ${startingPulseEntryCount} setting newPulseGroup.nodeCount=${Object.keys(this.pulses).length}`);
            console.log(`timeout(): mustFlash==true population changed from ${startingPulseEntryCount} setting newPulseGroup.nodeCount=${Object.keys(this.pulses).length}`);
            this.flashWireguard();  //node list changed recreate wireguard file
        }
        this.nodeCount = Object.keys(this.pulses).length;
        //this.buildMatrix();    //goes way - eventually remove this - WRONG IT IS CPU INTENSIVE (was: it is easy enough ) to search existing pulse OWLs with getOWLs.from()
        
        
        //if (this.isGenesisNode()) {     //save pulseGroup in JSON format in filesystem <-- this is fetched by all real-time displays, and to assimilate into groups of groups
            const fs = require('fs');
            let copy = JSON.parse(JSON.stringify(this));  //make a copy -//remove stuff - this file will be fetched and procesed by many

            delete copy.config;  
            //delete copy.u                       

            let strCopy=JSON.stringify(copy);           //and put it backj into lightweight JSON stringify format
            //console.log(" about to write strCopy="+strCopy+" to pulse_groups0.json");
            //var filename="../"+this.config.IP+"."+this.config.PORT+'.json';  // gets polled often ~every second
            //var filename=process.env.WGDIR+"/pulse_group."+this.config.IP+"."+this.config.PORT+'.json';  // gets polled often ~every second
            
            //if (this.isGenesisNode() ) {
            let tmpfilename=process.env.DARPDIR+"/pulse_groups0."+this.groupName+".json";  // gets polled often ~every second
            {
                fs.writeFile(tmpfilename, strCopy, (err:string) => {
                    if (err) throw err;
                    //console.log(ts()+`pulse group object stored in file ${filename} asynchronously as ${strCopy}`);
                });
            }

            {
                let realfilename=process.env.DARPDIR+"/pulse_group."+this.groupName+".json";  // gets polled often ~every second
                fs.rename(tmpfilename,realfilename,(err:string) => {
                    if (err) console.log("Error "+err+" renaming "+tmpfilename+" to "+realfilename+" trying to read back strCopy="+strCopy);
                    //console.log(ts()+`pulse group object stored in file ${filename} asynchronously as ${strCopy}`);
                });
            }

    };


    checkSWversion = () => {        //we check SW version with lead genesis node
        var url = encodeURI("http://" + this.mintTable[1].ipaddr + ":" + this.mintTable[1].port + "/version?ts=" + now() +
                              "&x=" + (now() % 2000)); // Assume GENESIS node    x=add garbage to avoid caches

        if (this.groupOwner == this.config.GEO) {        //GENESIS NODE - CHECK 1st GENESIS NODE SW VERSION
            var genesisNodeList=process.env.GENESISNODELIST;  //GENESISNODELIST is    IP,PORT,NAME  IP,PORT,NAME  IP,PORT,NAME  IP,PORT,NAME 
            if (typeof genesisNodeList == "undefined" ) {
                console.log(`no GENESISNODELIST environmental variable - not doing software check from this genesis node `);                
                return logger.info(`Point your browser to Genesis Node for instrumentation: http://${this.mintTable[0].ipaddr}:${this.mintTable[0].port}`);
            }
            //console.log(ts()+`GENESIS NODE: CHecking first Genesis node for `);
            var firstGenesisNode=genesisNodeList.split(" ")[0];  //GENESISNODELIST is    IP,PORT,NAME  <<--- we want first IP,PORT,NAME  IP,PORT,NAME  IP,PORT,NAME 
            var ip=firstGenesisNode.split(",")[0];
            var port=firstGenesisNode.split(",")[1];
            var name=firstGenesisNode.split(",")[2];
            
            url = encodeURI("http://" + ip + ":" + port + "/version?ts=" + now() +
                              "&x=" + (now() % 2000)); //add garbage to avoid caches
        }
        //console.log(ts()+`checkSWversion url=${url}`);

        //console.log(`checkSWversion()`);
        http.get(url, (res) => {
            res.setEncoding("utf8");
            let body = "";

            res.on("data", (data) => {
                body += data;
            });

            res.on('error', (error) => {
                logger.info("checkSWversion():: checkSWversion CAN'T REACH GENESIS NODE");
                console.log(`checkSWversion():: checkSWversion CAN'T REACH GENESIS NODE`);
                Log(`checkSWversion():: checkSWversion CAN'T REACH GENESIS NODE WITH SW`);
                //there needs to be a way for old Genesis nodes that get a new Internet IP 
                //don't result in forever trying to get updates from an IP that doesn't exist anymore
   
                //process.exit(36);  //think about think - software update failure..... do what?
                // 
            });

            res.on("end", () => {
                var genesisVersion = JSON.parse(body);
                //console.log(`@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@    checkSWversion(): genesis SWversion==${dump(genesisVersion)} this.config=${JSON.stringify(this.config,null,2)}  this.config.VERSION=${this.config.VERSION} MYVERSION()=${MYVERSION()}`);

                var mySWversion = MYVERSION();  // find the Build.*
                this.config.VERSION=mySWversion   //we will exit 
                //var mySWversion = this.config.VERSION = MYVERSION();  // find the Build.*
                //console.log(`checkSWversion(): genesis SWversion==${dump(genesisVersion)} MY SW Version=${mySWversion} me.version=${this.config.VERSION}`);
                //console.log(ts()+`checkSWversion(): genesis SWversion==${genesisVersion} MY SW Version=${mySWversion} me.version=${this.config.VERSION}`);
                if (genesisVersion != mySWversion) {
                    const dockerVersion=genesisVersion.split(":")[0];
                    const darpVersion=genesisVersion.split(":")[1];
                    const myDockerVersion=mySWversion.split(":")[0];
                    if (dockerVersion!=myDockerVersion) {
                        // Docker reload
                        logger.error(`checkSWversion(): NEW DOCKER AVAILABLE - GroupOwner said ${dockerVersion} we are running ${myDockerVersion}. Process exitting 0`);
                        console.log(`checkSWversion(): NEW DOCKER AVAILABLE - GroupOwner said ${dockerVersion} we are running ${myDockerVersion}. Process exitting 0`);
                        console.log(`checkSWversion(): writing ${dockerVersion} to /etc/wireguard/STATE`);
                        Log(`checkSWversion(): NEW DOCKER AVAILABLE - GroupOwner said ${dockerVersion} we are running ${myDockerVersion}. Process exitting 0`);
                        fs.writeFileSync('/etc/wireguard/STATE', dockerVersion+":"+darpVersion );  //store the desired software versions 
                        process.exit(0);                        
                    }
                    // Software reload
                    fs.writeFileSync('/etc/wireguard/STATE', dockerVersion+":"+darpVersion );  //store the desired software versions so updateSW starts this version

                    logger.error(`checkSWversion(): NEW SOFTWARE AVAILABLE - GroupOwner said ${genesisVersion} we are running ${mySWversion}. Process exitting 36`);
                    console.log(`checkSWversion(): NEW SOFTWARE AVAILABLE - GroupOwner said ${genesisVersion} we are running ${mySWversion}. Process exitting 36`);
                    Log(`checkSWversion(): NEW SOFTWARE AVAILABLE - GroupOwner said ${genesisVersion} we are running ${mySWversion}. Process exitting 36`);
                    
                    //For grins, let's try updateSW and see if we can overlay group owners sw

                    const { exec } = require('child_process');
                    var yourscript = exec('sh ../updateSW.bash '+genesisVersion,
                        (error:string, stdout:string, stderr:string) => {
                        console.log(stdout);
                        console.log(stderr);
                        if (error !== null) {
                            console.log(`exec error: ${error}`);
                        }
                    });
                    console.log(`checkSW(): ran updateSW.bash`+genesisVersion);
                    console.log(`checkSW(): ran updateSW.bash`+genesisVersion);
                    console.log(`checkSW(): ran updateSW.bash`+genesisVersion);
                    console.log(`checkSW(): ran updateSW.bash`+genesisVersion);
            

                    //process.exit(36);
                } else { 
                }
            });
        }).on("error", function () {
            console.log(ts()+`checkSW(): ${CONFIG.GEO} fetching version failed ${url} genesis node out of reach - NOT EXITTING `);
            //process.exit(36);    //when genesis node is gone for 15 seconds it will be dropped. dropping here is uneeded
        });
        if (this.isGenesisNode() && (this.adminControl!="STOP") ) //non-genesis nodes will use pulses every few seconds to check software version
            setTimeout(this.checkSWversion, CHECK_SW_VERSION_CYCLE_TIME * 1000); // Genesis nodes check SW with 1st genesis node in GENESISNODELIST
    };
    
    processIncomingPulse = (incomingPulse: IncomingPulse) => {
       // look up the pulse claimed mint
       //console.log(`pulseGroup.processIncomingPulse(): incomingPulse=${dump(incomingPulse)}`);
       var incomingPulseEntry = this.pulses[incomingPulse.geo + ":" + incomingPulse.group];
       var incomingPulseMintEntry = this.mintTable[incomingPulse.mint];

       // pulseGroup owner controls population - FAST TRACK GROUP OWNER PULSE HANDLER
       if (this.groupOwner === incomingPulse.geo ) {  //Is this a groupOwner PULSE?
           this.mintTable[1].lastPulseTimestamp = now();  //mark genesis node as alive
           this.mintTable[1].state = "UP";  // mark genesis node as alive

           if (( incomingPulse.bootTimestamp != this.mintTable[1].bootTimestamp ) ||  //GROUP OWNER PULSE w/new bootTimestamp?
               ( incomingPulse.version != this.mintTable[1].version )) {  //GROUP OWNER running same SW as us?
                console.log(ts()+`processIncomingPulse(): new bootTimestamp or new software reuirement from genesis node - it rebooted so so shall we`);
                console.log(ts()+`processIncomingPulse(): NEW SOFTWARE ${incomingPulse.bootTimestamp} != ${this.mintTable[1].bootTimestamp} || ${incomingPulse.version} != ${this.mintTable[1].version}`);            
                process.exit(36);
            }
        } 
       //

       if (incomingPulseEntry == null || incomingPulseMintEntry == null) {
           // 
           logger.info(`IGNORING ${incomingPulse.geo}:${incomingPulse.group} - we do not have this pulse ${incomingPulse.geo + ":" + incomingPulse.group} as mint ${incomingPulse.mint}  `);
           console.log(ts()+`IGNORING ${incomingPulse.geo}:${incomingPulse.group} - we do not have this pulse ${incomingPulse.geo + ":" + incomingPulse.group} as mint ${incomingPulse.mint} -it is OK for a few of these to show up during transditions.  `);

            Log(`IGNORING UnExpected incoming pulse: ${incomingPulse.geo}:${incomingPulse.group} To Do: send instead a pulse Quarantine Config: Genesis and newNode only. then he can die immediately. `);
            //Opportunity to reply with a config 
            //OR Could use this as an add request - just add it to the mintTable and pulseTable with new mint#?
            //Better to put it into Quarttine mode

           //Sender should not receive pulses from genesis node for 20 seconds and time out
           return;
       }

       
       //    BEVBEVBEV   DEBUG - STORE EVERY PULSE

       const dir = "/root/darp/history/"

       if ( ! fs.existsSync(dir)) {
           fs.mkdirSync(dir);
           //console.log(`pulsegroup.ts created ${dir} history directrory`);
       }  
       

       // debugging - log every pulse - 
//       var filename = "/root/darp/history/"+incomingPulse.geo + ".pulses." + YYMMDD() + ".txt";
//       fs.appendFile(filename, incomingPulse.lastMsg+"\n", (err) => {  //appended RAW pulse message asynchronously  LOAD: Max: 1K/sec * nodeCount, Avg: .1K * 25 nodes=2.5K/sec
//               if (err) throw err;
//       });




       // pulseGroup owner controls population - GROUP OWNER PULSE HANDLER
       if (this.groupOwner === incomingPulse.geo ) {  //Is this a groupOwner PULSE?
            //if ( incomingPulseEntry.bootTimestamp != this.mintTable[1].bootTimestamp ) {
            //    console.log(ts()+`processIncomingPulse(): new bootTimestamp from genesis node - it rebooted so so shall we`);
            //    process.exit(36);
            //} 
           //console.log(`**************************************************       Group Owner Pulse logic ....`);
           // group owner pulse here (SECURITY HOLE-more authentiction needed ip:port)

            if (this.groupOwner != this.mintTable[0].geo) { // use genesis nodes' incoming owls to manage population
                const owlsAry = incomingPulse.owls.split(",");
                // addNode/resynch with groupOwner if we don't have this mint, optimize would be fetch only mint we are missing
                for (var o in owlsAry) {
                    const owlEntry = owlsAry[o];
                    var mint = parseInt(owlEntry.split("=")[0])||999;
                    var srcMintEntry = this.mintTable[mint];
                    //console.log(`owlEntry=${owlEntry} mint=${mint} srcMintEntry=${srcMintEntry}`);    //#1
                    //console.log(`owlEntry=${owlEntry} mint=${mint} mintTable[mint]==${dump(self.mintTable[mint])}`);    //#2
                    if (srcMintEntry == null) {
                        console.log(`We do not have this mint and group Owner announced it: ${mint}`);
                        //we do not have this mint in our mintTable
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
                        var owlmint = parseInt(owlsAry[o].split("=")[0])||999;
                        if (owlmint == myPulseEntry.mint) {
                            found = true;
                        }
                    }
                    // deleteNode if its mint is not in announcement
                    if (!found) {
                        logger.info(`Owner no longer announces  MINT ENTRY ${myPulseEntry.mint} - DELETING mintTable entry, pulseTable entry, and groupOwner owl`);
                        console.log(`Owner no longer announces  MINT ENTRY ${myPulseEntry.mint} in owls (${myPulseEntry.owls}) - DELETING mintTable entry, pulseTable entry, and groupOwner owl`);
                        if (this.mintTable[myPulseEntry.mint])
                            this.deleteNode(this.mintTable[myPulseEntry.mint].ipaddr, this.mintTable[myPulseEntry.mint].port);
                        
                        
                        //delete this.pulses[pulse];  //@wbn try deleting this entry
                        //return;   //why return?  @wbn


                    }
                }
            } else {
                //console.log(`@wbn We are group owner receiving our own pulse`);
            }
            //
            //      PUT NODE INTO UP STATE - Maybe we need a finitte state machine to emit state transition events?
            // UP Means Authoratitive Genesis Node sent us a pulse with our own mint shpwing up
            //
           this.mintTable[1].state = "UP";   //Genesis Node is UP
           //if (incomingPulseEntry.owls.match(/[0-9]*=[0-9]*/)myMint)) {  //if Genesis node is sending me my OWL, we are UP
           this.mintTable[0].state = "UP";   // mark self as UP since we got a pulse from genesis node  - this should be when he sees his owl measurement in the announcement
           this.mintTable[this.mintTable[0].mint].state = "UP";   // mark self as UP since we got a pulse from genesis node
           //}
           //console.log(`processIncomingPulse(): Marking node UP`);
               //console.log(`GroupOwner Pulse processed - marked group Owner UP`);

        } else {         //Message NOT from groupOwner.
           //console.log(`====================================================    NON-Group Owner Pulse logic ....`);
           if (this.mintTable[0].mint==1) {    //Not a group owner pulse Am I group owner?
                if (this.mintTable[incomingPulseEntry.mint]!=null) {    //I am group owner, do I know this guy? 
                    if (this.mintTable[incomingPulseEntry.mint].state=="QUARANTINE") {   //Can we help it out of Quarantine?
                        console.log(` We are Group Owner ${this.mintTable[0].geo} receiving member pulse from node ${incomingPulse.geo} in state=${this.mintTable[incomingPulseEntry.mint].state}`);
                        //console.log(`Received a pulse from a node we labeled as QUARANTINED ... flash`);                                  
                        //console.log(`Received a pulse from a node we labeled as QUARANTINED ... flash`);                    
                        //console.log(`Received a pulse from a node we labeled as QUARANTINED ... flash`);                                  
                        //console.log(`FLASHING WG group ower receiving pulse from non-genesis node ${dump(incomingPulse)}`);                    
                        //console.log(`FLASHING WG group ower receiving pulse from non-genesis node ${dump(incomingPulse)}`);                    
                        //console.log(`FLASHING WG group ower receiving pulse from non-genesis node ${dump(incomingPulse)}`); 
                        Log(`processIncomingPulse() migrating ${incomingPulse.geo}:${incomingPulse.group} from QUARANTINE to UP and flashing new config`);                   
                        console.log(`processIncomingPulse():  migrating ${incomingPulse.geo}:${incomingPulse.group} from QUARANTINE to UP and FLASH new wireguard config`);                   
                        this.flashWireguard();
                        this.mintTable[incomingPulseEntry.mint].state="UP" //Genesis is READY TO ACCEPT nodes
                    }
                } else {
                    //We are just a member of this pulseGroup - not up to us to adjust population
                    //a new node causes mintTable rplication so we overwrite and sync all member stats to genesis when new node joins
                }
            } else {
                //console.log(`I am not group owner`);
            }

            //
            //  TAKE OURSELVES NODE OUT OF QUARANTINE
            //
           // non-Genesis node pulse - we must be out of Quarantine
           if (this.mintTable[0].state == "QUARANTINE") {
               logger.info(`Received non-genesis pulse - I am accepted in this pulse group - I must have transitioned out of Quarantine`);
               console.log(`Received non-genesis pulse - I am accepted in this pulse group - I must have transitioned out of Quarantine`);
               this.mintTable[0].state = "UP";
               this.mintTable[this.mintTable[0].mint].state = "UP";   // mark self as UP since we got a pulse from genesis node
               Log(`Not groupOwner pulse - migrating ${incomingPulse.geo}:${incomingPulse.group} from QUARANTINE to UP`);                   
               this.flashWireguard();  //only after we ensure a clear path between node through a port do we involve the others in the group with this new node
               console.log(`QUARANTINE mode migration - flashing wireguard with new config`);
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
            if (d.getSeconds() == 0 && incomingPulseEntry.history.length >= 60 ) {   //no median until we have 60 samples - once a minute
                incomingPulseEntry.medianHistory.push(
                    Math.round(median(incomingPulseEntry.history))   //wbnwbnwbn TODO: Here push { ts:timestamp, data: dataPoint }
                );
                
                // store 60 samples
                if (incomingPulseEntry.medianHistory.length > 60*STAT_HOURS_TO_STORE) {   //save only 2 hours worth of data for now
                    incomingPulseEntry.medianHistory.shift(); // drop off the last median
                }
                
            }
            var dataPoints=incomingPulseEntry.medianHistory.concat(incomingPulseEntry.history);
            //if (dataPoints.length>60 ) {    //Option B - Distributed - all with same algorithm come to aprox same conclusion, all delete node.
            if (dataPoints.length>60 && this.isGenesisNode()) {    //Not sure I like having every node look for clock skew - could be done only by genesis node
                    //  GENESIS NODE: Check for only rising or only falling measurements as clock drift
                //  Check for clock drift - remove nodes with all of the last 60 samples in a row increasing or decreasing
                //                  allow up to half the time to be steady and still be considered clock drift and killed
                //Note that high jitter  on links with clock drift will be seen as valid for a minute and removed after an hour
                var norm=999999;
                var direction="";
                var UPANDDOWNMEASURES=false;
                    var steady=0;  //how many steady measures do I see?
                for (var h in dataPoints) {
                    var dataPoint=incomingPulseEntry.history[h];
                    //console.log(`dataPoint=${dataPoint} norm=${norm} direction=${direction} ${UPANDDOWNMEASURES}`);
                    if (norm==999999) 
                        norm=dataPoint;
                    if (dataPoint>norm) {
                        if (direction=="ONLYFALLING") 
                            UPANDDOWNMEASURES=true;
                        else direction="ONLYRISING";
                    }
                    if (dataPoint<norm) {
                        if (direction=="ONLYRISING") 
                            UPANDDOWNMEASURES=true;
                        else direction="ONLYFALLING";
                    }
                    if (norm==dataPoint) steady++;      //We like steady network segments KEEP THEM                  
                    norm=dataPoint;
                }
                if (!UPANDDOWNMEASURES && direction!="" && steady < (dataPoints.length/2) ) {    //kill always increasing/decreasing latency but leave steady ones alone
                    console.log(`FOUND CLOCK SKEW for node ${incomingPulseEntry.geo} ${incomingPulseEntry.group} ${incomingPulseEntry.ipaddr} DELETING NODE`);

                    Log(`DELETING node for CLOCK SKEW ISSUES ${incomingPulseEntry.geo} ${incomingPulseEntry.ipaddr} DELETING NODE`);
                    this.deleteNode(this.mintTable[incomingPulseEntry.mint].ipaddr, this.mintTable[incomingPulseEntry.mint].port);   
                } else {
                    //console.log(`No clock skew found: direction=${direction} UPANDDOWNMEASURES=${UPANDDOWNMEASURES} ${incomingPulseEntry.history[h]}`);
                }
                //
                //  We could repeat the same logic to the medianHistory - kill it if we see 60 minuutes of continuously rising or falling latency measures
                //
            }               

            this.storeOWL(incomingPulse.geo, this.mintTable[0].geo, incomingPulse.mint);  // store pulse latency To me for later graphing
            
        } else {
            logger.warning(`Received pulse but could not find a matching pulseRecord for it. Ignoring until group owner sends us a new mintTable entry for: ${incomingPulse.geo}`);
        }
    }

    recvPulses = (incomingMessage: string, ipaddr: string, port: string) => {
        let udp = dgram.createSocket("udp4");    
        // try {
            // const incomingPulse = await parsePulseMessage(incomingMessage)
        var ary = incomingMessage.split(",");
        const pulseTimestamp = parseInt(ary[0]);
        const senderTimestamp = parseInt(ary[1]);
        const OWL = pulseTimestamp - senderTimestamp;
        var owlsStart = nth_occurrence(incomingMessage, ",", 9); //owls start after the 7th comma
        var pulseOwls = incomingMessage.substring(owlsStart + 1, incomingMessage.length);
        var incomingPulse: IncomingPulse = {
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
        //  Mgmt layer
        //console.log(`incomingPulse=${incomingPulse} incomingPulse.msgType=${incomingPulse.msgType}`);
        if (incomingPulse.msgType=="11") {
            //console.log(`incomingPulse DARP PING (testport)`); // request=${JSON.stringify(incomingPulse)}`);
            console.log(`PING MESSAGE incomingPulse.msgType=${incomingPulse.msgType}    incomingPulse=${JSON.stringify(incomingPulse,null,2)}`);
            //
            //if (this.isGenesisNode() && this.nodeCount<this.config.MAXNODES) {
            if ( this.nodeCount<this.config.MAXNODES) {
                    //HERE put the nodeCount and the # better paths
                //PONG MESSAGE
                var message=`${now()},12,${this.config.VERSION},${this.config.IP},${this.config.PORT},${this.config.GEO},${this.config.BOOTTIMESTAMP},${this.config.PUBLICKEY}`   //,${process.env.GENESISNODELIST}`; //specify GENESIS Node directly

                //else
                //    var message="http://"+this.config.GENESIS+":"+this.config.GENESISPORT+"/darp.bash?pongMsg="+pongMsgEncoded;

                console.log(`Sending PONG (12) to ${ipaddr}:65013 message=${message}`);
                udp.send(message, 65013, ipaddr);
            } else {
                console.log(`pulseGroup full - not answering request to join... `);
            }
            //
            //
            // STILL DEVELOPING THIS AREA -- PING should include stuff to allow receiver to decide if it is a better connection for it
            //  PONG should include enough to advocate the desired outcome - connect to me, to my genesis node, to this obne closer to you.
            //
            //
        } else {
            //console.log(`incomingPulse.msgType=${incomingPulse.msgType}`);
            if (parseInt(incomingPulse.msgType)==12) {    //PONG response
                //console.log(`INCOMING DARP PONG (12).... incomingPulse.msgType=${incomingPulse.msgType}`);
                //console.log(`pulsegroup.ts: PONG RESPONSE: ${JSON.stringify(incomingPulse,null,2)}`);
            } else {  //default pass up the stack
                //console.log(`INCOMING PULSE incomingPulse.msgType=${incomingPulse.msgType}`);
                this.processIncomingPulse(incomingPulse);
            }
        }
        //this.incomingPulseQueue.push(incomingPulse);  //tmp patch to test
    };
    

    // Store one-way latencies to file or graphing & history
    //
    //  TOSO: This is called for EACH Measure - do not do a lot here! store and move on
    //      Thos that want the data will parse through and make it
    //      This will not scale well, being called exonential times
    //      Probably the reason this system can not get beyond 25 nodes.
    //
    storeOWL = (src: string, dst: string, srcMint: number) => {
        const pulseLabel = src + ":" + this.groupName;
        const pulseEntry = this.pulses[pulseLabel];
        if (pulseEntry != null) {
            //
            var strDataPoints = ""; // format: { label: "22:37:49", y: 10 }, we have no timestamps yet in this model
            //
            strDataPoints=`{ label: "${ts()}", y: ${pulseEntry.history[0]} }`  //TODO: VERIFY-CHECK - is [0] always the latest measure?
//            grapherStoreOwls(src, dst, strDataPoints); // store OWL in a way the grapher can parse it
            grapherStoreOwls(src, dst, strDataPoints); // store OWL in a way the grapher can parse it
            
        }
    };

    // Sync this pulseGroup object with genesis node pulseGroup object: copy mint table and update (add/del) pulse entries so we match the genesis node
    syncGenesisPulseGroup = () => {
        if (this.isGenesisNode()) {
            logger.warning("syncGenesisPulseGroup(): GENESIS node does not sync with itself but will set Wireguard files");
            this.flashWireguard(); // change my wg config
            return; // genesis node dies not fetch its own configuration
        }
        //var url = encodeURI('http://' + this.mintTable[1].ipaddr + ":" + this.mintTable[1].port + "/mintTable/" + this.groupName + "/" + this.mintTable[0].mint);  //ask for mintTable with my mint in as mint 0
        var url = encodeURI('http://' + this.mintTable[1].ipaddr + ":" + this.mintTable[1].port + "/mintTable/" + this.groupName);  //ask for mintTable with my mint in as mint 0
        console.log(`syncGenesisPulseGroup(): url=${url}`);
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
                        Log(`syncGenesisPulseGroup(): Adding new pulse entry that genesis told us about ${pulse}`);
                        self.pulses[pulse] = pulses[pulse];  // save our new pulse entry
                    }
                }
                for (var pulse in self.pulses) {
                    // Delete all node we have that the group owner does not
                    if (typeof pulses[pulse] == "undefined") {
                        logger.info(`syncGenesisPulseGroup(): Removing pulse entry that genesis node does not have: ${pulse}`);
                        delete self.pulses[pulse];  //delete this pulse we have but groupOwner does not have
                        Log(`syncGenesisPulseGroup(): Removing pulse entry that genesis node does not have: ${pulse}`);
                    }
                }
                self.nodeCount = Object.keys(self.pulses).length;
                logger.warning("Flashing Wireguard configs");

                self.flashWireguard(); //send mintTable to wireguard to set config

            });
        });
    };

    launch = () => {
        try {
            console.log(`index.ts: pulseGroup.launch() -> ${this.groupName} `);
                
            this.flashWireguard();  // create our wireguard files based on our mint Table
            this.pulse();               //start pulsing -sets own timeout
            //augmentedPulseGroup.workerThread();  //start workerthread to asynchronously processes pulse messages
            //setTimeout(this.findEfficiencies,1000);  //find where better paths exist between intermediaries - wait a second 
            setTimeout(this.checkSWversion, 10 * 1000);  // check that we have the best software
            setTimeout(this.measurertt, 2 * 1000); // ping across wireguard every other second  

            //
            //  Here is where you add your customer scripts to run on all pof your instances of this docker
            //

            console.log(ts()+`pulseGroup(): Launched sub agent: here is where you launch your customer code...`);

            //
            //  
            //

            console.log(`index.ts: pulseGroup.launched() -> ${this.groupName} `);

        } catch (error) {
            logger.error(error);
        }
    };

    //
    //  measurertt() - subagents/rtt doing measurements based on pulling pulseGroup once a minute
    //              it creates a file ip.<ipaddr> if it responds to ping, deletes if it does not respond
    //              launchrtt.bash will do the measures and create/delete files based on results.  Here we check n*2 files. up to 50/sec
    //              in a docker this is a memory exercize so less painful than it dsounds.
    //
    measurertt = () => {
        if (!MEASURE_RTT) return;  // can not spin up 1 ping process per node per second

        for (var p in this.pulses) {
            const pulseEntry = this.pulses[p]; //do we need to check if this pulse still exists?

            const mintIP = mint2IP(pulseEntry.mint);
            const publicIP = pulseEntry.ipaddr;
            const filename='/root/darp/subagents/rtt/ip.'+publicIP;
            fs.access(filename, (err) => {
                if (err) {
                    //console.log("file not exist - ping "+pulseEntry.geo+" "+pulseEntry.ipaddr+" must have failed "+filename+"=>"+err);
                    pulseEntry.rtt = NO_MEASURE;
                } else {
                    fs.readFile(filename, 'utf8' , (err, data) => {
                        if (err) {
                          console.error(err)
                          return
                        }
                        //console.log(data)
                        pulseEntry.rtt = parseInt(data);
                      })
                }
            });
            const wgfilename='/root/darp/subagents/rtt/'+'ip.'+mintIP;
            fs.access(wgfilename, (err) => {
                if (err) {
                    //console.log("file not exist - wg ping "+pulseEntry.geo+" "+mintIP+" must have failed "+filename+"=>"+err);
                    pulseEntry.wgrtt = NO_MEASURE;
                } else {
                    fs.readFile(wgfilename, 'utf8' , (err, data) => {
                        if (err) {
                          console.error(err)
                          return
                        }
                        //console.log(data)
                        pulseEntry.wgrtt = parseInt(data);
                      })
                }
            });

        }
        if (this.adminControl!="STOP")
            setTimeout(this.measurertt, 1 * 1000 );  // check ping every node every 
    }

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

/** the reason to do this is to exercie the forwarding path to check that ports to ourselves work
 * Initiates construction of the pulsegroup object by sneding the request to the genesis node
 * @param {Config} config contains constants and environmental variables, such as ip and port
 * *
 * * This adds and starts a pulseGroup
 */
export const getPulseGroup = async (config: Config): Promise<PulseGroup> => {

    const configurl = "http://" + config.GENESIS +
        "/nodefactory?geo=" + config.GEO +
        "&port=" + config.PORT +
        "&publickey=" + config.PUBLICKEY +
        "&genesisport=" + config.GENESISPORT +
        "&version=" + config.VERSION +
        "&wallet=" + config.WALLET +
        "&myip=" + config.IP +
        "&ts=" + now();
        return(getPulseGroupURL(configurl))
}
export var getPulseGroupURL= async (configurl:string): Promise<PulseGroup> => {

    var pulseGroupObjectURL = encodeURI(configurl);

    logger.info(
        `getPulseGroupURL(): getting pulseGroup from url=${pulseGroupObjectURL}`
    );

    return new Promise((resolve, reject) => {
        try {
        const req = http.get(pulseGroupObjectURL, (res) => {
            if (res.statusCode != 200) {
                return reject(
                    new Error(`getPulseGroupURL(): received status code ${res.statusCode}`)
                );
            }

            var data = "";
            res.on("data", (stream) => {
                data += stream;
            });

            res.on("error", () => {
                return reject(
                    new Error(`getPulseGroupURL(): received error from ${pulseGroupObjectURL}`)
                );
            });

            res.on("end", () => {
                var newPulseGroup: PulseGroup = JSON.parse(data);
                logger.info(`getPulseGroupURL(): from node factory: ${dump(newPulseGroup)}`);
                if (newPulseGroup==null) {
                    console.log(`pulseGroup ERROR: Genesis node refused connection request @${pulseGroupObjectURL} exitting...`);
                    console.log(`pulseGroup ERROR: Genesis node refused connection request @${pulseGroupObjectURL} exitting...`);
                    console.log(`pulseGroup ERROR: Genesis node refused connection request @${pulseGroupObjectURL} exitting...`);
                    console.log(`pulseGroup ERROR: Genesis node refused connection request @${pulseGroupObjectURL} exitting...`);
                    console.log(`pulseGroup ERROR: Genesis node refused connection request @${pulseGroupObjectURL} exitting...`);
                   return;                    
                    //process.exit(36);  //reload software and take another pass
                }

                Log(`getPulseGroupURL JOINED NEW PULSEGROUP:   ${newPulseGroup.mintTable[0].geo} : ${newPulseGroup.groupName} ${newPulseGroup.mintTable[0].ipaddr}:${newPulseGroup.mintTable[0].port} and Launching...`);
                addPulseGroup(newPulseGroup);  //don't start self as Genesis - already started
                return resolve(newPulseGroup);
            });
        });
        req.end();
    } catch(e) {
        console.log(`getPulseGroupURL: get ${pulseGroupObjectURL} Failed`);
    }
    });
};



