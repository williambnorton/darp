"use strict";
exports.__esModule = true;
//
//  handlePulse - receive incoming pulses and store in redis
//
var lib_js_1 = require("../lib/lib.js");
var pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client
var dgram = require('dgram');
var server = dgram.createSocket('udp4');
redisClient.hgetall("mint:0", function (err, me) {
    if (err) {
        console.log("hgetall me failed");
    }
    else {
        if (me == null) {
            console.log("handlePulse() - can't find me entry...exitting");
            process.exit(127);
        }
        console.log("handlePulse(): me=" + lib_js_1.dump(me));
        server.bind(me.port, "0.0.0.0");
    }
});
redisClient.hgetall("mint:1", function (err, genesis) {
    if (err) {
        console.log("hgetall genesis failed");
    }
    else {
        if (genesis == null) {
            console.log("handlePulse() - can't find genesis entry...exitting");
            process.exit(127);
        }
        console.log("handlePulse(): genesis=" + lib_js_1.dump(genesis));
        //server.bind(me.port, "0.0.0.0");
    }
});
//
// listen for incoming pulses and convert into redis commands
//
server.on('listening', function () {
    var address = server.address();
    console.log('UDP Server listening on ' + address.address + ':' + address.port);
});
//
//  message format: 0,56,1583783486546,MAZORE:MAZORE.1,1>1=0,2>1=0
//
server.on('message', function (message, remote) {
    console.log("HANDLEPULSE: received pulse from " + remote.address + ':' + remote.port + ' - ' + message);
    var ary = message.toString().split(",");
    try {
        var incomingIP = remote.address;
        var pulseType = ary[0];
        var seqNum = ary[1]; //56
        var pulseTimestamp = ary[2]; //1583783486546
        var pulseLabel = ary[3]; //MAZORE:MAZORE.1     //MAZORE:MAZORE.1
        var pulseSource = ary[3].split(":")[0]; //MAZORE
        var pulseGroup = ary[3].split(":")[1]; //MAZORE.1
        var pulseGroupOwner = pulseGroup.split(".")[0]; //MAZORE
        var receiveTimestamp = lib_js_1.now();
        var OWL = receiveTimestamp - pulseTimestamp;
        var owls = new Array();
        for (var i = 4; i < ary.length; i++)
            owls[i - 4] = ary[i];
    }
    catch (err) {
        console.log("ERROR - BAD PULSE from " + remote.address + ':' + remote.port + ' - ' + message);
        process.exit(127);
    }
    console.log("HANDLEPULSE pulseType=" + pulseType + " seqNum=" + seqNum + " pulseTimestamp " + pulseTimestamp + " remote.port=" + remote.port);
    console.log("HANDLEPULSE pulseLabel=" + pulseLabel + " OWL=" + OWL + " ms from " + incomingIP + " owls=" + owls);
    console.log("HANDLEPULSE pulseGroup=" + pulseGroup + " pulseGroupOwner=" + pulseGroupOwner + " receiveTimestamp= " + receiveTimestamp + " owls=" + owls);
    redisClient.exists(pulseLabel, function (err, reply) {
        if (reply === 1) {
            console.log('HANDLEPULSE this pulsing node exists');
            redisClient.hmset(pulseLabel, newNode);
            //update stats
        }
        else { //create node
            console.log("HANDLEPULSE: ADDING NODE: " + pulseLabel);
            var newNode = {
                "geo": pulseSource,
                "group": pulseGroup,
                "pulseTimestamp": "" + pulseTimestamp,
                "lastSeq": "" + seqNum,
                "owl": "" + OWL,
                "ipaddr": incomingIP,
                "bootTime": "" + lib_js_1.now(),
                "pulseGroups": pulseGroup,
                "inOctets": "0",
                "outOctets": "0",
                "inMsgs": "0",
                "outMsgs": "0",
                "pktDrops": "0",
                "remoteState": message.toString() //store literal owls
            };
            redisClient.hmset(pulseLabel, newNode);
            console.log("HANDLEPULSE: ADDED NEW NODE: " + pulseLabel + lib_js_1.dump(newNode));
        }
    });
    // for each mint table entry, if match - set this data
    //var ary=owls; //.split(",");
    for (var i = 0; i < owls.length; i++) {
        var key = owls[i].split("=")[0];
        var owl = owls[i].split("=")[1];
        console.log("HANDLEPULSE key=" + key + " owl=" + owl);
        //store the OWLs in redis
        redisClient.hset(pulseGroup, key, owl); // store OWL
        /*  redisClient.hmgetall(pulseLabel, "mint:"+mint) {
          //"port" : ""+port,
            //"publickey" : publickey,
            //"mint" : ""+newMint,      //set by genesis node
            //genesis connection info
            //"genesisIP" : me.genesisIP,
            //"genesisPort" : me.genesisPort,
            //"genesisPublickey" : me.genesisPublickey||publickey,
            //"wallet" : wallet,
          });
        */
    }
});
/***
redisClient.hgetall("me", function (err,me) {
    if (err) {
      console.log("hgetall me failed");
    } else {
      console.log("me="+dump(me));
      server.bind(me.port, me.ipaddr);
    }
});
***/ 
