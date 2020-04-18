"use strict";
exports.__esModule = true;
//
//  config.ts - initialize the redis database with envirnmental variables:
//          HOSTNAME - human readable text name
//          GENESIS - IPaddr or ipaddr:port
//          PUBLICKEY - Public key 
//
var lib_js_1 = require("../lib/lib.js");
//if (! process.env.HOSTNAME || ! process.env.GENESIS || ! process.env.PUBLICKEY) {
if (!process.env.HOSTNAME) {
    console.log("No HOSTNAME enviropnmental variable specified ");
    process.env.HOSTNAME = require('os').hostname();
    console.log("setting HOSTNAME to " + process.env.HOSTNAME);
}
if (!process.env.GENESIS) {
    console.log("No GENESIS enviropnmental variable specified - setting DEFAULT GENESIS and PORT");
    process.env.GENESIS = "71.202.2.184";
    process.env.PORT = "65013";
}
if (!process.env.PORT) {
    console.log("No PORT enviropnmental variable specified - setting DEFAULT GENESIS PORT");
    process.env.PORT = "65013";
}
if (!process.env.VERSION) {
    console.log("No VERSION enviropnmental variable specified - setting to noVersion");
    process.env.VERSION = "noVersion";
}
if (!process.env.MYIP) {
    console.log("No MYIP enviropnmental variable specified ");
    process.env.MYIP = "noMYIP";
}
//import { getUnpackedSettings } from "http2";
//import { Z_VERSION_ERROR } from "zlib";
var http = require('http');
var pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client
redisClient.flushall(); //clean slate
//console.log("env="+JSON.stringify(process.env,null,2));
var GEO = process.env.HOSTNAME; //passed into docker
GEO = GEO.toUpperCase().split(".")[0].split(":")[0].split(",")[0].split("+")[0];
var PORT = process.env.PORT || "65013"; //passed into docker
var PUBLICKEY = process.env.PUBLICKEY;
if (!PUBLICKEY)
    try {
        PUBLICKEY = require('fs').readFileSync('../wireguard/publickey', 'utf8');
        PUBLICKEY = PUBLICKEY.replace(/^\n|\n$/g, '');
        console.log("pulled PUBLICKEY from publickey file: >" + PUBLICKEY + "<");
    }
    catch (err) {
        console.log("PUBLICKEY lookup failed");
        PUBLICKEY = "deadbeef00deadbeef00deadbeef0012";
    }
var WALLET = process.env.WALLET || "584e560b06717ae0d76b8067d68a2ffd34d7a390f2b2888f83bc9d15462c04b2";
//GEO=GEO.toString().split('.').split(',');
console.log("CONFIG GENESIS=" + process.env.GENESIS + " PORT=" + process.env.PORT + " HOSTNAME=" + process.env.HOSTNAME + " VERSION=" + process.env.VERSION + " MYIP=" + process.env.MYIP);
console.log("CONFIG starting with GEO=" + GEO + " publickey=" + PUBLICKEY + " PORT=" + PORT + " WALLET=" + WALLET + "");
//  mint:0 is me  and  mint:1 is Genesis node 
redisClient.hmset("mint:0", {
    "mint": "0",
    "geo": GEO,
    "group": GEO + ".1",
    // wireguard configuration details
    "port": "" + PORT,
    "ipaddr": process.env.MYIP,
    "publickey": PUBLICKEY,
    //
    "bootTime": "" + lib_js_1.now(),
    "version": process.env.VERSION,
    "wallet": WALLET,
    "owl": "" //how long it took this node's last record to reach me
});
getConfiguration(); //later this should start with just an IP of genesis node 
process.on('uncaughtException', function (err) {
    console.log("uncaughtException trap: " + err);
});
function getConfiguration() {
    var URL = "http://" + process.env.GENESIS + ":" + "65013" + "/nodefactory?geo=" + GEO + "&port=" + PORT + "&publickey=" + PUBLICKEY + "&version=" + process.env.VERSION + "&wallet=" + WALLET + "&myip=" + process.env.MYIP + "&ts=" + lib_js_1.now();
    console.log("CONFIG: getConfiguration()  Fetching URL for config: " + URL);
    //FETCH CONFIG
    var req = http.get(URL, function (res) {
        var data = '', json_data;
        res.on('data', function (stream) {
            data += stream;
        });
        res.on('error', function () {
            console.log(lib_js_1.ts() + "CONFIG: received error from " + URL);
            console.log(lib_js_1.ts() + "CONFIG: received error from " + URL);
            console.log(lib_js_1.ts() + "CONFIG: received error from " + URL);
        });
        res.on('end', function () {
            console.log("CONFIG data=" + data);
            var config = JSON.parse(data);
            console.log("CONFIG(): rc=" + config.rc);
            console.log("CONFIG(): rc=" + config.rc);
            console.log("CONFIG(): rc=" + config.rc);
            console.log("CONFIG(): rc=" + config.rc);
            console.log("CONFIG(): rc=" + config.rc);
            //gME=json;  //set my global variable  for convenience
            console.log("CONFIG from node factory:" + JSON.stringify(config, null, 2));
            if (config.node == "GENESIS") {
                console.log(" GENESIS NODE Instantiated itself");
                redisClient.hset("mint:0", "state", "RUNNING");
                redisClient.hset("mint:0", "isGenesisNode", "1");
            }
            else {
                console.log(" ------------------------ " + GEO + " ---------NON-Genesis configuration");
                console.log("CONFIG(): json=" + lib_js_1.dump(config));
                console.log("setting gSRlist=" + lib_js_1.dump(config.gSRlist));
                redisClient.hmset("gSRlist", config.gSRlist);
                //install config
                for (var mint in config.mintTable) {
                    var mintEntry = config.mintTable[mint];
                    console.log("add mint:" + mint + " mintEntry=" + lib_js_1.dump(mintEntry));
                    redisClient.hmset(mint, mintEntry);
                }
                for (var pulse in config.pulses) {
                    var pulseEntry = config.pulses[pulse];
                    //if (pulseEntry.geo==GEO) { //is this us? Provide a started OWL
                    //    pulseEntry.owl=now()-pulseEntry.bootTime;
                    //    console.log("CONFIG() Set OWL="+pulseEntry.owl+" pulseEntry.bootTime="+pulseEntry.bootTime);
                    //}  NOT ONE WAY MEASURE - DOES NOT BELONG HERE
                    console.log("add pulse:" + pulse + " pulseEntry=" + lib_js_1.dump(pulseEntry));
                    redisClient.hmset(pulse, pulseEntry);
                    if (pulseEntry.geo == pulseEntry.group.split(".")[0]) {
                        //GENESIS NODE RECORD
                        //redisClient.expire(pulse,2)  //expire groupOwner record after 2 minutes
                        //by removing this entry, the owls don't exist, noone will get pulsed
                    }
                    else {
                        //redisClient.expire(pulse,5)  //expire groupOwner record after 2 minutes
                    }
                    redisClient.publish("members", "ADDED " + pulseEntry.geo);
                }
                //    console.log("genesis done "+json.newSegmentEntry.geo+  ":"+json.newSegmentEntry.group ,   json.newSegmentEntry );
                //    redisClient.hmset( json.newSegmentEntry.geo+  ":"+json.newSegmentEntry.group ,   json.newSegmentEntry );    
                console.log("newSegment done");
            }
        });
    });
}
function Usage() {
    console.log("usage: node config publickey [geo]");
    process.exit(127);
}
