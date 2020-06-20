"use strict";
exports.__esModule = true;
//
//  pulselayer - send "pulse" UDP message to all nodes
//
var lib_1 = require("../lib/lib");
var messagelayer_1 = require("./messagelayer");
var TEST = true; // launch with TEST=1 to get automatic pulser and catcher
var h = process.env.HOSTNAME || require("os").hostname().split(".")[0];
var HOSTNAME = h.toUpperCase();
var VERSION = require('fs').readFileSync('../SWVersion', { encoding: 'utf8', flag: 'r' }).trim();
var seq = 1;
function buildPulseMessage() {
    var pulseMessage = "0," + VERSION + "," + HOSTNAME + ",DEVOPS.1," + seq + ",0,1592590923743,1,2,1,";
    seq++;
    console.log("buildPulseMessage() : pulseMessage=" + pulseMessage);
    return pulseMessage;
}
if (TEST) {
    process.argv.shift(); //ignore rid of node
    process.argv.shift(); //ignore rid of path to mthis code
    function pulseAll() {
        messagelayer_1.sendMsg(buildPulseMessage(), process.argv);
        setTimeout(pulseAll, 1000); //do it again in a few seconds
    }
    pulseAll(); //bench test - uncomment to run a test
}
function recvPulses(port, callback) {
    messagelayer_1.recvMsg("" + port, function (incomingMessage) {
        console.log("pulselayer(): recvMsg callback incomingMessage ------> " + incomingMessage);
        var ary = incomingMessage.split(",");
        var incomingTimestamp = parseInt(ary[0]);
        var outgoingTimestamp = parseInt(ary[1]);
        var OWL = incomingTimestamp - outgoingTimestamp;
        ary.shift();
        ary.shift();
        var pulse = ary.join(",");
        console.log("Message Layer Statistics: :" + lib_1.dump(messagelayer_1.messagelayer_stats));
        console.log("WOULD CALL HANDLEPULSE MESSAGE HERE: OWL=" + OWL + " message=" + pulse);
        callback(OWL, pulse);
    });
}
exports.recvPulses = recvPulses;
;
function sendPulses(msg, nodelist) {
    messagelayer_1.sendMsg(buildPulseMessage(), process.argv);
}
exports.sendPulses = sendPulses;
