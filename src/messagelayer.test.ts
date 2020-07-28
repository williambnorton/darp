/** @module test Test code */

import os = require("os");
import { now } from "./lib";
import { recvMsg, sendMsg } from "./messagelayer";

// launch with TEST=1 to get automatic pulser and catcher
var hostname = process.env.HOSTNAME;
if (typeof hostname == "undefined") {
    hostname = os.hostname().split(".")[0];
}
var pulseMessage =
    "incomingTimestamp=" +
    now() +
    ",0,Build.200619.1110," +
    process.env.HOSTNAME +
    ",DEVOPS.1,194,1592591506442,1592590923743,1,2,1,";
console.log("pulseMessage=" + pulseMessage);
process.argv.shift(); // ignore rid of node
process.argv.shift(); // ignore rid of path to mthis code

recvMsg(65013, (incomingMessage: string) => {
    // one-time set up of message handler callback
    console.log(
        `test_app_pulser(): recvMsg callback incomingMessage ------> ${incomingMessage}`
    );
});

function test_app_pulser() {
    // sample test app
    sendMsg(pulseMessage, process.argv);
    setTimeout(test_app_pulser, 1000); // do it again in a few seconds
}
test_app_pulser(); // bench test
