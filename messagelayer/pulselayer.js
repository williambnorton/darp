"use strict";
exports.__esModule = true;
//
//  pulselayer - use the underlying message object to send the same UDP message to multiple nodes
//
var lib_1 = require("../lib/lib");
var messagelayer_1 = require("./messagelayer");
// launch with TEST=1 to get automatic pulser and catcher
var h = process.env.HOSTNAME || require("os").hostname().split(".")[0];
var hostname = h.toUpperCase();
console.log("hostname=" + hostname);
var seq = 1;
var version = require('fs').readFileSync('../SWVersion', { encoding: 'utf8', flag: 'r' }).trim();
function buildPulseMessage() {
    var pulseMessage = "0," + version + "," + hostname + ",DEVOPS.1," + seq + ",0,1592590923743,1,2,1,";
    seq++;
    console.log("buildPulseMessage() : pulseMessage=" + pulseMessage);
    return pulseMessage;
}
process.argv.shift(); //ignore rid of node
process.argv.shift(); //ignore rid of path to mthis code
messagelayer_1.recvMsg("65013", function (incomingMessage) {
    console.log("pulselayer(): recvMsg callback incomingMessage ------> " + incomingMessage);
    var ary = incomingMessage.split(",");
    var incomingTimestamp = parseInt(ary[0]);
    var outgoingTimestamp = parseInt(ary[1]);
    var OWL = incomingTimestamp - outgoingTimestamp;
    ary.shift();
    ary.shift();
    console.log("Message Layer Statistics: :" + lib_1.dump(messagelayer_1.messagelayer_stats));
    console.log("WOULD CALL HANDLEPULSE MESSAGE HERE:");
});
function pulseAll() {
    messagelayer_1.sendMsg(buildPulseMessage(), process.argv);
    setTimeout(pulseAll, 1000); //do it again in a few seconds
}
pulseAll(); //bench test - uncomment to run a test
function sendPulse(msg, nodelist) {
}
