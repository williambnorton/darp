/** @module pulsegroup Create Configuration for joining our pulseGroup object */

import fs = require("fs");
import os = require("os");
import http = require("http");
import child_process = require("child_process");
import express = require("express");
import { dump, now, MYVERSION, median, mint2IP, ts } from "./lib";
import { logger } from "./logger";
import { sendPulses, recvPulses } from "./pulselayer";
import { grapherStoreOwls } from "./grapher";
import { setWireguard, addPeerWGStanza, addMyWGStanza } from "./wireguard";

// Define constants

const CHECK_SW_VERSION_CYCLE_TIME = 15; // CHECK SW updates every 15 seconds
const NO_MEASURE = -99999;
const DEFAULT_START_STATE = "QUARANTINE"; // "SINGLESTEP"; console.log(ts()+"EXPRESS: ALL NODES START IN SINGLESTEP (no pulsing) Mode");
logger.info("pulsegroup: ALL NODES START IN " + DEFAULT_START_STATE + " Mode");

//logger.logLevel=3;
//logger.setLevel(3);
//logger.logLevel = LogLevel.INFO

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

        if (!process.env.GENESIS) {
            logger.error(`No GENESIS environmental variable specified - EXITTING`);
            process.exit(86);
        }
        this.GENESIS = process.env.GENESIS;

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
            logger.warning("No MYIP environmental variable specified - ERROR - but I will try and find an IP myself from incoming message");
            process.env.MYIP = process.env.GENESIS; // MYIP();
        } else {
            process.env.MYIP = process.env.MYIP.replace(/['"]+/g, ""); //\trim string
        }
        this.IP = process.env.MYIP;

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

/** Incoming pulse definition, when deserialized form pulse message. Export for use in pulselayer. */
export class IncomingPulse {
    outgoingTimestamp: number;
    pulseTimestamp: number;
    msgType: string;
    version: string;
    geo: string;
    group: string;
    seq: number;
    bootTimestamp: number;
    mint: number;
    owls: string;
    owl: number;
    lastMsg: string;
    constructor(
        pulseTimestamp: number,
        outgoingTimestamp: number,
        msgType: string,
        version: string,
        geo: string,
        group: string,
        seq: number,
        bootTimestamp: number,
        mint: number,
        owls: string,
        owl: number,
        lastMsg: string
    ) {
        this.pulseTimestamp = pulseTimestamp;
        this.outgoingTimestamp = outgoingTimestamp;
        this.msgType = msgType;
        this.version = version;
        this.geo = geo;
        this.group = group;
        this.seq = seq;
        this.bootTimestamp = bootTimestamp; //if genesis node reboots --> all node reload SW too
        this.mint = mint;
        this.owls = owls;
        this.owl = owl;
        this.lastMsg = lastMsg;
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
        this.cycleTime = 1; // pulseGroup-wide setting: number of seconds between pulses
        this.matrix = [];
        this.csvMatrix = [];
    }
}

/** PulseGroup object with all necessary functions for sending and receiving pulses */
export class AugmentedPulseGroup {
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

    adminControl: string;
    config: Config;

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
        this.matrix = pulseGroup.matrix;
        this.csvMatrix = pulseGroup.csvMatrix;

        this.adminControl = "";
        this.config = config;
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
                    logger.warning(
                        `deleteNode(): deleting mint ${mintEntry.mint}`
                    );
                    delete this.mintTable[mintEntry.mint];
                }
            }
        }
        var deletedMint = -1;
        for (var pulseLabel in this.pulses) {
            const pulseEntry = this.pulses[pulseLabel];
            if (pulseEntry.ipaddr == ipaddr && pulseEntry.port == port) {
                logger.warning(`deleteNode: deleting pulse ${pulseLabel}`);
                deletedMint = pulseEntry.mint;
                delete this.pulses[pulseLabel];
            }
        }

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

        this.nodeCount = Object.keys(this.pulses).length;
    };

    // Build matrix of objects for each segment
    buildMatrix = () => {
        var matrix: number[][] = [];
        for (var pulse in this.pulses) {
            const pulseEntry = this.pulses[pulse];

            if (now() - pulseEntry.pulseTimestamp < 2 * 1000) {
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
                logger.warning(`${pulseEntry.geo} mint#${pulseEntry.mint} has an old pulseTimestamp. Entering NO_OWL for all values to this node`);
                // node did not respond - so we have no data - no entry, should we mark call all NO_OWL
                // newPulseGroup.forEachNode(function(index:string,groupNode:PulseEntry) {
                //    if ((index!="0") && (groupNode.mint!=nodeEntry.mint))
                //        matrix[groupNode.mint][nodeEntry.mint]=NO_OWL;  //clear out previously published measurements
                //});

                // if (typeof newPulseGroup.mintTable[0].mint=="undefined")  return console.log("UNDEFINED MINT 0 - too early");
                // console.log(`nodeEntry.mint=${nodeEntry.mint} mymint=${newPulseGroup.mintTable[0].mint}`);

                if (typeof matrix[pulseEntry.mint] == "undefined") {
                    matrix[pulseEntry.mint] = [];
                }
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
        var ipary: string[] = [];
        var owls = "";

        for (var pulse in this.pulses) {
            var pulseEntry = this.pulses[pulse];
            ipary.push(pulseEntry.ipaddr + "_" + pulseEntry.port);
            ipary.push(mint2IP(pulseEntry.mint) + "_" + 80); // wbnwbn send to secure channel also
            pulseEntry.outPulses++;

            // this section flags "interesting" cells to click on and explore
            var flag = "";
            if (pulseEntry.owl == NO_MEASURE) {
                owls += pulseEntry.mint + ",";
            } else {
                var medianOfMeasures = median(pulseEntry.history);
                if (pulseEntry.medianHistory.length > 0) {
                    // use medianHistory to identify a median to deviate from
                    var medianOfMedians = median(pulseEntry.medianHistory);
                    var deviation = Math.round(
                        (Math.abs(medianOfMedians - pulseEntry.owl) * 100) /
                            medianOfMedians
                    );
                    var delta = Math.abs(medianOfMedians - pulseEntry.owl);
                    //TURN ON TO DEBUG FLAGGING
                    // if (deviation!=0) console.log(`pulse(): geo=${nodeEntry.geo} nodeEntry.owl=${nodeEntry.owl} medianOfMeasures=${medianOfMeasures} medianOfMedians=${medianOfMedians} deviation=${deviation}%`);
                    // if ((nodeEntry.owl>4) && (deviation>DEVIATION_THRESHOLD)) {  //flag if off by 30% from median
                    if (delta > 10) {
                        // flag if deviation is > 10ms - we can improve that
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
            var myMint = this.mintTable[0].mint;
            var pulseMessage = 
                "0," + 
                this.config.VERSION + "," + 
                this.config.GEO + "," + 
                this.groupName + "," + 
                myEntry.seq + "," + 
                this.mintTable[0].bootTimestamp + "," + 
                myMint + "," + 
                owls;
            logger.debug(`pulseGroup.pulse(): pulseMessage=${pulseMessage} to ${dump(ipary)}`);
            sendPulses(pulseMessage, ipary);  //INSTRUMENTATION POINT
        }

        this.timeout(); // and timeout the non-responders
        if (this.adminControl == "RESYNCH") {
            logger.info("Resynching with genesis node...");
            this.syncGenesisPulseGroup(); // fetch new config from genesis
            this.adminControl = "";
        }
        // this.mintTable[0].state = "UP";
        this.mintTable[0].lastPulseTimestamp = now();

        var sleepTime = 1000 - ((now() + 1000) % 1000); // start pulse around on the second
        // INSTRUMENTATION POINT shows load on node - DO NOT DELETE
        setTimeout(this.pulse, sleepTime);
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
        const startingPulseEntryCount = this.pulses.length;
        for (var m in this.mintTable) {
            if ((m != "0") && m != "1" && this.mintTable[m] && this.mintTable[m].lastPulseTimestamp != 0) {
                // ignore mintTable[0]
                var elapsedMSincePulse = now() - this.mintTable[m].lastPulseTimestamp;

                if (elapsedMSincePulse > 2 * this.cycleTime * 1000) {
                    // timeout after 2 seconds
                    logger.debug(`m=${m} elapsedMSincePulse=${elapsedMSincePulse} clearing OWL in mint entry which missed at least one cycle ${this.mintTable[m].geo}`);

                    this.mintTable[m].lastOWL = NO_MEASURE;  // we don't have a valid OWL
                    if (this.mintTable[m].state != "QUARANTINE") {
                        this.mintTable[m].state = "NR";  // we don't know this node's state
                    }

                    if (this.isGenesisNode()) {
                        // Genesis only
                        logger.debug("m=" + m + " I am genesis node not seeing him for elapsedMSincePulse=" + elapsedMSincePulse);
                        if (elapsedMSincePulse > 5 * this.cycleTime * 1000) {
                            // timeout node after 5 seconds
                            logger.debug(`timeout(): DELETE geo=${this.mintTable[m].geo} mint=${this.mintTable[m].mint} NODE with ${elapsedMSincePulse} ms old timestamp `);
                            this.deleteNode(this.mintTable[m].ipaddr, this.mintTable[m].port);
                        }
                    } else {
                        // not genesis - only can time out genesis
                        var age = now() - this.mintTable[1].lastPulseTimestamp;
                        if (age > 30 * 1000) {
                            logger.error(`Genesis node disappeared. age of = ${age} ms Exit, our work is done. Exitting. newpulseGorup=${dump(this)}`);
                            process.exit(36);
                        }
                        // we may timeout the group owner and kill the pulsegroup
                        // if (elapsedMSincePulse > 60 * 1000 ) console.log("group owner has been unreachable for 1 minute: "+elapsedMSincePulse);
                    }
                    // TODO: Nodes can be upgraded to "BUSY" if someone else has a measurement to it
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

                    // only Genesis can delete inactive nodes within the group
                    if (this.isGenesisNode()) {
                        if (elapsedMSincePulse > 10 * this.cycleTime * 1000) {
                            logger.warning(`timeout() : Genesis DELETING Node ${this.pulses[p].geo} with ${elapsedMSincePulse} ms old timestamp `);
                            this.deleteNode(pulseEntry.ipaddr, pulseEntry.port);
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
        }

        if (startingPulseEntryCount != this.pulses.length) {
            logger.info(`timeout(): nodeC0unt Changed from ${startingPulseEntryCount} setting newPulseGroup.nodeCount=${this.pulses.length}`);
        }
        this.nodeCount = Object.keys(this.pulses).length;
        this.buildMatrix();
    };

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

    //  recvPulses
    recvPulses = () => {
        const self = this;

        recvPulses(this.config.PORT, function (incomingPulse: IncomingPulse) {
            // look up the pulse claimed mint
            var incomingPulseEntry = self.pulses[incomingPulse.geo + ":" + incomingPulse.group];
            var incomingPulseMintEntry = self.mintTable[incomingPulse.mint];

            if (incomingPulseEntry == null || incomingPulseMintEntry == null) {
                // show more specifics why pulse is ignored
                logger.info(`IGNORING ${incomingPulse.geo}:${incomingPulse.group} - we do not have this pulse ${incomingPulse.geo + ":" + incomingPulse.group} or mint ${incomingPulse.mint} entry entry`);
                return;
            }

            // pulseGroup owner controls population
            if (self.groupOwner === incomingPulseEntry.geo) {
                // group owner pulse here (SECURITY HOLE-more authentiction needed ip:port)

                console.log(`checking owners owls to see if we don't have mints the owner is announcing`);
                var owlsAry = incomingPulse.owls.split(",");
                // addNode/resynch with groupOwner if we don't have this mint, optimize would be fetch only mint we are missing
                for (var o in owlsAry) {
                    const owlEntry = owlsAry[o];
                    var mint = parseInt(owlEntry.split("=")[0]);
                    var srcMintEntry = self.mintTable[mint];
                    if (srcMintEntry == null) {
                        console.log(`We do not have this mint the group Owner announced mint: ${mint}`);
                        //we do not have this mint in our mintTale
                        logger.info(`Owner announced a  MINT ${mint} we do not have - HACK: re-syncing with genesis node for new mintTable and pulses for its config`);
                        self.syncGenesisPulseGroup();  // HACK: any membership change we need resync
                        return;
                    }
                }

                // find each pulse in the group owner announcement or delete/resync
                for (var pulse in self.pulses) {
                    var myPulseEntry = self.pulses[pulse];
                    var found = false;
                    var owlsAry = incomingPulse.owls.split(","); // TODO: test probably dont need this
                    for (var o in owlsAry) {
                        var owlmint = parseInt(owlsAry[o].split("=")[0]);
                        if (owlmint == myPulseEntry.mint) {
                            found = true;
                        }
                    }
                    // deleteNode if its mint is not in announcement
                    if (!found) {
                        logger.info(`Owner no longer announces  MINT ENTRY ${myPulseEntry.mint} - DELETING mintTable entry, pulseTable entry, and groupOwner owl`);
                        self.deleteNode(self.mintTable[myPulseEntry.mint].ipaddr, self.mintTable[myPulseEntry.mint].port);
                        return;
                    }
                }
            } else {
                // non-Genesis node pulse - we must be out of Quarantine
                if (self.mintTable[0].state == "QUARANTINE") {
                    logger.info(`Received pulse from non-genesis node - I am accepted in this pulse group - must have transitioned out of Quarantine`);
                    console.log(`Received pulse from non-genesis node - I am accepted in this pulse group - must have transitioned out of Quarantine`);
                    self.mintTable[0].state = "UP";
                    //self.measurertt();  //turn off for now
                    self.secureTrafficHandler((data: any) => {
                        console.log(`secureChannel traffic handler callback: ${data}`);
                    });
                }
            }

            // with mintTable and pulses updated, handle valid pulse: we expect mintEntry to --> mint entry for this pulse
            if (incomingPulseEntry !== undefined) {
                self.ts = now(); // we got a pulse - update the pulseGroup timestamp

                // copy incoming pulse into my pulse record
                incomingPulseEntry.inPulses++;
                incomingPulseEntry.lastMsg = incomingPulse.lastMsg;
                incomingPulseEntry.pulseTimestamp = incomingPulse.pulseTimestamp;
                incomingPulseEntry.owl = incomingPulse.owl;
                incomingPulseEntry.seq = incomingPulse.seq;
                incomingPulseEntry.owls = incomingPulse.owls;
                incomingPulseEntry.history.push(incomingPulseEntry.owl);

                // store 60 samples
                if (incomingPulseEntry.history.length > 60) {
                    incomingPulseEntry.history.shift(); // drop off the last sample
                }

                var d = new Date(incomingPulseEntry.pulseTimestamp);
                if (d.getSeconds() == 0) {
                    incomingPulseEntry.medianHistory.push(
                        median(incomingPulseEntry.history)
                    );
                }

                //update mint entry
                incomingPulseMintEntry.lastPulseTimestamp = incomingPulseEntry.pulseTimestamp;  // CRASH mintEntry ==null
                incomingPulseMintEntry.lastOWL = incomingPulseEntry.owl;
                if (incomingPulseMintEntry.state == "QUARANTINE") {
                    logger.warning(`incomingPulse received from ${incomingPulseMintEntry.geo} - migrating from ${incomingPulseMintEntry.state} to UP state`);
                }
                incomingPulseMintEntry.state = "UP";

                if (incomingPulseEntry.mint == 1) {
                    //if pulseGroup owner, make sure I have all of his mints
                    if (incomingPulse.version != self.config.VERSION) {
                        // Software reload and reconnect
                        logger.error(`Group Owner has newer? software than we do my SW version: ${self.config.VERSION} vs genesis: ${incomingPulse.version}). QUit, Rejoin, and reload new SW`);
                        process.exit(36);
                    }

                    // TODO: Also resync if the groupOwner has removed an item
                }
                self.storeOWL(incomingPulse.geo, self.mintTable[0].geo, incomingPulse.mint);  // store pulse latency To me

            } else {
                logger.warning(`Received pulse but could not find a matching pulseRecord for it. Ignoring until group owner sends us a new mintTable entry for: ${incomingPulse.geo}`);

                //newPulseGroup.fetchMintTable();  //this should be done only when group owner sends a pulse with mint we havn't seen
                //maybe also add empty pulse records for each that don't have a pulse record
            }
        });
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
            logger.warning("GENESIS node does not sync with itself but will set Wireguard files");
            this.flashWireguard(); // change my wg config
            return; // genesis node dies not fetch its own configuration
        }
        var url = encodeURI('http://' + this.mintTable[1].ipaddr + ":" + this.mintTable[1].port + "/pulsegroup/" + this.groupName + "/" + this.mintTable[0].mint);
        logger.info(`syncGenesisPulseGroup(): url=${url}`);
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

                // TODO - don't copy timeStamps - they are relative to genesis clock

                var pulses = groupOwnerPulseGroup.pulses;
                for (var pulse in pulses) {
                    // Add all mints that we don't have
                    if (typeof self.pulses[pulse] == "undefined") {
                        logger.info(`syncGenesisPulseGroup(): Adding new pulse entry as my own: ${pulse}`);
                        console.log(`syncGenesisPulseGroup(): Adding new pulse entry as my own: ${pulse}`);
                        self.pulses[pulse] = pulses[pulse];  // save our new pulse entry
                    }
                }
                for (var pulse in self.pulses) {
                    // Delete all node we have that the group owner does not
                    if (typeof pulses[pulse] == "undefined") {
                        logger.info(`syncGenesisPulseGroup(): Removing pulse entry that genesis node does not have: ${pulse}`);
                        logger.info(`syncGenesisPulseGroup(): Removing pulse entry that genesis node does not have: ${pulse}`);
                        logger.info(`syncGenesisPulseGroup(): Removing pulse entry that genesis node does not have: ${pulse}`);
                        logger.info(`syncGenesisPulseGroup(): Removing pulse entry that genesis node does not have: ${pulse}`);
                        logger.info(`syncGenesisPulseGroup(): Removing pulse entry that genesis node does not have: ${pulse}`);
                        delete self.pulses[pulse];  //delete this pulse we have but groupOwner does not have
                    }
                }
                self.nodeCount = Object.keys(self.pulses).length;
                logger.warning("Flashing Wireguard configs");

                self.flashWireguard(); //send mintTable to wireguard to set config
                console.log(`using new pulse group from genesis node: ${dump(self)}`);
            });
        });
    };

    measurertt = () => {
        for (var p in this.pulses) {
            const pulseEntry = this.pulses[p]; //do we need to check if this pulse still exists?

            const ip = mint2IP(pulseEntry.mint);
            const pingCmd = `(ping -c 1 -W 1 ${ip} 2>&1)`;
            child_process.exec(pingCmd, (error: child_process.ExecException | null, stdout: string, stderr: string) => {
                    //console.log("Ping "+pingCmd+" stdout="+stdout);
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
                            //console.log(`**** address: ${address} to see who replied... measurertt(): ${me.geo} - ${pulseEntry.geo} rtt = `+rtt);
                            //TODO: store in rttHistory, rttMedian
                            //console.log(`*******  mint=${mint} saving measure to record of pulseEntry.geo=${pulseEntry.geo}`);
                            pulseEntry.rtt = rtt;
                        } else {
                            //console.log(`******measurertt(): ${me.geo} - ${pulseEntry.geo} rtt = -99999`);
                            //clear in rttHistory, rttMedian
                            pulseEntry.rtt = NO_MEASURE;
                            //console.log(`*******clearing measure to record of pulseEntry.geo=${pulseEntry.geo}`);
                        }
                    }
                }
            );
        }
    };

    secureTrafficHandler = (callback: CallableFunction) => {
        var app = express();
        var self = this;
        var server = app.listen(80, mint2IP(this.mintTable[0].mint), function () {
            //TODO: add error handling here
            const serverAdddress = server.address();
            if (typeof serverAdddress !== "string" && serverAdddress !== null ) {
                var host = serverAdddress.address;
                //var port = serverAdddress.port;
                console.log(`DARP ENCRYPTED MESH Traffic handler listening at http://${host}:80`);
                console.log(`DARP ENCRYPTED MESH Traffic handler listening at http://${host}:80`);
                console.log(`DARP ENCRYPTED MESH Traffic handler listening at http://${host}:80`);
                console.log(`DARP ENCRYPTED MESH Traffic handler listening at http://${host}:80`);
                console.log(`DARP ENCRYPTED MESH Traffic handler listening at http://${host}:80`);
            } else {
                logger.error("Express app initialization failed");
                console.log(`FAILED DARP ENCRYPTED MESH Traffic handler listening`);
            }
        }).on('data', function(err,data) {
            console.log(`secureTrafficHandler(): got secure data ${err} ${data} on port 80`);
        }).on('error', function(err) {    
            console.log("Trying agin in 600 sec", err);
            setTimeout(self.secureTrafficHandler, 600*1000);
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
