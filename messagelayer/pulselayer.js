"use strict";
var _a;
exports.__esModule = true;
//
//  pulselayer - use the underlying message object to send the same UDP message to multiple nodes
//
var lib_1 = require("../lib/lib");
var messagelayer_1 = require("./messagelayer");
// launch with TEST=1 to get automatic pulser and catcher
if (typeof process.env.HOSTNAME == "undefined")
    process.env.HOSTNAME = require("os").hostname().split(".")[0];
var hostname = (_a = process.env.HOSTNAME) === null || _a === void 0 ? void 0 : _a.toUpperCase();
var version = require('fs').readFileSync('../SWVersion', { encoding: 'utf8', flag: 'r' }).trim();
console.log("version=" + lib_1.dump(version));
var pulseMessage = ",0," + version + "," + hostname + ",DEVOPS.1,194,1592591506442,1592590923743,1,2,1,";
console.log("pulseMessage=" + pulseMessage);
process.argv.shift(); //ignore rid of node
process.argv.shift(); //ignore rid of path to mthis code
messagelayer_1.recvMsg("65013", function (incomingMessage) {
    console.log("test_app_pulser(): recvMsg callback incomingMessage ------> " + incomingMessage);
    console.log("Statistics: :" + lib_1.dump(messagelayer_1.messagelayer_stats));
});
function test_app_pulser() {
    messagelayer_1.sendMsg(pulseMessage, process.argv);
    setTimeout(test_app_pulser, 1000); //do it again in a few seconds
}
test_app_pulser(); //bench test - uncomment to run a test
