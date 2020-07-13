"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//
//  messagelayer -  send and receive message to group of nodes
//
var lib_1 = require("../lib/lib");
//
//  -create the UDP message bus for communication with all nodes
// all others only have to deal with message, we timestamp and queue it here
var PORT = process.env.PORT || "65013";
//
var dgram = require('dgram');
var server = dgram.createSocket('udp4');
exports.messagelayer_stats = {
    port: "",
    inMsgs: 0,
    outMsgs: 0,
    lastInTimestamp: 0,
    lastOutTimestamp: 0,
    inOctets: 0,
    outOctets: 0,
    lastInMsg: "",
    lastOutMsg: ""
};
//             RECEIVER CODE
server.on('error', function (err) {
    console.log("messagelayer server error:\n" + err.stack);
    server.close();
});
server.on('listening', function () {
    var address = server.address();
    console.log("messagelayer server listening " + address.address + ":" + address.port);
});
//
//  recvMsg(): bind port and start callbacks for incoming messages
//
function recvMsg(port, callback) {
    exports.messagelayer_stats.port = port;
    server.bind(port);
    // Prints: server listening 0.0.0.0:41234
    server.on('message', function (msg, rinfo) {
        var incomingTimestamp = exports.messagelayer_stats.lastInTimestamp = lib_1.now();
        exports.messagelayer_stats.inOctets += msg.length;
        exports.messagelayer_stats.inMsgs++;
        //console.log(`messagelayer Server received: ${msg} from ${rinfo.address}:${rinfo.port}`);  //INSTRUMENTATION POINT
        var incomingMessage = incomingTimestamp + "," + msg; //prepend our timeStamp
        exports.messagelayer_stats.lastInMsg = incomingMessage;
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
        var ipaddr = node.split("_")[0];
        var port = node.split("_")[1] || "65013";
        var timestampedMsg = "" + lib_1.now() + "," + outgoingMessage;
        var message = Buffer.from(timestampedMsg);
        exports.messagelayer_stats.outMsgs++;
        exports.messagelayer_stats.lastOutTimestamp = lib_1.now();
        exports.messagelayer_stats.lastOutMsg = timestampedMsg;
        exports.messagelayer_stats.outOctets += message.length;
        //console.log(ts()+"messagelayer.sendMsg() sending "+timestampedMsg+" to "+ipaddr+":"+port);
        client.send(message, 0, message.length, port, ipaddr, function (err) {
            if (err) {
                console.log("messagelayer sendMessage(): ERROR");
                client.close();
            }
        });
    });
}
exports.sendMsg = sendMsg;
/************ TEST AREA ***********   add space here to comment test---> * /
// launch with TEST=1 to get automatic pulser and catcher
var hostname=process.env.HOSTNAME;
if (typeof process.env.HOSTNAME == "undefined") process.env.HOSTNAME=require("os").hostname().split(".")[0];
var pulseMessage="incomingTimestamp="+now()+",0,Build.200619.1110,"+process.env.HOSTNAME+",DEVOPS.1,194,1592591506442,1592590923743,1,2,1,";
console.log("pulseMessage="+pulseMessage);
process.argv.shift();  //ignore rid of node
process.argv.shift();  //ignore rid of path to mthis code

recvMsg("65013",function(incomingMessage:string) {  //one-time set up of message handler callback
  console.log(`test_app_pulser(): recvMsg callback incomingMessage ------> ${incomingMessage}`);
});

function test_app_pulser() {    //sample test app
  sendMsg(pulseMessage, process.argv);
  setTimeout(test_app_pulser,1000);  //do it again in a few seconds
}
test_app_pulser();  //bench test - uncomment to run a test
/*************  TEST AREA **********/
