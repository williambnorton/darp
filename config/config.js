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
redisClient.flushall(); //clean slate
//console.log("env="+JSON.stringify(process.env,null,2));
var GEO = process.env.HOSTNAME || "DEVOPS"; //passed into docker
var PORT = process.env.PORT || "65013"; //passed into docker
var PUBLICKEY = "";
try {
    PUBLICKEY = require('fs').readFileSync('/etc/wireguard/publickey', 'utf8');
    PUBLICKEY = PUBLICKEY.replace(/^\n|\n$/g, '');
    console.log("pulled PUBLICKEY from publickey file: >" + PUBLICKEY + "<");
}
catch (err) {
    PUBLICKEY = "deadbeef00deadbeef00deadbeef0012";
}
var WALLET = process.env.WALLET || "584e560b06717ae0d76b8067d68a2ffd34d7a390f2b2888f83bc9d15462c04b2";
//GEO=GEO.toString().split('.').split(',');
console.log("CONFIG starting with GEO=" + GEO + " publickey=" + PUBLICKEY + " PORT=" + PORT + " WALLET=" + WALLET + "");
redisClient.hmset("me", {
    "geo": GEO,
    "group": GEO + ".1",
    "port": PORT,
    "publickey": PUBLICKEY,
    "bootTime": "" + lib_1.now(),
    //genesis connection info-evebtually find gnesis node online
    "genesisIP": "104.42.192.234",
    "genesisPort": "65013",
    "wallet": WALLET
});
if (process.env.GENESIS) {
    redisClient.hmset("genesis", {
        "port": "65013",
        "ipaddr": "104.42.192.234" //set by genesis node on connection
    });
}
else {
    console.log("Using environmental variable to set GENESIS to " + process.env.GENESIS);
    redisClient.hmset("genesis", {
        "port": "65013",
        "ipaddr": process.env.GENESIS //set by genesis node on connection
    });
}
//if (PUBLICKEY=="") Usage();
setMe(); //later this should start with just an IP of genesis node 
function setMe() {
    redisClient.hgetall("genesis", function (err, genesis) {
        //console.log("setMe(): genesis="+dump(genesis));
        var URL = "http://" + genesis.ipaddr + ":" + genesis.port + "/nodefactory?geo=" + GEO + "&port=" + PORT + "&publickey=" + PUBLICKEY + "&wallet=" + WALLET;
        //console.log("Fetching URL for config: "+URL);
        //FETCH CONFIG
        var req = http.get(URL, function (res) {
            var data = '', json_data;
            res.on('data', function (stream) {
                data += stream;
            });
            res.on('end', function () {
                //console.log("CONFIG data="+data);
                var json = JSON.parse(data);
                //gME=json;  //set my global variable  for convenuience
                //console.log("CONFIG setMeIP(): setting redis && gME with what genesis told us we are:"+JSON.stringify(json,null,2));
                //var me=JSON.parse(json);
                redisClient.hmset("me", json);
                //console.log("CONFIG setMeIP(): setting identity:"+JSON.stringify(json,null,2));
                redisClient.hgetall("me", function (err, me) {
                    if (err)
                        console.log("CONFIG ERROR");
                    else {
                        //console.log("ME **********"+dump(me));
                        var ary = me.pulseGroups.split(",");
                        for (var group in ary) {
                            //console.log("group="+group+" ary[]="+ary[group]);
                            //create me.geo:me.pulseGroups
                            var nodeEntry = me.geo + ":" + ary[group];
                            //console.log("setMe() creating "+nodeEntry);
                            redisClient.hmset(nodeEntry, json); //save <me>:MAZORE.1
                            //eventually, on pulse? we need to add own mint to MAZORE.1
                            //we need mintTable - for me
                            //Assigned MINT TABLE - needed info to connect to remote
                            var newMintEntry = {
                                "mint": json.mint,
                                "geo": json.geo,
                                "ipaddr": json.ipaddr,
                                "port": "" + json.port,
                                "publickey": "" + json.publickey,
                                "wallet": "" + json.wallet
                            };
                            //console.log("newMintEntry="+dump(newMintEntry));
                            redisClient.hmset("mint:" + json.mint, newMintEntry);
                            //if we haven't installed out genesis node, install it in the mint table now
                            var genesisMint = {
                                "mint": "1",
                                "geo": json.group.split(".")[0],
                                "ipaddr": json.genesisIP,
                                "port": "" + json.genesisPort,
                                "publickey": "" + json.genesisPublickey,
                                "wallet": ""
                            };
                            //console.log("genesisMint="+dump(genesisMint));                           
                            redisClient.hmset("mint:1", genesisMint);
                            redisClient.hgetall(nodeEntry, function (err, json) {
                                if (err)
                                    console.log("hgetall nodeEntry=" + nodeEntry + " failed");
                                else {
                                    console.log("EXPRESS nodeFactory sent us our config json=" + lib_1.dump(json));
                                    //res.setHeader('Content-Type', 'application/json');   
                                    //res.end(JSON.stringify(json));
                                    console.log("Node connection established - now rebuild new configuration for witreguard configuration file to allow genesis to sendus stuff");
                                }
                            });
                            //make sure there is a genesis group node MAZORE:MAZORE:1 
                            //reinit wireguard
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
