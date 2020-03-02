"use strict";
exports.__esModule = true;
//
//  boot.ts - build
//
var lib_1 = require("../lib/lib");
var pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client
redisClient.flushall();
redisClient.hmset("me", {
    "Genesis": lib_1.getGenesis()
});
console.log("DONE");
/*
// get the genesis node IP
redisClient.hgetall("me", function (err, identity) {
    var GENESIS="";
    if (err) {
        GENESIS=getGenesisIP();
        console.log("no me in DB fetched HOST="+GENESIS);
    } else {
        console.log("redis shared identity="+dump(identity))
        if (identity!=null) {
            var me=identity;
            console.log("me="+dump(me));
            GENESIS=me.ipaddr; //+":"+me.port;
        } else {
            GENESIS=getGenesisIP();
            console.log("null identity "+GENESIS);
        }
   }
    console.log("Now that we have the genesis="+GENESIS+" - fetch the codenconfig");
    //We have none of this info yet:
    redisClient.hset("me","Genesis",GENESIS+":65013:"+"12341234123412341234123412341234");
});
*/ 
