"use strict";
/** @module pulsegroup Create Configuration for joining our pulseGroup object */
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
exports.__esModule = true;
var fs = require("fs");
var os = require("os");
var http = require("http");
var child_process_1 = require("child_process");
var express = require("express");
var lib_1 = require("./lib");
var logger_1 = require("./logger");
var types_1 = require("./types");
var grapher_1 = require("./grapher");
var wireguard_1 = require("./wireguard");
logger_1.logger.setLevel(logger_1.LogLevel.ERROR); //wbn-turn off extraneous for debugging
// Define constants
var PULSEFREQ = 1; // (in seconds) how often to send pulses
var MEASURE_RTT = false; //ping across wireguard interface
var FIND_EFFICIENCIES = true; //search for better paths through intermediaries
var WG_PULSEFREQ = 2; //send pings over wireguard mesh every other second
var SECURE_PORT = 65020;
var CHECK_SW_VERSION_CYCLE_TIME = 60; // CHECK SW updates every 15 seconds
var NO_MEASURE = -99999;
var DEFAULT_START_STATE = "QUARANTINE"; // "SINGLESTEP"; console.log(ts()+"EXPRESS: ALL NODES START IN SINGLESTEP (no pulsing) Mode");
logger_1.logger.info("pulsegroup: ALL NODES START IN " + DEFAULT_START_STATE + " Mode");
// const DEVIATION_THRESHOLD=20;  // Threshold to flag a matrix cell as "interesting", exceeding this percentage from median
// Define data structures used in the protocol
/** App configuration settings obtained from ENV variables */
var Config = /** @class */ (function () {
    function Config() {
        if (!process.env.DARPDIR) {
            logger_1.logger.warning("No DARPDIR environmental variable specified ");
            process.env.DARPDIR = process.env.HOME + "/darp";
            logger_1.logger.warning("DARPDIR defaulted to \" + " + process.env.DARPDIR);
        }
        this.DARPDIR = process.env.DARPDIR;
        var PORT = 65013;
        if (process.env.PORT) {
            PORT = parseInt(process.env.PORT);
        }
        logger_1.logger.info("Starting with PORT=" + PORT);
        this.PORT = PORT;
        var GENESISPORT = PORT;
        if (process.env.GENESISPORT) {
            GENESISPORT = parseInt(process.env.GENESISPORT); //Unless otherwise specified GENESIS PORT is same as user's port
            logger_1.logger.info("Setting GENESISPORT to " + GENESISPORT);
        }
        this.GENESISPORT = GENESISPORT;
        if (!process.env.HOSTNAME) {
            process.env.HOSTNAME = os.hostname().split(".")[0].toUpperCase();
            logger_1.logger.warning("No HOSTNAME environmental variable specified + " + process.env.HOSTNAME);
        }
        var HOSTNAME = process.env.HOSTNAME; //multiport - may want to tack port to name?
        if (PORT != 65013) {
            HOSTNAME += "@" + PORT;
        }
        this.HOSTNAME = HOSTNAME;
        if (!process.env.VERSION) {
            process.env.VERSION = fs.readFileSync("./SWVersion", { encoding: "utf8", flag: "r" }).trim();
            logger_1.logger.warning("No VERSION environmental variable specified - setting to " + process.env.VERSION);
        }
        this.VERSION = process.env.VERSION || "NoVersion";
        if (!process.env.MYIP) {
            logger_1.logger.warning("No MYIP environmental variable specified - GENESIS node will find IP from incoming message");
            process.env.MYIP = process.env.GENESIS; // MYIP();
        }
        else {
            process.env.MYIP = process.env.MYIP.replace(/['"]+/g, ""); //\trim string
        }
        this.IP = process.env.MYIP || "";
        //        if (!process.env.GENESIS) {
        //            logger.error(`No GENESIS environmental variable specified - EXITTING`);
        //            process.exit(86);
        //        }
        this.GENESIS = process.env.GENESIS || "";
        if (this.GENESIS == "") {
            console.log("Finding a GENESIS node to connect to");
            var genesisNodeList = process.env.GENESISNODELIST;
            console.log("I am " + this.IP + " genesisNodeList=" + genesisNodeList);
            if (genesisNodeList) {
                var genesisNodes = genesisNodeList.split(",");
                var isGenesisNode = false;
                //console.log(`Seaching for genesis node to use as genesis node`);
                for (var g in genesisNodes) {
                    //console.log(`checking ${genesisNodes[g]} against ${this.GENESIS}`);
                    if (genesisNodes[g] == this.IP) {
                        isGenesisNode = true;
                        //console.log(`GOT IT`);
                    }
                }
                if (!isGenesisNode) {
                    this.GENESIS = genesisNodes[Math.floor(Math.random() * genesisNodes.length)];
                    console.log("Setting random genesis node: " + this.GENESIS);
                }
                else {
                    console.log("WE ARE GENESIS NODE");
                    this.GENESIS = this.IP;
                }
            }
            else {
                console.log("pulseGroup(): We have no GENESISNODELIST ");
            }
        }
        var PUBLICKEY = process.env.PUBLICKEY || "noPublicKey";
        if (!PUBLICKEY) {
            try {
                PUBLICKEY = fs.readFileSync("../wireguard/publickey", "utf8");
                PUBLICKEY = PUBLICKEY.replace(/^\n|\n$/g, "");
                logger_1.logger.info("pulled PUBLICKEY from publickey file: >" + PUBLICKEY + "<");
            }
            catch (err) {
                logger_1.logger.warning("PUBLICKEY lookup failed");
                PUBLICKEY = "deadbeef00deadbeef00deadbeef0013";
            }
        }
        this.PUBLICKEY = PUBLICKEY;
        var GEO = HOSTNAME; //passed into docker
        GEO = GEO.toUpperCase().split(".")[0].split(":")[0].split(",")[0].split("+")[0]; //remove problem characters
        this.GEO = GEO;
        this.WALLET = process.env.WALLET || "auto";
    }
    return Config;
}());
exports.Config = Config;
/** Node configuraton details */
var MintEntry = /** @class */ (function () {
    function MintEntry(mint, geo, port, incomingIP, publickey, version, wallet) {
        this.mint = mint;
        this.geo = geo;
        this.port = port;
        this.ipaddr = incomingIP; //set by genesis node on connection
        this.publickey = publickey;
        this.state = DEFAULT_START_STATE;
        this.bootTimestamp = lib_1.now(); //RemoteClock on startup  ****
        this.version = version; //software version running on remote system ********
        this.wallet = wallet; // **
        this.lastPulseTimestamp = 0; //for timing out and validating lastOWL
        this.lastOWL = NO_MEASURE; //most recent OWL measurement
    }
    return MintEntry;
}());
exports.MintEntry = MintEntry;
/** Contains stats for and relevent fields to configure wireguard. */
var PulseEntry = /** @class */ (function () {
    function PulseEntry(mint, geo, group, ipaddr, port, version) {
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
        this.bootTimestamp = lib_1.now(); // RemoteClock on startup  **** - we abandon the pulse when this changes
        this.version = version; // software version running on sender's node
        this.inPulses = 0;
        this.outPulses = 0;
        this.pktDrops = 0;
        this.lastMsg = "";
        this.outgoingTimestamp = 0; // sender's timestamp on send
    }
    return PulseEntry;
}());
exports.PulseEntry = PulseEntry;
/** Main object containing all details about a group of nodes */
var PulseGroup = /** @class */ (function () {
    function PulseGroup(me, genesis, pulse) {
        var _a;
        this.groupName = me.geo + ".1";
        this.groupOwner = me.geo;
        this.mintTable = [me, genesis]; // simplification: me should always be mintTable[0], genesis node should always be mintTable[1]
        this.pulses = (_a = {},
            _a[genesis.geo + ":" + genesis.geo + ".1"] = pulse,
            _a); // store statistics for this network segment
        this.rc = "";
        this.ts = lib_1.now();
        this.nodeCount = 1; // how many nodes in this pulsegroup
        this.nextMint = 2; // assign IP. Allocate IP out of 10.10.0.<mint>
        this.cycleTime = PULSEFREQ; // pulseGroup-wide setting: number of seconds between pulses
        this.matrix = [];
        this.csvMatrix = [];
    }
    return PulseGroup;
}());
exports.PulseGroup = PulseGroup;
/** PulseGroup object with all necessary functions for sending and receiving pulses */
var AugmentedPulseGroup = /** @class */ (function () {
    function AugmentedPulseGroup(config, pulseGroup) {
        var _this = this;
        this.forEachNode = function (callback) {
            for (var node in _this.pulses)
                callback(node, _this.pulses[node]);
        };
        this.forEachMint = function (callback) {
            for (var mint in _this.mintTable)
                callback(mint, _this.mintTable[mint]);
        };
        this.flashWireguard = function () {
            logger_1.logger.info("flashWireguard()");
            var myStanza = "";
            var peerStanza = "";
            for (var m in _this.mintTable) {
                var mintEntry = _this.mintTable[m];
                if (mintEntry != null) {
                    if (m == "0")
                        myStanza = wireguard_1.addMyWGStanza(mintEntry.geo, mintEntry.ipaddr, mintEntry.port, mintEntry.mint, mintEntry.publickey);
                    else
                        peerStanza += wireguard_1.addPeerWGStanza(mintEntry.geo, mintEntry.ipaddr, mintEntry.port, mintEntry.mint, mintEntry.publickey);
                }
            }
            logger_1.logger.debug("flashWireguard(): myStanza=" + myStanza + " peerStanza=" + peerStanza); // create first dummy wireguard confiig file (only me)
            console.log("flashWireguard(): myStanza=" + myStanza + " peerStanza=" + peerStanza); // create first dummy wireguard confiig file (only me)
            wireguard_1.setWireguard(myStanza + "\n" + peerStanza);
        };
        //TODO: is this the only place that nodes are added?  I do it manually somewhere...?
        this.addNode = function (geo, group, ipaddr, port, publickey, version, wallet) {
            _this.deleteNode(ipaddr, port); // remove any preexisting entries with this ipaddr:port
            var newMint = _this.nextMint++; // get a new mint for new node
            _this.pulses[geo + ":" + group] = new PulseEntry(newMint, geo, group, ipaddr, port, _this.config.VERSION);
            var newNode = new MintEntry(newMint, geo, port, ipaddr, publickey, version, wallet);
            _this.mintTable[newMint] = newNode;
            // newPulseGroup.nodeCount++;
            logger_1.logger.warning("addNode(): added mintEntry and empty pulse entry " +
                lib_1.dump(newNode) +
                lib_1.dump(_this.pulses[geo + ":" + group]));
            console.log("addNode(): added mintEntry and empty pulse entry " +
                lib_1.dump(newNode) +
                lib_1.dump(_this.pulses[geo + ":" + group]));
            _this.nodeCount = Object.keys(_this.pulses).length;
            return _this.mintTable[newMint];
        };
        // Genesis node controls population - it can delete mintTable, pulse and owl for the mint
        this.deleteNode = function (ipaddr, port) {
            for (var m in _this.mintTable) {
                var mintEntry = _this.mintTable[m];
                if (mintEntry && m != "0" && m != "1") {
                    // ignore first mints me and genesis node - don't delete those
                    if (mintEntry.ipaddr == ipaddr && mintEntry.port == port) {
                        logger_1.logger.warning("deleteNode(): deleting mint " + mintEntry.mint);
                        console.log("deleteNode(): deleting mint " + mintEntry.mint);
                        delete _this.mintTable[mintEntry.mint];
                    }
                }
            }
            var deletedMint = -1;
            for (var pulseLabel in _this.pulses) {
                var pulseEntry = _this.pulses[pulseLabel];
                if (pulseEntry.ipaddr == ipaddr && pulseEntry.port == port) {
                    logger_1.logger.warning("deleteNode: deleting pulse " + pulseLabel);
                    console.log("deleteNode: deleting pulse " + pulseLabel);
                    deletedMint = pulseEntry.mint;
                    delete _this.pulses[pulseLabel];
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
            _this.nodeCount = Object.keys(_this.pulses).length;
        };
        // Build matrix of objects for each segment
        this.buildMatrix = function () {
            //return ;
            var matrix = [];
            for (var pulse in _this.pulses) {
                var pulseEntry = _this.pulses[pulse];
                if (lib_1.now() - pulseEntry.pulseTimestamp < 2 * PULSEFREQ * 1000) { //! miss 2 poll cycles
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
                    matrix[pulseEntry.mint][_this.mintTable[0].mint] = pulseEntry.owl; // pulse measured to me
                }
                else {
                    // old pulse - clear these entries
                    if (pulseEntry.pulseTimestamp != 0)
                        logger_1.logger.warning("buildMatrix(): " + pulseEntry.geo + " mint#" + pulseEntry.mint + " has an old pulseTimestamp " + pulseEntry.pulseTimestamp + ". TODO: Enter NO_OWL for all values to this node");
                    //it is possible that the node has not received a pulse yet - so value==0
                    // node did not respond - so we have no data - no entry, should we mark call all NO_OWL
                    // newPulseGroup.forEachNode(function(index:string,groupNode:PulseEntry) {
                    //    if ((index!="0") && (groupNode.mint!=nodeEntry.mint))
                    //        matrix[groupNode.mint][nodeEntry.mint]=NO_OWL;  //clear out previously published measurements
                    //});
                    // if (typeof newPulseGroup.mintTable[0].mint=="undefined")  return console.log("UNDEFINED MINT 0 - too early");
                    // console.log(`nodeEntry.mint=${nodeEntry.mint} mymint=${newPulseGroup.mintTable[0].mint}`);
                    if (typeof matrix[pulseEntry.mint] == "undefined") { //wbnwbnwbn-TODO: should
                        matrix[pulseEntry.mint] = []; //
                    } //
                    matrix[pulseEntry.mint][_this.mintTable[0].mint] = NO_MEASURE; // this guy missed his pulse - mark his entries empty
                }
            }
            // replace existing matrix
            _this.matrix = matrix;
        };
        // Send our OWL measurements to all in the pulseGroup
        // TODO: SECURITY - least privelege principle -
        //         DO NOT pulse nodes in Quarantine the same - only send OWLs and mints for you and new guys
        //         until they are out of quarantine
        //         and commnicating over secure MeshChannel
        //         then they get all nodes as needed to measure/communicate
        // TODO: pulse (measure OWLs) over secure channel - just change to private addr
        this.pulse = function () {
            var nodeList = [];
            var owls = "";
            //
            //  First make owls list to pulse and highlight segments that should be looked aty with a FLAG '@'
            //
            for (var pulse in _this.pulses) {
                var pulseEntry = _this.pulses[pulse];
                nodeList.push(new types_1.NodeAddress(pulseEntry.ipaddr, pulseEntry.port));
                nodeList.push(new types_1.NodeAddress(lib_1.mint2IP(pulseEntry.mint), SECURE_PORT)); // wbnwbn send to secure channel also
                pulseEntry.outPulses++;
                // this section flags "interesting" cells to click on and explore
                var flag = "";
                if (pulseEntry.owl == NO_MEASURE) {
                    owls += pulseEntry.mint + ",";
                }
                else {
                    var medianOfMeasures = lib_1.median(pulseEntry.history);
                    if (pulseEntry.medianHistory.length > 0 && pulseEntry.owl != 0) { //medianHistory will take a minute to get an entry
                        // use medianHistory to identify a median to deviate from
                        var medianOfMedians = lib_1.median(pulseEntry.medianHistory);
                        var deviation = Math.round((Math.abs(medianOfMedians - pulseEntry.owl) * 100) /
                            medianOfMedians);
                        var delta = Math.abs(medianOfMedians - pulseEntry.owl); //# ms different
                        //TURN ON TO DEBUG FLAGGING
                        //if (deviation!=0) 
                        if ((delta > 5) && (pulseEntry.owl > 3) && (deviation > 20)) { //flag if off by 20% from median saving more than 5ms
                            //console.log(`pulse(): geo=${pulseEntry.geo} pulseEntry.owl=${pulseEntry.owl} medianOfMeasures=${medianOfMeasures} medianOfMedians=${medianOfMedians} deviation=${deviation}% delta=${delta}`);
                            // flag if deviation is > 10ms - we can improve that
                            //console.log(ts()+`pulse(): Flagging ${pulseEntry.mint}-${this.mintTable[0].mint}=${pulseEntry.owl}  delta=${delta} geo=${pulseEntry.geo} --> ${this.config.GEO} nodeEntry.owl=${pulseEntry.owl}@ medianOfMeasures=${medianOfMeasures} medianOfMedians=${medianOfMedians} deviation=${deviation}%`);
                            logger_1.logger.info("pulse(): Flagging " + pulseEntry.mint + "-" + _this.mintTable[0].mint + "=" + pulseEntry.owl + "  delta=" + delta + " geo=" + pulseEntry.geo + " to " + _this.config.GEO + " nodeEntry.owl=" + pulseEntry.owl + "@ medianOfMeasures=" + medianOfMeasures + " medianOfMedians=" + medianOfMedians + " deviation=" + deviation + "%");
                            flag = "@";
                        }
                    }
                }
                if (pulseEntry.owl == NO_MEASURE) {
                    owls += pulseEntry.mint + ",";
                }
                else {
                    owls += pulseEntry.mint + "=" + pulseEntry.owl + flag + ",";
                }
            }
            owls = owls.replace(/,+$/, ""); // remove trailing comma
            var myEntry = _this.pulses[_this.config.GEO + ":" + _this.groupName];
            logger_1.logger.debug("pulse(): looking for my entry to pulse: " + _this.config.GEO + ":" + _this.groupName);
            if (myEntry == null) {
                logger_1.logger.warning("Cannot find " + _this.config.GEO + ":" + _this.groupName);
            }
            else {
                myEntry.seq++;
                var myMint = _this.mintTable[0].mint;
                var pulseMessage = "0," +
                    _this.config.VERSION + "," +
                    _this.config.GEO + "," +
                    _this.groupName + "," +
                    myEntry.seq + "," +
                    _this.mintTable[0].bootTimestamp + "," +
                    myMint + "," +
                    owls;
                logger_1.logger.debug("pulseGroup.pulse(): pulseMessage=" + pulseMessage + " to " + lib_1.dump(nodeList));
                // sendPulses(pulseMessage, ipary);  //INSTRUMENTATION POINT
                var nodelistMessage = new types_1.SenderMessage(types_1.SenderPayloadType.NodeList, nodeList);
                _this.sender.send(nodelistMessage);
                var outgoingMessage = new types_1.SenderMessage(types_1.SenderPayloadType.OutgoingMessage, pulseMessage);
                _this.sender.send(outgoingMessage);
            }
            _this.timeout(); // and timeout the non-responders
            if (_this.adminControl == "RESYNCH") {
                logger_1.logger.info("Resynching with genesis node...");
                _this.syncGenesisPulseGroup(); // fetch new config from genesis
                _this.adminControl = "";
            }
            // this.mintTable[0].state = "UP";
            _this.mintTable[0].lastPulseTimestamp = lib_1.now();
            var timeNow = _this.mintTable[0].lastPulseTimestamp; //
            var sleepTime = PULSEFREQ * 1000 - timeNow % 1000;
            // INSTRUMENTATION POINT shows load on node - DO NOT DELETE
            //console.log(`timeNow%1000=${timeNow%1000} sleeping ${sleepTime} ms`);
            //console.log(ts()+`** pulsing took=${now()%1000} ms since we started on second boundary`);
            setTimeout(_this.pulse, sleepTime); //pull back to on-second boundary
        };
        this.isGenesisNode = function () {
            return _this.mintTable[0].geo == _this.groupOwner;
        };
        // Two different timeouts
        // 1) update packetLoss counters and clear OWLs in pulseEntry
        // 2) remove nodes that timeout (Genesis manages group population)
        //    or non-genesis nodes remove the group when genesis node goes away for n=~15 seconds
        // All pulseTimes are assumed accurate to my local clock
        this.timeout = function () {
            console.log(lib_1.ts() + "timeout()");
            var startingPulseEntryCount = Object.keys(_this.pulses).length;
            //check all mintTable entries except GENESIS and self (mintTable[0])
            for (var m in _this.mintTable) {
                //            if ((m != "0") && m != "1" && this.mintTable[m] && this.mintTable[m].lastPulseTimestamp != 0) {
                console.log("timeout() processing " + lib_1.dump(_this.mintTable[m]));
            }
            ");\n            if ((m != \"0\") && this.mintTable[m] && this.mintTable[m].lastPulseTimestamp != 0) {\n                var elapsedMSincePulse = now() - this.mintTable[m].lastPulseTimestamp;\n\n                if (elapsedMSincePulse > 5*this.cycleTime * 1000) {  //after __ cycles no mintTable updates - remove\n                    console.log(";
            TINEOUT;
            EXCEEDED: elapsedMSincePulse = $;
            {
                elapsedMSincePulse;
            }
            mintTable = $;
            {
                _this.mintTable[m];
            }
            ");\n\n                    // timeout after  seconds\n                    logger.debug(";
            m = $;
            {
                m;
            }
            elapsedMSincePulse = $;
            {
                elapsedMSincePulse;
            }
            clearing;
            OWL in mint;
            entry;
            which;
            missed;
            at;
            least;
            one;
            cycle;
            $;
            {
                _this.mintTable[m].geo;
            }
            ");\n                    console.log(";
            m = $;
            {
                m;
            }
            elapsedMSincePulse = $;
            {
                elapsedMSincePulse;
            }
            clearing;
            OWL in mint;
            entry;
            which;
            missed;
            at;
            least;
            one;
            cycle;
            $;
            {
                _this.mintTable[m].geo;
            }
            ");\n\n                    this.mintTable[m].lastOWL = NO_MEASURE;  // we don't have a valid OWL\n                    if (this.mintTable[m].state != \"QUARANTINE\") {\n                        this.mintTable[m].state = \"NR\";  // we don't know this node's state\n                    }\n\n                    if (this.isGenesisNode()) {\n                        // Genesis only code path\n                        logger.debug(\"m=\" + m + \" I am genesis node not seeing him for elapsedMSincePulse=\" + elapsedMSincePulse);\n                        if (elapsedMSincePulse > 5 * this.cycleTime * 1000) {  //after 5 cycles\n                            // timeout node after 5 seconds\n                            logger.debug(";
            timeout();
            DELETE;
            geo = $;
            {
                _this.mintTable[m].geo;
            }
            mint = $;
            {
                _this.mintTable[m].mint;
            }
            NODE;
            with ($) {
                elapsedMSincePulse;
            }
            ms;
            old;
            timestamp(templateObject_1 || (templateObject_1 = __makeTemplateObject([");\n                            this.deleteNode(this.mintTable[m].ipaddr, this.mintTable[m].port);\n                        }\n                    } else {\n                        // not genesis - only can time out genesis\n                        var age = now() - this.mintTable[1].lastPulseTimestamp;\n                        console.log("], [");\n                            this.deleteNode(this.mintTable[m].ipaddr, this.mintTable[m].port);\n                        }\n                    } else {\n                        // not genesis - only can time out genesis\n                        var age = now() - this.mintTable[1].lastPulseTimestamp;\n                        console.log("])));
            have;
            not;
            heard;
            from;
            GENESIS;
            node in age;
            $;
            {
                age;
            }
            milliseconds(templateObject_2 || (templateObject_2 = __makeTemplateObject([");\n                        if (age > (10 * 1000)) {              //after 10 seconds we say genesis is gone\n                            logger.error("], [");\n                        if (age > (10 * 1000)) {              //after 10 seconds we say genesis is gone\n                            logger.error("])));
            timeout();
            Genesis;
            node;
            disappeared.age;
            of = $;
            {
                age;
            }
            ms;
            Exit, our;
            work;
            is;
            done.Exitting.newpulseGorup = $;
            {
                lib_1.dump(_this);
            }
            ");\n                            console.log(";
            have;
            not;
            heard;
            from;
            GENESIS;
            node in more;
            than;
            10;
            seconds - exitting(templateObject_3 || (templateObject_3 = __makeTemplateObject([");\n\n                            process.exit(36);\n                        }\n                        // if (elapsedMSincePulse > 60 * 1000 ) console.log(\"group owner has been unreachable for 1 minute: \"+elapsedMSincePulse);\n                    }\n                    // TODO: Nodes can be upgraded to \"BUSY\" if someone else has a measurement to it\n                } else {\n                    console.log("], [");\n\n                            process.exit(36);\n                        }\n                        // if (elapsedMSincePulse > 60 * 1000 ) console.log(\"group owner has been unreachable for 1 minute: \"+elapsedMSincePulse);\n                    }\n                    // TODO: Nodes can be upgraded to \"BUSY\" if someone else has a measurement to it\n                } else {\n                    console.log("])));
            Timeout;
            not;
            exceeded: elapsedMSincePulse = $;
            {
                elapsedMSincePulse;
            }
            mintTable = $;
            {
                _this.mintTable[m];
            }
            ");\n                    \n                }\n            }\n        }\n\n        for (var p in this.pulses) {\n            var pulseEntry = this.pulses[p];\n\n            if ((pulseEntry) && (pulseEntry.pulseTimestamp != 0) && (pulseEntry.mint != 1)) {\n                // don't timeout genesis pulse\n                var elapsedMSincePulse = now() - pulseEntry.pulseTimestamp;\n\n                if (elapsedMSincePulse > 2 * this.cycleTime * 1000) {\n                    //timeout after 2 seconds\n                    pulseEntry.owl = NO_MEASURE;\n                    pulseEntry.owls = \"1\";\n                    pulseEntry.pktDrops++;\n\n                    // only Genesis can delete inactive nodes within the group\n                    if (this.isGenesisNode()) {\n                        if (elapsedMSincePulse > 10 * this.cycleTime * 1000) {\n                            logger.warning(";
            timeout();
            Genesis;
            DELETING;
            Node;
            $;
            {
                _this.pulses[p].geo;
            }
            with ($) {
                elapsedMSincePulse;
            }
            ms;
            old;
            timestamp(templateObject_4 || (templateObject_4 = __makeTemplateObject([");\n                            console.log("], [");\n                            console.log("])));
            timeout();
            Genesis;
            DELETING;
            Node;
            $;
            {
                _this.pulses[p].geo;
            }
            with ($) {
                elapsedMSincePulse;
            }
            ms;
            old;
            timestamp(templateObject_5 || (templateObject_5 = __makeTemplateObject([");\n                            this.deleteNode(pulseEntry.ipaddr, pulseEntry.port);\n                            /*\n                            if (newPulseGroup.mintTable[pulseEntry.mint]==null) { //delete this.pulses[p];\n                                    logger.warning("], [");\n                            this.deleteNode(pulseEntry.ipaddr, pulseEntry.port);\n                            /*\n                            if (newPulseGroup.mintTable[pulseEntry.mint]==null) { //delete this.pulses[p];\n                                    logger.warning("])));
            DELETEING;
            pulse;
            $;
            {
                p;
            }
            ");  //log when timing out to debug\n                                    delete this.pulses[p];\n                                } else {\n                                    logger.warning(";
            will;
            delete pulse;
            when;
            mint;
            is;
            gone(templateObject_6 || (templateObject_6 = __makeTemplateObject([");\n                                }\n                            */\n                        }\n                    }\n                }\n            }\n        }\n\n        //\n        // if timeout changed the population, flashWireguard files\n        //\n        if (startingPulseEntryCount != Object.keys(this.pulses).length) {\n            logger.info("], [");\n                                }\n                            */\n                        }\n                    }\n                }\n            }\n        }\n\n        //\n        // if timeout changed the population, flashWireguard files\n        //\n        if (startingPulseEntryCount != Object.keys(this.pulses).length) {\n            logger.info("])));
            timeout();
            nodeC0unt;
            Changed;
            from;
            $;
            {
                startingPulseEntryCount;
            }
            setting;
            newPulseGroup.nodeCount = $;
            {
                _this.pulses.length;
            }
            ");\n            console.log(";
            timeout();
            nodeC0unt;
            Changed;
            from;
            $;
            {
                startingPulseEntryCount;
            }
            setting;
            newPulseGroup.nodeCount = $;
            {
                _this.pulses.length;
            }
            ");\n            this.flashWireguard();  //node list changed recreate wireguard file\n        }\n        this.nodeCount = Object.keys(this.pulses).length;\n        this.buildMatrix();    //goes way - eventually remove this - it is easy enough to search existing pulse OWLs with getOWLs.from()\n        \n        \n        if (this.isGenesisNode()) {     //save pulseGroup in JSON format in filesystem\n            const fs = require('fs');\n            let copy = JSON.parse(JSON.stringify(this));  //make a copy -//remove stuff - this file will be fetched and procesed by many\n                //TODO: loop through pulses remove history and medianHistory - really should move this to a separate object\n            for( var p in copy.pulses) {\n//                console.log(";
            trimming;
            history;
            from;
            record;
            pulse = $;
            {
                copy.pulses[p];
            }
            ");\n                delete copy.pulses[p].history;\n                delete copy.pulses[p].medianHistory;\n            }\n            delete copy.sender;\n            delete copy.receiver;\n            delete copy.config;                         \n\n            let strCopy=JSON.stringify(copy);           //and put it backj into lightweight JSON stringify format\n            let filename=this.config.IP+\".\"+this.config.PORT+'.json';\n            fs.writeFile(filename, strCopy, (err) => {\n                if (err) throw err;\n                //console.log(";
            pulse;
            group;
            object;
            stored in file;
            $;
            {
                filename;
            }
            asynchronously(templateObject_7 || (templateObject_7 = __makeTemplateObject([");\n            });\n        }\n\n        /*\n            var genesislist=process.env.GENESISNODELIST||\"\";\n            var genesisNodes=genesislist.split(\",\");\n            \n            console.log("], [");\n            });\n        }\n\n        /*\n            var genesislist=process.env.GENESISNODELIST||\"\";\n            var genesisNodes=genesislist.split(\",\");\n            \n            console.log("])));
            genesisNodes = $;
            {
                genesisNodes;
            }
            ");\n            for (var node in genesisNodes ) {\n                //console.log(";
            Here;
            we;
            would;
            UDP;
            pulse;
            our;
            matrix;
            to;
            every;
            other;
            genesis;
            node: $;
            {
                genesisNodes[node];
            }
            ");\n\n                //send UDP datagram of pulseGroupsObject\n                //wbnwbnwbn - here use raw send\n                var dgram = require('dgram');\n\n                var client = dgram.createSocket('udp4');\n                var matrixPulseMsg=JSON.stringify(this.mintTable);\n                //client.send(matrixPulseMsg, 0, matrixPulseMsg.length, 65013, genesisNodes[node]); //send matrix pulse to all other genesis nodes\n                console.log(ts()+";
            sent;
            matrix;
            pulse;
            to;
            $;
            {
                genesisNodes[node];
            }
            msg = $;
            {
                matrixPulseMsg;
            }
            ");\n            }\n            \n            //if (isGenesisNode) {\n            //    pullState from a Genesis Node[i]\n            //    \n            //}\n        }  /**/\n    };\n\n\n\n    //\n    //  @wbnwbnwbnwbn\n    //\n    getOWLfrom = (srcMint:number,owls:string) : number => {\n            var ary = owls.split(\",\");\n            for (var i = 0; i < ary.length; i++) {\n                var mint = parseInt(ary[i].split(\"=\")[0]);\n                if (mint == srcMint) {\n                    var owl = ary[i].split(\"=\")[1];\n                    if (typeof owl != \"undefined\" && owl != null) {\n                        // console.log(\"returning srcMint=\"+srcMint+\" owl=\"+owl);\n                        return parseInt(owl);\n                    } else {\n                        return NO_MEASURE; // no OWL measurement\n                    }\n                }\n            }\n            return NO_MEASURE; // did not find the srcMint\n    };\n    //\n    //  \n    //      Secret sauce - the measures are relative so skews are systematic and offset each other\n    //                  we only need to know if it is faster through intermediary\n    //  TODO: Strategy 2 - use matrix to quickly find OWLs, don't look up through owl table for all the cells\n    //\n    findEfficiencies = () => {      //run every second - compute intensive\n        if (!FIND_EFFICIENCIES) return;\n        const s=new Date(); const startTimestampFE=s.getTime();\n\n        for (var srcP in this.pulses) {\n            var srcEntry = this.pulses[srcP];\n            for (var destP in this.pulses) {\n                var destEntry = this.pulses[destP];     //this code is passed n-squared times!!!\n                if (typeof this.matrix[srcEntry.mint] != \"undefined\") {\n                    //console.log(";
            findEfficiencies();
            matrix = $;
            {
                lib_1.dump(_this.matrix[srcEntry.mint]);
            }
            $;
            {
                lib_1.dump(_this.matrix[destEntry.mint]);
            }
            $;
            {
                lib_1.dump(destEntry);
            }
            $;
            {
                lib_1.dump(srcEntry);
            }
            ");\n                    var direct = this.matrix[srcEntry.mint][destEntry.mint];  // \n                    //var direct = this.getOWLfrom(srcEntry.mint, destEntry.owls);  // ^^^^^get direct latency measure\n                    //console.log(ts()+\"findEfficiencies(): Here we would compare srcEntry.mint=\"+srcEntry.mint+\"-destEntry.mint=\"+destEntry.mint+\" direct=\"+direct);\n                    if (destEntry!=srcEntry && typeof direct != \"undefined\" ) {  //avoid self-self, direct owl has a value\n                        for (var iP in this.pulses) {\n                            var intermediaryEntry = this.pulses[iP];  //this code is passed n-cubed times\n                            //console.log(";
            intermediaryEntry.mint = $;
            {
                intermediaryEntry.mint;
            }
            ");\n                            if (intermediaryEntry != srcEntry && intermediaryEntry != destEntry) {\n                                var srcToIntermediary = this.matrix[srcEntry.mint][intermediaryEntry.mint];  //^^^^^ these lookups done n-cubed times\n                                \n                                //console.log(";
            srcToIntermediary = $;
            {
                srcToIntermediary;
            }
            ");\n                                if (typeof srcToIntermediary != \"undefined\" ) {\n                                //var srcToIntermediary = this.getOWLfrom(srcEntry.mint, intermediaryEntry.owls);  //^^^^^ these lookups done n-cubed times\n                                    var intermediaryToDest = this.matrix[intermediaryEntry.mint][destEntry.mint]; //^^^^^\n                                    //console.log(";
            intermediaryToDest = $;
            {
                intermediaryToDest;
            }
            ");\n                                    //var intermediaryToDest = this.getOWLfrom(intermediaryEntry.mint, destEntry.owls); //^^^^^\n                                    if (typeof srcToIntermediary != \"undefined\" && typeof intermediaryToDest != \"undefined\") {\n                                        //  We have a path to compare against the direct path\n                                        var intermediaryPathLatency = srcToIntermediary + intermediaryToDest;   //^^^^^^ possible better path through intermeidary\n                                        var delta=intermediaryPathLatency - direct;\n                                        //console.log(\"*  PATH       \"+srcEntry.geo+\"-\"+destEntry.geo+\"=\"+direct+\" through \"+intermediaryEntry.geo+\" intermediaryPathLatency=\"+intermediaryPathLatency+\" delta=\"+delta);\n                                        if (srcToIntermediary != NO_MEASURE && intermediaryToDest != NO_MEASURE && delta < -10) {\n                                            var dd=new Date();\n                                            //console.log(\"*  extraordinary PATH       \"+srcEntry.geo+\"-\"+destEntry.geo+\"=\"+direct+\" through \"+intermediaryEntry.geo+\" intermediaryPathLatency=\"+intermediaryPathLatency+\" delta=\"+delta);\n                                            // This overwrites existing entry, replacing timestamp\n                                            const pulseIndex:string=srcEntry.geo+\"-\"+destEntry.geo;\n                                            if (typeof this.extraordinaryPaths[pulseIndex] == \"undefined\") {\n                                                //console.log(\"New extraordinary path: \"+srcEntry.geo+\"-\"+destEntry.geo);\n                                                this.extraordinaryPaths[pulseIndex] = { startTimestamp:dd.getTime(), lastUpdated:dd.getTime(), aSide:srcEntry.geo, zSide:destEntry.geo, direct:direct, relayMint:intermediaryEntry.mint, intermediary:intermediaryEntry.geo, intermediaryPathLatency:intermediaryPathLatency, srcToIntermediary:srcToIntermediary, intermediaryToDest:intermediaryToDest, delta:delta };\n                                            } else {\n                                                //var startTimestamp=this.extraordinaryPaths[srcEntry.geo+\"-\"+destEntry.geo].startTimestamp;\n                                                //console.log(\"Existing startTimestamp=\"+startTimestamp);\n                                                this.extraordinaryPaths[pulseIndex] = { startTimestamp:this.extraordinaryPaths[pulseIndex].startTimestamp, lastUpdated:dd.getTime(), aSide:srcEntry.geo, zSide:destEntry.geo, direct:direct, relayMint:intermediaryEntry.mint, intermediary:intermediaryEntry.geo, intermediaryPathLatency:intermediaryPathLatency, srcToIntermediary:srcToIntermediary, intermediaryToDest:intermediaryToDest, delta:delta };\n                                            }\n                                            //console.log(";
            findEfficiencies();
            extraordinary;
            route: $;
            {
                lib_1.dump(_this.extraordinaryPaths[pulseIndex]);
            }
            ");\n                                        }\n                                        \n                                    }\n                                }\n                            }\n                        }\n                    }\n                }\n            }\n        }\n        //\n        //  remove extraordinarty path entries with old lastUpdated fields @wbnwbnwbnwbn\n        //\n        const d=new Date();const timeNow=d.getTime();\n        for (var e in this.extraordinaryPaths) {\n            var extraordinaryPath=this.extraordinaryPaths[e];\n            // console.log(\"extraordinaryPath: \"+JSON.stringify(extraordinaryPath,null,2));\n            var freshness=timeNow-extraordinaryPath.lastUpdated;\n            // console.log(\"freshness=\"+freshness);\n            if (freshness>2000) {\n                //console.log(";
            timeout();
            deleting;
            old;
            extraordoinary;
            path;
            $;
            {
                _this.extraordinaryPaths[e].aSide;
            }
            -$;
            {
                _this.extraordinaryPaths[e].zSide;
            }
            lasted;
            $;
            {
                duration;
            }
            ms(templateObject_8 || (templateObject_8 = __makeTemplateObject([");\n                delete this.extraordinaryPaths[e]; // delete extraordinary not extraordinary any more\n            } else {\n\n                var duration=timeNow-extraordinaryPath.startTimestamp;\n                if (duration>10000) {  //if a path lasts more than 10 seconds we assume worse path starts sending 100pkts/sec\n                    //  Simulate relaying 10 packets per second traffic\n                    //  credit relay, debit users\n                    // HACK: to demoinstrate math, assume that a better path DRAWS 100 pkts per second while available\n                    //BETTER ALGO needed here\n    //              console.log("], [");\n                delete this.extraordinaryPaths[e]; // delete extraordinary not extraordinary any more\n            } else {\n\n                var duration=timeNow-extraordinaryPath.startTimestamp;\n                if (duration>10000) {  //if a path lasts more than 10 seconds we assume worse path starts sending 100pkts/sec\n                    //  Simulate relaying 10 packets per second traffic\n                    //  credit relay, debit users\n                    // HACK: to demoinstrate math, assume that a better path DRAWS 100 pkts per second while available\n                    //BETTER ALGO needed here\n    //              console.log("])));
            HERE;
            WE;
            simulate;
            RElAYING;
            packets;
            on;
            behalf;
            of;
            others, so;
            assume;
            10 * 1500;
            bytes = 10;
            messages;
            and;
            15;
            KB;
            through;
            mint;
            $;
            {
                extraordinaryPath.relayMint;
            }
            $;
            {
                extraordinaryPath.aSide;
            }
            -$;
            {
                extraordinaryPath.intermediary;
            }
            ");\n                    if ((typeof this.pulses[extraordinaryPath.intermediary+':'+this.groupName] != \"undefined\" ) && \n                        (typeof this.pulses[extraordinaryPath.aSide+':'+this.groupName] != \"undefined\")) {\n                        this.pulses[extraordinaryPath.intermediary+':'+this.groupName].inPulses +=100;   //relay meas forwrd 10 pktys/sec\n                        this.pulses[extraordinaryPath.intermediary+':'+this.groupName].outPulses+=100;   //we assume those with better path, use it for 10 pkts\n                        this.pulses[extraordinaryPath.aSide+':'+this.groupName].inPulses -=100;   //relay meas forwrd 10 pktys/sec\n                        this.pulses[extraordinaryPath.aSide+':'+this.groupName].outPulses-=100;   //we assume those with better path, use it for 10 pkts\n                        // bump the in/outMsgs by 10 pkts\n                    } else {\n                        console.log(";
            findEfficiencies();
            _this.pulses[extraordinaryPath.intermediary + ':' + _this.groupName] = $;
            {
                _this.pulses[extraordinaryPath.intermediary + ':' + _this.groupName];
            }
            _this.pulses[extraordinaryPath.aSide + ':' + _this.groupName] = $;
            {
                _this.pulses[extraordinaryPath.aSide + ':' + _this.groupName];
            }
            ");\n                    }\n                }\n            }\n        }\n        //if (Object.keys(this.extraordinaryPaths).length>0) console.log(";
            findEfficiencies();
            $;
            {
                lib_1.dump(_this.extraordinaryPaths);
            }
            ");  //INSTRUMANTATION\n        this.mintTable[0].lastPulseTimestamp = timeNow;\n        var sleepTime=PULSEFREQ*1000-timeNow%1000+600; //let's run find efficiencies happens in last 400ms\n        //console.log(";
            Processing;
            findEfficiencies();
            took;
            $;
            {
                timeNow - startTimestampFE;
            }
            ms.Launching;
            findEfficiencies() in $;
            {
                sleepTime;
            }
            ms(templateObject_9 || (templateObject_9 = __makeTemplateObject([");\n        setTimeout(this.findEfficiencies,sleepTime);  //run again in a second\n    }\n\n    checkSWversion = () => {\n        console.log(ts()+"], [");\n        setTimeout(this.findEfficiencies,sleepTime);  //run again in a second\n    }\n\n    checkSWversion = () => {\n        console.log(ts()+"])));
            CheckSWVersion();
            ");\n        if (this.groupOwner == this.config.GEO) {\n            return logger.info(";
            Point;
            your;
            browser;
            to;
            Genesis;
            Node;
            for (instrumentation; ; )
                : http: ; //${this.mintTable[0].ipaddr}:${this.mintTable[0].port}`);
        };
        this.url = encodeURI("http://" + this.mintTable[1].ipaddr + ":" + this.mintTable[1].port + "/version?ts=" + lib_1.now() +
            "&x=" + (lib_1.now() % 2000)); //add garbage to avoid caches
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
        this.receiver = child_process_1.fork(config.DARPDIR + '/dist/receiver.js', [config.PORT.toString()]);
        this.receiver.on('exit', function (code) {
            logger_1.logger.warning("Receiver process exited with code " + code);
        });
        this.receiver.on('message', function (incomingMessage) {
            logger_1.logger.debug("AugmentedPulseGroup has received message from receiver: " + incomingMessage);
            _this.recvPulses(incomingMessage);
        });
        this.sender = child_process_1.fork(config.DARPDIR + '/dist/sender.js', [(PULSEFREQ * 1000).toString()]);
        this.sender.on('exit', function (code) {
            logger_1.logger.warning("Sender process exited with code " + code);
        });
        this.sender.on('message', function (message) {
            logger_1.logger.debug("AugmentedPulseGroup has received message from sender: " + message);
        });
    }
    AugmentedPulseGroup.prototype.get = function (url) { };
    return AugmentedPulseGroup;
}());
exports.AugmentedPulseGroup = AugmentedPulseGroup;
(function (res) {
    res.setEncoding("utf8");
    var body = "";
    res.on("data", function (data) {
        body += data;
    });
    res.on("error", function (error) {
        logger_1.logger.info("checkSWversion():: checkSWversion CAN'T REACH GENESIS NODE");
        // Error handling here never triggered TODO
    });
    res.on("end", function () {
        var genesisVersion = JSON.parse(body);
        var mySWversion = lib_1.MYVERSION(); // find the Build.*
        logger_1.logger.info("checkSWversion(): genesis SWversion==" + lib_1.dump(genesisVersion) + " MY SW Version=" + mySWversion + " me.version=" + _this.config.VERSION);
        if (genesisVersion != mySWversion) {
            // Software reload
            logger_1.logger.error("checkSWversion(): NEW SOFTWARE AVAILABLE - GroupOwner said " + genesisVersion + " we are running " + mySWversion + ". Process exitting");
            process.exit(36);
        }
    });
});
;
setTimeout(this.checkSWversion, CHECK_SW_VERSION_CYCLE_TIME * 1000); // Every 60 seconds check we have the best software
;
processIncomingPulse = function (incomingPulse) {
    // look up the pulse claimed mint
    var incomingPulseEntry = _this.pulses[incomingPulse.geo + ":" + incomingPulse.group];
    var incomingPulseMintEntry = _this.mintTable[incomingPulse.mint];
    if (incomingPulseEntry == null || incomingPulseMintEntry == null) {
        // show more specifics why pulse is ignored
        logger_1.logger.info("IGNORING " + incomingPulse.geo + ":" + incomingPulse.group + " - we do not have this pulse " + (incomingPulse.geo + ":" + incomingPulse.group) + " as a mint #" + incomingPulse.mint + " entry ");
        console.log("IGNORING " + incomingPulse.geo + ":" + incomingPulse.group + " - we do not have this pulse " + (incomingPulse.geo + ":" + incomingPulse.group) + " as a mint #" + incomingPulse.mint + " entry pulseEntry=" + incomingPulseEntry + " mintEntry=" + incomingPulseMintEntry);
        return;
    }
    // pulseGroup owner controls population - GROUP OWNER PULSE HANDLER
    if (_this.groupOwner === incomingPulseEntry.geo) { //Is this a groupOwner PULSE?
        //console.log(`**************************************************       Group Owner Pulse logic ....`);
        // group owner pulse here (SECURITY HOLE-more authentiction needed ip:port)
        if (_this.groupOwner != _this.mintTable[0].geo) { // use genesis nodes' incoming owls to manage population
            var owlsAry = incomingPulse.owls.split(",");
            // addNode/resynch with groupOwner if we don't have this mint, optimize would be fetch only mint we are missing
            for (var o in owlsAry) {
                var owlEntry = owlsAry[o];
                var mint = parseInt(owlEntry.split("=")[0]);
                var srcMintEntry = _this.mintTable[mint];
                //console.log(`owlEntry=${owlEntry} mint=${mint} srcMintEntry=${srcMintEntry}`);    //#1
                //console.log(`owlEntry=${owlEntry} mint=${mint} mintTable[mint]==${dump(self.mintTable[mint])}`);    //#2
                if (srcMintEntry == null) {
                    console.log("We do not have this mint and group Owner announced it: " + mint);
                    //we do not have this mint in our mintTale
                    logger_1.logger.info("Owner announced a  MINT " + mint + " we do not have - HACK: re-syncing with genesis node for new mintTable and pulses for its config");
                    console.log("Owner announced a  MINT " + mint + " we do not have - HACK: re-syncing with genesis node for new mintTable and pulses for its config");
                    _this.syncGenesisPulseGroup(); // HACK: any membership change we need resync
                    return;
                }
            }
            // find each pulse in the group owner announcement or delete/resync
            for (var pulse in _this.pulses) {
                var myPulseEntry = _this.pulses[pulse];
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
                    logger_1.logger.info("Owner no longer announces  MINT ENTRY " + myPulseEntry.mint + " - DELETING mintTable entry, pulseTable entry, and groupOwner owl");
                    console.log("Owner no longer announces  MINT ENTRY " + myPulseEntry.mint + " in owls (" + myPulseEntry.owls + ") - DELETING mintTable entry, pulseTable entry, and groupOwner owl");
                    _this.deleteNode(_this.mintTable[myPulseEntry.mint].ipaddr, _this.mintTable[myPulseEntry.mint].port);
                    return;
                }
            }
        }
        _this.mintTable[1].state = "UP"; //Genesis Node is UP
        //if (incomingPulseEntry.owls.match(/[0-9]*=[0-9]*/)myMint)) {  //if Genesis node is sending me my OWL, we are UP
        _this.mintTable[0].state = "UP"; // mark self as UP since we got a pulse from genesis node  - this should be when he sees his owl measurement in the announcement
        _this.mintTable[_this.mintTable[0].mint].state = "UP"; // mark self as UP since we got a pulse from genesis node
        //}
        //console.log(`processIncomingPulse(): Marking node UP`);
        //console.log(`GroupOwner Pulse processed - marked group Owner UP`);
    }
    else { //Message NOT from groupOwner.
        //console.log(`====================================================    NON-Group Owner Pulse logic ....`);
        if (_this.mintTable[0].mint == 1) { //Am I group owner?
            if (_this.mintTable[incomingPulseEntry.mint] != null) { //I am group owner, do I know this guy? 
                if (_this.mintTable[incomingPulseEntry.mint].state == "QUARANTINE") { //Can we help it out of Quarwtine?
                    console.log("Received a pulse from a node we labeled as QUARANTINED ... flash wireguard - we have a new node for everyone");
                    console.log("FLASHING WG group ower receiving pulse from non-genesis node " + lib_1.dump(incomingPulse));
                    _this.flashWireguard();
                    _this.mintTable[incomingPulseEntry.mint].state = "UP"; //Genesis is READY TO ACCEPT nodes
                }
            }
            else {
                //Node is not in QUARANTINE
            }
        }
        else {
            //console.log(`I am not group owner`);
        }
        // Pulse from ANYONE - we must be out of Quarantine
        if (_this.mintTable[0].state == "QUARANTINE") {
            logger_1.logger.info("Received non-genesis pulse - I am accepted in this pulse group - I must have transitioned out of Quarantine");
            console.log("Received non-genesis pulse - I am accepted in this pulse group - I must have transitioned out of Quarantine");
            _this.mintTable[0].state = "UP";
            _this.mintTable[_this.mintTable[0].mint].state = "UP"; // mark self as UP since we got a pulse from genesis node
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
        _this.ts = lib_1.now(); // we got a pulse - update the pulseGroup timestamp
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
        if (d.getSeconds() == 0 && incomingPulseEntry.history.length >= 60) { //no median until we have 60 samples
            incomingPulseEntry.medianHistory.push(Math.round(lib_1.median(incomingPulseEntry.history)));
            // store 60 samples
            if (incomingPulseEntry.medianHistory.length > 60 * 4) { //save only 4 hours worth of data for now
                incomingPulseEntry.medianHistory.shift(); // drop off the last samples
            }
        }
        // TODO: Also resync if the groupOwner has removed an item
        _this.storeOWL(incomingPulse.geo, _this.mintTable[0].geo, incomingPulse.mint); // store pulse latency To me
    }
    else {
        logger_1.logger.warning("Received pulse but could not find a matching pulseRecord for it. Ignoring until group owner sends us a new mintTable entry for: " + incomingPulse.geo);
        //newPulseGroup.fetchMintTable();  //this should be done only when group owner sends a pulse with mint we havn't seen
        //maybe also add empty pulse records for each that don't have a pulse record
    }
};
//called every 10ms to see if there are pkts to process
workerThread = function () {
    setTimeout(_this.workerThread, 100); // queue up incoming packets and come back again to batch process every 100 milliseconds
    if (_this.incomingPulseQueue.length == 0) {
        return;
    }
    for (var pulse = _this.incomingPulseQueue.pop(); pulse != null; pulse = _this.incomingPulseQueue.pop()) {
        _this.processIncomingPulse(pulse);
    }
};
//
//  recvPulses
//
recvPulses = function (incomingMessage) {
    // try {
    // const incomingPulse = await parsePulseMessage(incomingMessage)
    var ary = incomingMessage.split(",");
    var pulseTimestamp = parseInt(ary[0]);
    var senderTimestamp = parseInt(ary[1]);
    var OWL = pulseTimestamp - senderTimestamp;
    var owlsStart = lib_1.nth_occurrence(incomingMessage, ",", 9); //owls start after the 7th comma
    var pulseOwls = incomingMessage.substring(owlsStart + 1, incomingMessage.length);
    var incomingPulse = {
        pulseTimestamp: pulseTimestamp,
        outgoingTimestamp: senderTimestamp,
        msgType: ary[2],
        version: ary[3],
        geo: ary[4],
        group: ary[5],
        seq: parseInt(ary[6]),
        bootTimestamp: parseInt(ary[7]),
        mint: parseInt(ary[8]),
        owls: pulseOwls,
        owl: OWL,
        lastMsg: incomingMessage
    };
    _this.incomingPulseQueue.push(incomingPulse); //tmp patch to test
};
// Store one-way latencies to file or graphing & history
storeOWL = function (src, dst, srcMint) {
    var pulseLabel = src + ":" + _this.groupName;
    var pulseEntry = _this.pulses[pulseLabel];
    if (pulseEntry != null) {
        var strDataPoints = ""; // format: { label: "22:37:49", y: 10 }, we have no timestamps yet in this model
        for (var dp in pulseEntry.medianHistory) {
            strDataPoints += "{ label: \"median\", y: " + pulseEntry.medianHistory[dp] + " },";
        }
        for (var dp in pulseEntry.history) {
            strDataPoints += "{ label: \"current\", y: " + pulseEntry.history[dp] + " },";
        }
        grapher_1.grapherStoreOwls(src, dst, strDataPoints); // store OWL in a way the grapher can parse it
    }
};
// Sync this pulseGroup object with genesis node pulseGroup object: copy mint table and update (add/del) pulse entries so we match the genesis node
syncGenesisPulseGroup = function () {
    if (_this.isGenesisNode()) {
        console.log("syncGenesisPulseGroup(): GENESIS node does not sync with itself but will set Wireguard files");
        logger_1.logger.warning("syncGenesisPulseGroup(): GENESIS node does not sync with itself but will set Wireguard files");
        _this.flashWireguard(); // change my wg config
        return; // genesis node dies not fetch its own configuration
    }
    console.log("syncGenesisPulseGroup(): Non-GENESIS NODE SYNCHING!!!!");
    console.log("syncGenesisPulseGroup(): Non-GENESIS NODE SYNCHING!!!!");
    console.log("syncGenesisPulseGroup(): Non-GENESIS NODE SYNCHING!!!!");
    var url = encodeURI('http://' + _this.mintTable[1].ipaddr + ":" + _this.mintTable[1].port + "/pulsegroup/" + _this.groupName + "/" + _this.mintTable[0].mint);
    var url = encodeURI('http://' + _this.mintTable[1].ipaddr + ":" + _this.mintTable[1].port + "/pulsegroups/"); //@wbnwbnwbn
    console.log("pulseGroups=" + url);
    logger_1.logger.info("syncGenesisPulseGroup(): url=" + url);
    var self = _this;
    // Fetch mintTable and pulses from genesis node
    http.get(url, function (res) {
        res.setEncoding("utf8");
        var body = "";
        res.on("data", function (data) {
            body += data;
        });
        res.on("end", function () {
            var groupOwnerPulseGroup = JSON.parse(body);
            console.log("syncGenesisPulseGroup(): fetched new groupOwnerPulseGroup from genesis node: " + lib_1.dump(groupOwnerPulseGroup));
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
                    logger_1.logger.info("syncGenesisPulseGroup(): Adding new pulse entry as my own: " + pulse);
                    self.pulses[pulse] = pulses[pulse]; // save our new pulse entry
                }
            }
            for (var pulse in self.pulses) {
                // Delete all node we have that the group owner does not
                if (typeof pulses[pulse] == "undefined") {
                    logger_1.logger.info("syncGenesisPulseGroup(): Removing pulse entry that genesis node does not have: " + pulse);
                    delete self.pulses[pulse]; //delete this pulse we have but groupOwner does not have
                }
            }
            self.nodeCount = Object.keys(self.pulses).length;
            logger_1.logger.warning("Flashing Wireguard configs");
            self.flashWireguard(); //send mintTable to wireguard to set config
        });
    });
};
measurertt = function () {
    if (!MEASURE_RTT)
        return; // can not spin up 1 ping process per node per second
    console.log("measurertt()");
    var _loop_1 = function () {
        var pulseEntry = _this.pulses[p]; //do we need to check if this pulse still exists?
        //TODO: This code should not launch upto 150 ping processes per second - needs to be a simple ping daemon in "C"
        var ip = lib_1.mint2IP(pulseEntry.mint);
        var pingCmd = "(ping -c 1 -W 1 " + ip + " 2>&1)";
        child_process_1.exec(pingCmd, function (error, stdout, stderr) {
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
                }
                else {
                    //console.log(`******measurertt(): ${pulseEntry.geo} rtt = -99999`);
                    //clear in rttHistory, rttMedian
                    pulseEntry.rtt = NO_MEASURE;
                    //console.log(`*******clearing measure to record of pulseEntry.geo=${pulseEntry.geo}`);
                }
            }
        });
    };
    for (var p in _this.pulses) {
        _loop_1();
    }
};
//
//  this is where the messgaes over secure qireguard mesh is handled - not working yet
//
secureTrafficHandler = function (callback) {
    var app = express();
    var self = _this;
    //        var server = app.listen(SECURE_PORT, mint2IP(this.mintTable[0].mint), function () {
    var server = app.listen(SECURE_PORT, '0.0.0.0', function () {
        //TODO: add error handling here
        var serverAdddress = server.address();
        if (typeof serverAdddress !== "string" && serverAdddress !== null) {
            var host = serverAdddress.address;
            //var port = serverAdddress.port;
            console.log("DARP ENCRYPTED MESH Traffic handler listening at http://" + host + ":" + SECURE_PORT);
        }
        else {
            logger_1.logger.error("Express app initialization failed");
            console.log("FAILED DARP ENCRYPTED MESH Traffic handler listening");
        }
    }).on('data', function (err, data) {
        console.log("secureTrafficHandler(): got secure data " + err + " " + data + " on port " + SECURE_PORT);
    }).on('error', function (err) {
        console.log("Trying agin in 10 sec", err);
        setTimeout(self.secureTrafficHandler, 10 * 1000);
    });
};
/**
 * Initiates construction of the pulsegroup object by sneding the request to the genesis node
 * @param {Config} config contains constants and environmental variables, such as ip and port
 */
exports.getPulseGroup = function (config) { return __awaiter(void 0, void 0, void 0, function () {
    var configurl, pulseGroupObjectURL;
    return __generator(this, function (_a) {
        configurl = "http://" + config.GENESIS + ":" + config.GENESISPORT +
            "/nodefactory?geo=" + config.GEO +
            "&port=" + config.PORT +
            "&publickey=" + config.PUBLICKEY +
            "&genesisport=" + config.GENESISPORT +
            "&version=" + config.VERSION +
            "&wallet=" + config.WALLET +
            "&myip=" + config.IP +
            "&ts=" + lib_1.now();
        pulseGroupObjectURL = encodeURI(configurl);
        logger_1.logger.info("getPulseGroup(): getting pulseGroup from url=" + pulseGroupObjectURL);
        return [2 /*return*/, new Promise(function (resolve, reject) {
                var req = http.get(pulseGroupObjectURL, function (res) {
                    if (res.statusCode != 200) {
                        return reject(new Error("getPulseGroup(): received status code " + res.statusCode));
                    }
                    var data = "";
                    res.on("data", function (stream) {
                        data += stream;
                    });
                    res.on("error", function () {
                        return reject(new Error("getPulseGroup(): received error from " + pulseGroupObjectURL));
                    });
                    res.on("end", function () {
                        var newPulseGroup = JSON.parse(data);
                        logger_1.logger.info("getPulseGroup(): from node factory: " + lib_1.dump(newPulseGroup));
                        if (newPulseGroup.mintTable[1].publickey == config.PUBLICKEY) {
                            logger_1.logger.info("getPulseGroup(): My publickey matches genesis node public key - I am genesis node : GENESIS node already configured.");
                        }
                        else {
                            logger_1.logger.info("getPulseGroup(): Configuring non-genesis node ...");
                        }
                        return resolve(newPulseGroup);
                    });
                });
                req.end();
            })];
    });
}); };
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7, templateObject_8, templateObject_9;
