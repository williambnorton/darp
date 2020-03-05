"use strict";
exports.__esModule = true;
//
//  config.ts - initialize the redis database
//
//  me - my internal state and pointer to genesis
//
var lib_1 = require("../lib/lib");
var http = require('http');
exports.gME = {
    //look to redis for things that don't change
    "geo": "",
    "port": "",
    "ipaddr": "",
    "publickey": "",
    "mint": "",
    "bootTime": "",
    "group": "",
    "pulseGroups": "",
    "wallet": "",
    //genesis connection info
    "genesisIP": "",
    "genesisPort": "",
    "genesisPublickey": "" //shared with us during config
};
var pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client
redisClient.flushall();
//console.log("env="+JSON.stringify(process.env,null,2));
var GEO = process.env.HOSTNAME || "DEVOPS";
var PORT = process.env.PORT || "65013";
var PUBLICKEY = process.env.PUBLICKEY || "";
var WALLET = process.env.WALLET || "584e560b06717ae0d76b8067d68a2ffd34d7a390f2b2888f83bc9d15462c04b2";
//GEO=GEO.toString().split('.').split(',');
console.log("CONFIG starting with GEO=" + GEO + " publickey=" + PUBLICKEY + " WALLET=" + WALLET + "");
exports.gME.bootTime = "" + lib_1.now();
exports.gME.geo = GEO;
exports.gME.publickey = PUBLICKEY;
exports.gME.port = PORT;
exports.gME.wallet = WALLET;
if (PUBLICKEY == "")
    Usage();
setME(); //later this should start with just an IP of genesis node 
//
//  get the genesis node and request config from it
//
function setME() {
    var req = http.get("http://drpeering.com/seglist1.json", function (res) {
        var data = '', json_data;
        res.on('data', function (stream) {
            data += stream;
        });
        res.on('end', function () {
            var json = JSON.parse(data);
            //console.log("getGenesisIP(): json="+JSON.stringify(json,null,2));
            for (var SR in json) {
                var entry = json[SR];
                //                var HOST=process.env.HOSTNAME||"noName";
                //                var PORT=process.env.PORT||"65013";
                //                var PUBLICKEY=process.env.PUBLICKEY||"";
                //                var GENESIS=entry.ipaddr+":"+entry.port+":"+entry.publickey+":"+entry.geo+":"+entry.geo+'.1'+":";
                //create my "me" record
                /***
                redisClient.hmset("me", {
                    "geo" : GEO,
                    "port" : PORT,
                    "ipaddr" : "",   //set by genesis node on connection
                    "publickey" : PUBLICKEY,
                    "mint": "",      //set by genesis node
                    "bootTime": "0",
                    "group": entry.group,
                    "pulseGroups" : entry.group,  //list of groups I will pulse
                    //my genesis
                    "genesisIP" : entry.ipaddr,
                    "genesisPort" : entry.port,
                    "genesisPublickey" : entry.publickey,
                    //statistics
                    "lastSeq": "0",
                    "pulseTimestamp": "0",
                    "inOctets": "0",
                    "outOctets": "0",
                    "inMsgs": "0",
                    "outMsgs": "0",
                    "owl": "0",
                    "pktDrops": "0",
                    "remoteState": "0"
                });
                ****/
                redisClient.hmset("genesis", {
                    "geo": entry.geo,
                    "port": entry.port,
                    "ipaddr": entry.ipaddr,
                    "publickey": entry.publickey,
                    "mint": entry.mint,
                    "bootTime": entry.bootTime,
                    "group": entry.group,
                    "pulseGroups": entry.group,
                    //
                    "genesisIP": entry.ipaddr,
                    "genesisPort": entry.port,
                    "genesisPublickey": entry.publickey,
                    //
                    "lastSeq": entry.lastSeq,
                    "pulseTimestamp": entry.pulseTimestamp,
                    "inOctets": entry.inOctets,
                    "outOctets": entry.outOctets,
                    "inMsgs": entry.inMsgs,
                    "outMsgs": entry.outMsgs,
                    "owl": entry.owl,
                    "pktDrops": entry.pktDrops,
                    "remoteState": entry.remoteState
                });
                // get my config from the genesis node
                var req = http.get("http://" + entry.ipaddr + ":" + entry.port + "/config?geo=" + GEO + "&port=" + PORT + "&publickey=" + PUBLICKEY, function (res) {
                    var data = '', json_data;
                    res.on('data', function (stream) {
                        data += stream;
                    });
                    res.on('end', function () {
                        var json = JSON.parse(data);
                        exports.gME = json; //set my global variable  for convenuience
                        console.log("setting redis && gME with what genesis told us we are:" + JSON.stringify(json, null, 2));
                        redisClient.hmset("me", json); //my assigned identify
                        //and starting pulseGroup
                        // if 
                        return null; //done
                    });
                });
                req.on('error', function (e) {
                    console.log(e.message);
                });
                return;
            }
        });
    });
    req.on('error', function (e) {
        console.log(e.message);
    });
}
function Usage() {
    console.log("usage: node config publickey [geo]");
    process.exit(127);
}
//module.exports = { me }
