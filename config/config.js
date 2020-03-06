"use strict";
exports.__esModule = true;
//
//  config.ts - initialize the redis database
//
//  me - my internal state and pointer to genesis
//
var lib_1 = require("../lib/lib");
var http = require('http');
var pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client
redisClient.flushall();
//console.log("env="+JSON.stringify(process.env,null,2));
var GEO = process.env.HOSTNAME || "DEVOPS";
var PORT = process.env.PORT || "65013";
var PUBLICKEY = process.env.PUBLICKEY || "";
var WALLET = process.env.WALLET || "584e560b06717ae0d76b8067d68a2ffd34d7a390f2b2888f83bc9d15462c04b2";
//GEO=GEO.toString().split('.').split(',');
console.log("CONFIG starting with GEO=" + GEO + " publickey=" + PUBLICKEY + " PORT=" + PORT + " WALLET=" + WALLET + "");
redisClient.hmset("me", {
    "geo": GEO,
    "port": PORT,
    "publickey": PUBLICKEY,
    "bootTime": "" + lib_1.now(),
    //genesis connection info
    "genesisIP": "104.42.192.234",
    "genesisPort": "65013",
    "wallet": WALLET
});
redisClient.hmset("genesis", {
    "port": "65013",
    "ipaddr": "104.42.192.234" //set by genesis node on connection
});
//if (PUBLICKEY=="") Usage();
setMe(); //later this should start with just an IP of genesis node 
function setMe() {
    redisClient.hgetall("genesis", function (err, genesis) {
        console.log("setMeIP(): genesis=" + lib_1.dump(genesis));
        var URL = "http://" + genesis.ipaddr + ":" + genesis.port + "/nodefactory?geo=" + GEO + "&port=" + PORT + "&publickey=" + PUBLICKEY + "&wallet=" + WALLET;
        console.log("Fetching URL for config: " + URL);
        //FETCH CONFIG
        var req = http.get(URL, function (res) {
            var data = '', json_data;
            res.on('data', function (stream) {
                data += stream;
            });
            res.on('end', function () {
                console.log("CONFIG data=" + data);
                var json = JSON.parse(data);
                //gME=json;  //set my global variable  for convenuience
                //console.log("CONFIG setMeIP(): setting redis && gME with what genesis told us we are:"+JSON.stringify(json,null,2));
                //var me=JSON.parse(json);
                redisClient.hmset("me", json);
                console.log("CONFIG setMeIP(): setting identity:" + JSON.stringify(json, null, 2));
                redisClient.hgetall("me", function (err, me) {
                    if (err)
                        console.log("CONFIG ERROR");
                    else {
                        console.log("ME **********" + lib_1.dump(me));
                        var ary = me.pulseGroups.split(",");
                        for (var group in ary) {
                            console.log("group=" + group + " ary[]=" + ary[group]);
                            //create me.geo:me.pulseGroups
                            var groupEntryName = me.geo + ":" + ary[group];
                            console.log("setMe() creating " + groupEntryName);
                            redisClient.hmset(groupEntryName, json);
                        }
                    }
                });
            });
        });
    });
}
function Usage() {
    console.log("usage: node config publickey [geo]");
    process.exit(127);
}
