"use strict";
exports.__esModule = true;
//
//  config.ts - initialize the redis database
//
//  me - my internal state and pointer to genesis
//
var lib_1 = require("../lib/lib");
var http = require('http');
module.exports.me = {
    "geo": "",
    "port": 65013,
    "ipaddr": "",
    "publickey": "",
    "mint": "",
    "bootTime": lib_1.now(),
    "group": "",
    "pulseGroups": "",
    "genesis": ""
};
var pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client
redisClient.flushall();
//
//  get the necessary genesis data to join the genesis group
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
                var HOST = process.env.HOSTNAME || "noName";
                var PORT = process.env.PORT || "65013";
                var PUBLICKEY = process.env.PUBLICKEY || "";
                var GENESIS = entry.ipaddr + ":" + entry.port + ":" + entry.publickey + ":" + entry.geo + ":" + entry.geo + '.1' + ":";
                redisClient.hmset("me", {
                    "geo": HOST,
                    "port": PORT,
                    "ipaddr": "",
                    "publickey": PUBLICKEY,
                    "mint": "",
                    "bootTime": "0",
                    "group": entry.group,
                    "pulseGroups": entry.group,
                    "genesis": GENESIS,
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
                redisClient.hmset("genesis", {
                    "geo": entry.geo,
                    "port": entry.port,
                    "ipaddr": entry.ipaddr,
                    "publickey": entry.publickey,
                    "mint": entry.mint,
                    "bootTime": entry.bootTime,
                    "group": entry.group,
                    "pulseGroups": entry.group,
                    "genesis": GENESIS,
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
                // get the config from the genesis node
                var req = http.get("http://" + entry.ipaddr + ":" + entry.port + "/config/", function (res) {
                    var data = '', json_data;
                    res.on('data', function (stream) {
                        data += stream;
                    });
                    res.on('end', function () {
                        var json = JSON.parse(data);
                        console.log("genesis told us :" + JSON.stringify(json, null, 2));
                        return null; //no answer - we have no genesis node IP
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
var GEO = process.env.HOSTNAME || require('os').hostname();
var PUBLICKEY = process.env.PUBLICKEY || "";
var WALLET = process.env.WALLET || "584e560b06717ae0d76b8067d68a2ffd34d7a390f2b2888f83bc9d15462c04b2";
GEO = GEO.split(".");
if (PUBLICKEY == "")
    Usage();
setME();
console.log("config DONE");
function Usage() {
    console.log("usage: node config publickey [geo]");
    process.exit(127);
}
//module.exports = { me }
