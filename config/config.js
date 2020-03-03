"use strict";
exports.__esModule = true;
//
//  config.ts - initialize the redis database
//
//  me - my internal state and pointer to genesis
//
var lib_1 = require("../lib/lib");
var pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client
redisClient.flushall();
//
//  get the necessary genesis data to join the genesis group
//
var http = require('http');
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
                    "bootTime": lib_1.now(),
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
                        console.log("json=" + JSON.stringify(json, null, 2));
                        for (var SR in json) {
                            var entry = json[SR];
                            //console.log("getGenesisIP(): returning "+entry.ipaddr);
                            //return entry.ipaddr; //+":"+entry.port;
                            console.log("SR=" + SR + " entry=" + JSON.stringify(entry, null, 2));
                            // will output a Javascript object
                            //var NoiaSWHash=json
                            //console.log("NoiaSWHash="+NoiaSWHash+" mySR.NoiaSWHash="+mySR.NoiaSWHash);
                        }
                        return null; //no answer - we have no genesis node IP
                    });
                });
                req.on('error', function (e) {
                    console.log(e.message);
                });
                /****
                                redisClient.hgetall('me', function (err, me) {
                                    if (err) {
                                        console.log("CONFIG ERROR");
                                    } else {
                                        console.log('me='+dump(me));
                                    }
                                    //pull down config from the genesis Node, even if it s me.
                                    console.log("1) Fetch codenconfig from genesis to set my external ipaddr and port");
                                    console.log("2) ");
                                });
                                ***/
                return;
            }
        });
    });
    req.on('error', function (e) {
        console.log(e.message);
    });
}
setME();
console.log("config DONE");
