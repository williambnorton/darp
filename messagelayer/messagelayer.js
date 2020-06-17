"use strict";
exports.__esModule = true;
//
//  messagelayer - receive incoming messages and queue them in redis
//
var lib_js_1 = require("../lib/lib.js");
console.log("Starting Message Layer");
var pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client
var TEST = false;
var dgram = require('dgram');
var server = dgram.createSocket('udp4');
var myipaddr = "";
var myport = "";
//
//  send message call
//
var networkClient = dgram.createSocket('udp4');
function send(message, ipaddr, port) {
    console.log("sendPulsePackets(): networkClient.send(message=" + message + " to " + ipaddr + ":" + port);
    networkClient.send(message, port, ipaddr, function (error) {
        if (error)
            console.log("messagelayer: network send failed: :" + error);
    }); //***  Message sent
}
exports.send = send;
;
//
//  mint:0 is me and my configuration, mint:1 is the groupOwner - a Genesis node
//
redisClient.hgetall("mint:0", function (err, whoami) {
    if ((err) || (whoami == null)) {
        console.log("messagelayer: can't find mint:0 self - is redis started??? - exitting");
        process.exit(36); //reload software and try again
    }
    console.log(":" + lib_js_1.dump(whoami));
    myipaddr = whoami.ipaddr;
    myport = whoami.port;
    console.log(lib_js_1.ts() + "messagelayer(): Binding pulsePort on UDP port " + whoami.port);
    server.bind(whoami.port, "0.0.0.0");
    if (TEST)
        testModule(); //UNCOMMENT TO BENCH TEST MESSAGE LAYER. REDIS MUST BE RUNNING !!!
});
//
//  sample app to pull messages off the message queue and print them out
//
function testModule() {
    for (var i = 0; i < 5; i++) {
        send("Test message # " + i + " UDP send/receive on port " + myport, myipaddr, myport);
        console.log("SENDING " + i + " testing UDP send/receive on  " + myipaddr + " : " + myport);
    }
    for (var i = 0; i < 5; i++) {
        //console.log("CATCHING MESSAGES FROM MSG Q:");
        redisClient.brpop('messages', 2 /*secs*/, function (err, incomingMessage) {
            if (err)
                console.log("messagelayer error popping messages " + err);
            else {
                if (incomingMessage != null)
                    console.log("POPPING MESSAGE: test messagelayer(): popping message from message queue: " + incomingMessage);
            }
        });
    }
    setTimeout(testModule, 30000);
}
//
//
//  incoming message - stuff it into quque right away
//
server.on('message', function (message, remote) {
    var strMsg = message.toString();
    console.log(lib_js_1.ts() + "messagelayer: received message: " + message + message.length + " bytes from " + remote.address + ':' + remote.port);
    console.log(lib_js_1.ts() + "PUSHING " + lib_js_1.now() + "," + strMsg + " onto messages queue");
    redisClient.lpush('messages', "" + lib_js_1.now() + "," + strMsg, function (err, reply) {
        if (err)
            console.log("ERROR pushing message onto messages queue: " + err);
        else
            console.log("SUCCESSFULLY PUSHED into messaes list: " + reply);
    });
});
//
// listen for incoming pulses and convert into redis commands
//
server.on('listening', function () {
    var address = server.address();
    console.log(lib_js_1.ts() + "");
    console.log(lib_js_1.ts() + "");
    console.log(lib_js_1.ts() + 'UDP Server listening for pulses on ' + address.address + ':' + address.port);
    console.log(lib_js_1.ts() + "");
    console.log(lib_js_1.ts() + "");
});
process.on('SIGTERM', function () {
    console.info('messagelayer SIGTERM signal received.');
    process.exit(36);
});
