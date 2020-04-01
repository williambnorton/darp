"use strict";
//
//  config.ts - initialize the redis database with envirnmental variables:
//          HOSTNAME - human readable text name
//          GENESIS - IPaddr or ipaddr:port
//          PUBLICKEY - Public key 
//
exports.__esModule = true;
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
//  me - my internal state and pointer to genesis
//
var lib_1 = require("../lib/lib");
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
    "bootTime": "" + lib_1.now(),
    "version": process.env.VERSION,
    "wallet": WALLET,
    "owl": "" //how long it took this node's last record to reach me
});
getConfiguration(); //later this should start with just an IP of genesis node 
function getConfiguration() {
    var URL = "http://" + process.env.GENESIS + ":" + "65013" + "/nodefactory?geo=" + GEO + "&port=" + PORT + "&publickey=" + PUBLICKEY + "&version=" + process.env.VERSION + "&wallet=" + WALLET + "&myip=" + process.env.MYIP + "&ts=" + lib_1.now();
    console.log("CONFIG: Fetching URL for config: " + URL);
    //FETCH CONFIG
    var req = http.get(URL, function (res) {
        var data = '', json_data;
        res.on('data', function (stream) {
            data += stream;
        });
        res.on('end', function () {
            //console.log("CONFIG data="+data);
            var json = JSON.parse(data);
            //gME=json;  //set my global variable  for convenience
            console.log("CONFIG from node factory:" + JSON.stringify(json, null, 2));
            redisClient.hmset("gSRlist", json.gSRlist);
            redisClient.hmset("mint:0", json.mint0);
            redisClient.hmset("mint:1", json.mint1);
            //console.log("mint:1 done entryKey="+json.genesisGroupEntry.geo+":"+json.genesisGroupEntry.group);
            redisClient.hmset(json.genesisGroupEntry.geo + ":" + json.genesisGroupEntry.group, json.genesisGroupEntry);
            if (json.mint0.mint != json.mint1.mint) {
                console.log("genesis done " + json.newSegmentEntry.geo + ":" + json.newSegmentEntry.group, json.newSegmentEntry);
                redisClient.hmset(json.newSegmentEntry.geo + ":" + json.newSegmentEntry.group, json.newSegmentEntry);
            }
            console.log("newSegment done");
            /******
            //var me=JSON.parse(json);
            redisClient.hmset("gSRlist", json.gSRlist);     //A list of entries with OWLS
            redisClient.hmset("mintTable", json.mintTable); //

            //console.log("CONFIG setMeIP(): setting identity:"+JSON.stringify(json,null,2));
                redisClient.hgetall("me",function (err,me) {
                    if (err) console.log("CONFIG ERROR");
                    else {
                        //
                        //  Create Genesis Mint -
                        //              DEVOPS:DEVOP.1
                        //

                        //console.log("ME **********"+dump(me));
                        var ary=me.pulseGroups.split(",");
                        for (var group in ary) {
                            //console.log("group="+group+" ary[]="+ary[group]);
                            //create me.geo:me.pulseGroups
                            var nodeEntry=me.geo+":"+ary[group];
                            //console.log("setMe() creating "+nodeEntry);
                            
                            redisClient.hmset(nodeEntry,json);  //save <me>:<myGroup>.1
                            //eventually, on pulse? we need to add own mint to MAZORE.1

                             //Assigned MINT TABLE - needed info to connect to remote
                            var newMintEntry={
                                "mint" : json.mint,
                                "geo" : json.geo,
                                "ipaddr" : json.ipaddr,
                                "port" : ""+json.port,
                                "publickey" : ""+json.publickey,
                                "wallet" : ""+json.wallet
                            }
                            //console.log("newMintEntry="+dump(newMintEntry));
                            redisClient.hmset("mint:"+json.mint, newMintEntry);

                            //if we haven't installed out genesis node, install it in the mint table now
                            var genesisMint={
                                "mint" : "1",
                                "geo" : json.group.split(".")[0],
                                "ipaddr" : json.genesisIP,
                                "port" : ""+json.genesisPort,
                                "publickey" : ""+json.genesisPublickey,
                                "wallet" : ""
                            }
                            //console.log("genesisMint="+dump(genesisMint));
                            redisClient.hmset("mint:1",genesisMint);

                            redisClient.hgetall(nodeEntry, function(err,json) {
                                if (err) console.log("hgetall nodeEntry="+nodeEntry+" failed");
                                else {
                                   console.log("CONFIG nodeFactory sent us our config json="+dump(json));
                                   //res.setHeader('Content-Type', 'application/json');
                                   //res.end(JSON.stringify(json));
                                   console.log("Node is connected - now rebuild new configuration for witreguard configuration file to allow genesis to sendus stuff");
                                }
                             });

                             //make sure there is a genesis group node MAZORE:MAZORE:1

                            //reinit wireguard

                        }
                    }
                });

            });
            *****/
        });
    });
}
function Usage() {
    console.log("usage: node config publickey [geo]");
    process.exit(127);
}
