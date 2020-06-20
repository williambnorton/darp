"use strict";
exports.__esModule = true;
//
//  -create the UDP message bus for communication with all nodes
// all others only have to deal with message, we timestamp and queue it here
var PORT = process.env.PORT || "65013";
var TEST = true;
//
var dgram = require('dgram');
var server = dgram.createSocket('udp4');
exports.stats = {
    port: "",
    inMsgs: 0,
    outMsgs: 0,
    lastInTimestamp: 0,
    lastOutTimestamp: 0,
    lastInMsg: "",
    lastOutMsg: ""
};
//  RECEIVER CODE
server.on('error', function (err) {
    console.log("server error:\n" + err.stack);
    server.close();
});
server.on('listening', function () {
    var address = server.address();
    console.log("server listening " + address.address + ":" + address.port);
});
function recvMsg(port, callback) {
    exports.stats.port = port;
    server.bind(port);
    // Prints: server listening 0.0.0.0:41234
    server.on('message', function (msg, rinfo) {
        var incomingTimestamp = exports.stats.lastInTimestamp = now();
        exports.stats.inMsgs++;
        console.log("server got: " + msg + " from " + rinfo.address + ":" + rinfo.port);
        var incomingMessage = incomingTimestamp + "," + msg; //prepend our timeStamp
        exports.stats.lastInMsg = incomingMessage;
        callback(incomingMessage);
    });
}
exports.recvMsg = recvMsg;
//--------------------------------------------------------------------
//    SENDER CODE
//pulseMsg sample: 0,Build.200619.1110,DEVOPS,DEVOPS.1,194,1592591506442,1592590923743,1,2,1, from 71.202.2.184:64339
var client = dgram.createSocket('udp4');
//
//   sendMsg(): Send same message to all nodes in nodelist 
//
function sendMsg(outgoingMessage, nodelist) {
    nodelist.forEach(function (node) {
        var ipaddr = node.split(":")[0];
        var port = node.split(":")[1] || "65013";
        var timestampedMsg = "" + now() + "," + outgoingMessage;
        var message = Buffer.from(timestampedMsg);
        exports.stats.outMsgs++;
        exports.stats.lastOutTimestamp = now();
        exports.stats.lastOutMsg = timestampedMsg;
        console.log(ts() + "messagelayer.sendMsg() sending " + timestampedMsg + " to " + ipaddr + ":" + port);
        client.send(message, 0, message.length, port, ipaddr, function (err) {
            if (err) {
                console.log("sendMessage(): ERROR");
                client.close();
            }
        });
    });
}
exports.sendMsg = sendMsg;
/************************/
// launch with TEST=1 to get automatic pulser and catcher
var pulseMessage = "incomingTimestamp=" + now() + ",0,Build.200619.1110," + process.env.HOSTNAME || require("os").hostname() + ",DEVOPS.1,194,1592591506442,1592590923743,1,2,1,";
process.argv.shift(); //ignore rid of node
process.argv.shift(); //ignore rid of path to mthis code
recvMsg("65013", function (incomingMessage) {
    console.log("test_app_pulser(): recvMsg callback incomingMessage: " + incomingMessage);
});
function test_app_pulser() {
    sendMsg(pulseMessage, process.argv);
    setTimeout(test_app_pulser, 1000); //do it again in a few seconds
}
if (TEST)
    test_app_pulser(); //bench test - uncomment to run a test
//==============
//misc. routines
function ts() {
    return new Date().toLocaleTimeString() + " ";
}
function now() {
    var d = new Date();
    return d.getTime();
}
