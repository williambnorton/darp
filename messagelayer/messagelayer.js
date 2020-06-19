"use strict";
//
//  messagelayer - receive incoming messages and queue them in redis
//
//import {  now,  ts,  dump } from '../lib/lib.js';
exports.__esModule = true;
console.log("Starting Message Layer");
var pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client
var TEST = false;
var dgram = require('dgram');
var server = dgram.createSocket('udp4');
var myipaddr = process.env.MYIP || MYIP();
var myport = process.env.PORT || "65013";
;
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
        console.log("messagelayer: can't find mint:0 self - is redis started??? - use default port 65013");
        MYIP();
        myport = "65013";
    }
    else {
        console.log("send() setting to internal redis IPADDR and PORT me.geo=" + whoami.geo);
        myipaddr = whoami.ipaddr; //overwrite with config
        myport = whoami.port;
    }
    console.log("messagelayer(): Binding pulsePort on UDP port " + myport);
    server.bind(myport, "0.0.0.0");
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
    console.log("messagelayer: received message: " + message + message.length + " bytes from " + remote.address + ':' + remote.port);
    console.log("PUSHING " + now() + "," + strMsg + " onto messages queue");
    redisClient.lpush('messages', "" + now() + "," + strMsg, function (err, reply) {
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
    console.log("");
    console.log("");
    console.log('UDP Server listening for pulses on ' + address.address + ':' + address.port);
    console.log("");
    console.log("");
});
process.on('SIGTERM', function () {
    console.info('messagelayer SIGTERM signal received.');
    process.exit(36);
});
function now() {
    var d = new Date();
    return d.getTime();
}
function MYIP() {
    var http = require('http');
    var options = {
        host: 'ipv4bot.whatismyipaddress.com',
        port: 80,
        path: '/'
    };
    http.get(options, function (res) {
        console.log("status: " + res.statusCode);
        res.on("data", function (chunk) {
            console.log("SETTING MYIP to: " + chunk);
            process.env.MYIP = myipaddr = "" + chunk;
        });
    }).on('error', function (e) {
        console.log("error: " + e.message);
    });
    return "";
}
