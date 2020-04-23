"use strict";
exports.__esModule = true;
//
//  config.ts - Configure your node to connect to the pulseGroup
//
var lib_js_1 = require("../lib/lib.js");
var http = require('http');
//      Configuration parameters - agreed to by all in the pulseGroup
console.log("Starting CONFIG GENESIS=" + process.env.GENESIS + " PORT=" + process.env.PORT + " HOSTNAME=" + process.env.HOSTNAME + " VERSION=" + process.env.VERSION + " MYIP=" + process.env.MYIP);
var pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client
/*
process.on('uncaughtException', function (err) {
    console.log("CONFIG: uncaughtException trap: "+err);
});
*/
redisClient.hgetall("mint:0", function (err, me) {
    console.log("CONFIG starting with me=" + lib_js_1.dump(me));
    if (me != null)
        var MYPUBLICKEY = me.publickey;
    else {
        console.log(lib_js_1.ts() + "CONFIG NO REDIS");
        process.exit(36);
    }
});
//  me - my internal state and pointer to genesis
//
/***
var PUBLICKEY=process.env.PUBLICKEY;
redisClient.hgetall("mint:0", function(err,me) {
    console.log(ts()+"CONFIG: WEIRD ENV PUBLICKEY != REDIS PUBLICKEY-Exitting 23");
    if (PUBLICKEY!=me.publickey) process.exit(23);
});//we need this to authenticate self as genesis
//console.log("env="+JSON.stringify(process.env,null,2));
var GEO=process.env.HOSTNAME;   //passed into docker
GEO=GEO.toUpperCase().split(".")[0].split(":")[0].split(",")[0].split("+")[0];
var PORT=process.env.PORT||"65013";         //passed into docker

var WALLET=process.env.WALLET || "584e560b06717ae0d76b8067d68a2ffd34d7a390f2b2888f83bc9d15462c04b2";

//from
redisClient.hmset("mint:0","geo",GEO,"port",PORT,"wallet",WALLET,"MYIP",process.env.MYIP,"VERSION",process.env.VERSION,"HOSTNAME",process.env.HOSTNAME,"GENESIS",process.env.GENESIS);

//GEO=GEO.toString().split('.').split(',');
**/
/*
//  mint:0 is me  and  mint:1 is Genesis node
redisClient.hmset("mint:0",{
    "mint" : "0",      //set by genesis node
    "geo" : GEO,
    "group": GEO+".1",      //add all nodes to genesis group
    // wireguard configuration details
    "port" : ""+PORT,
    "ipaddr" : process.env.MYIP,   //set by genesis node on connection
    "publickey" : PUBLICKEY,
    //
    "bootTime" : ""+now(),   //So we can detect reboots
    "version" : process.env.VERSION,  //software version
    "wallet" : WALLET,
    "owl": ""   //how long it took this node's last record to reach me
 });
*/
getConfiguration(); //later this should start with just an IP of genesis node 
function getConfiguration() {
    var URL = "http://" + process.env.GENESIS + ":" + "65013/";
    var hostname = process.env.HOSTNAME || "noHostName";
    var geo = hostname.split(".")[0];
    var port = process.env.PORT || "65013";
    URL = URL + encodeURI("nodefactory?geo=" + geo + "&port=" + port || "65013" + "&publickey=" + process.env.PUBLICKEY + "&version=" + process.env.VERSION + "&wallet=" + process.env.WALLET + "&myip=" + process.env.MYIP + "&ts=" + lib_js_1.now());
    console.log("****CONFIG: getConfiguration() Fetching config from URL: " + URL);
    //FETCH CONFIG
    var req = http.get(URL, function (res) {
        var data = '', json_data;
        res.on('data', function (stream) {
            data += stream;
        });
        res.on('error', function () {
            console.log(lib_js_1.ts() + "CONFIG: received error from " + URL);
            process.exit(36);
        });
        res.on('end', function () {
            var config = JSON.parse(data);
            console.log("COMFIG: --------- " + process.env.GEO + " --------- configuration");
            console.log("CONFIG from node factory:" + JSON.stringify(config, null, 2));
            if (config.isGenesisNode == true) {
                console.log(lib_js_1.ts() + "CONFIG GENESIS node already configured");
                //dumpState();
            }
            else {
                console.log(lib_js_1.ts() + "CONFIG Configuring non-genesis node ... config.isGenesisNode=" + config.isGenesisNode);
                redisClient.hmset("gSRlist", config.gSRlist);
                //install config
                for (var mint in config.mintTable) {
                    var mintEntry = config.mintTable[mint];
                    //console.log("add mint:"+mint+" mintEntry="+dump(mintEntry));
                    redisClient.hmset(mint, mintEntry);
                }
                for (var pulse in config.pulses) {
                    var pulseEntry = config.pulses[pulse];
                    //console.log("add pulse:"+pulse+" pulseEntry="+dump(pulseEntry));
                    redisClient.hmset(pulse, pulseEntry);
                    redisClient.publish("members", "ADDED " + pulseEntry.geo);
                }
            }
        });
    });
}
