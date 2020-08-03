"use strict";
/** @module test Test code */
Object.defineProperty(exports, "__esModule", { value: true });
var os = require("os");
var lib_1 = require("./lib");
var messagelayer_1 = require("./messagelayer");
// launch with TEST=1 to get automatic pulser and catcher
var hostname = process.env.HOSTNAME;
if (typeof hostname == "undefined") {
    hostname = os.hostname().split(".")[0];
}
var pulseMessage = "incomingTimestamp=" +
    lib_1.now() +
    ",0,Build.200619.1110," +
    process.env.HOSTNAME +
    ",DEVOPS.1,194,1592591506442,1592590923743,1,2,1,";
console.log("pulseMessage=" + pulseMessage);
process.argv.shift(); // ignore rid of node
process.argv.shift(); // ignore rid of path to mthis code
messagelayer_1.recvMsg(65013, function (incomingMessage) {
    // one-time set up of message handler callback
    console.log("test_app_pulser(): recvMsg callback incomingMessage ------> " + incomingMessage);
});
function test_app_pulser() {
    // sample test app
    messagelayer_1.sendMsg(pulseMessage, process.argv);
    setTimeout(test_app_pulser, 1000); // do it again in a few seconds
}
test_app_pulser(); // bench test
