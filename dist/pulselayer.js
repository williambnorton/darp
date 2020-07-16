"use strict";
/** @module pulselayer send "pulse" UDP message to all nodes */
exports.__esModule = true;
var lib_1 = require("./lib");
var messagelayer_1 = require("./messagelayer");
/**
 * Bind the port to receive pulses and deserialiaze them into structured data.
 * @param {number} port Listening port.
 * @param {incomingPulseCallback} callback Function to deserialize the incoming pulse data.
 */
function recvPulses(port, callback) {
    //console.log(`recvPulses(port=${port}):`);
    messagelayer_1.recvMsg(port, function (incomingMessage) {
        //console.log(`****** pulselayer(): recvMsg callback incomingMessage ------> ${incomingMessage}`);
        var ary = incomingMessage.split(",");
        var pulseTimestamp = parseInt(ary[0]);
        var senderTimestamp = parseInt(ary[1]);
        var OWL = pulseTimestamp - senderTimestamp;
        var owlsStart = lib_1.nth_occurrence(incomingMessage, ',', 9); //owls start after the 7th comma
        var pulseOwls = incomingMessage.substring(owlsStart + 1, incomingMessage.length);
        var pulse = {
            pulseTimestamp: pulseTimestamp,
            outgoingTimestamp: senderTimestamp,
            msgType: ary[2],
            version: ary[3],
            geo: ary[4],
            group: ary[5],
            seq: parseInt(ary[6]),
            bootTimestamp: parseInt(ary[7]),
            mint: parseInt(ary[8]),
            owls: pulseOwls,
            owl: OWL,
            lastMsg: incomingMessage
        };
        //console.log("****** recvPulses(): message="+incomingMessage+" owlstart="+owlsStart," pulseOwls="+pulseOwls);
        //console.log("structured pulse="+dump(pulse));
        //ary.shift();ary.shift();
        //const pulse=ary.join(",");
        //console.log("Message Layer Statistics: :"+dump(messagelayer_stats));  //INSTRUMENTATION POINT
        callback(pulse);
    });
}
exports.recvPulses = recvPulses;
;
/**
 * Forwards message to nodes in the list. Wraps messagelayer functionality.
 * @param {string} msg Pulse message serialized.
 * @param {string[]} nodelist List of nodes' IP adresses (can be empty).
 */
function sendPulses(msg, nodelist) {
    messagelayer_1.sendMsg(msg, nodelist);
}
exports.sendPulses = sendPulses;
/***************** TEST AREA **************** /
var h = process.env.HOSTNAME || require("os").hostname().split(".")[0];
const TEST = true; // launch with TEST=1 to get automatic pulser and catcher
const HOSTNAME = h.toUpperCase();
const VERSION = MYVERSION();
var seq=1;
function buildPulseMessage() {
    var pulseMessage="0,"+VERSION+","+HOSTNAME+",DEVOPS.1,"+seq+",0,1592590923743,1,2,1,";
    seq++;
    console.log("buildPulseMessage() : pulseMessage="+pulseMessage);
    return pulseMessage;
}

if (TEST) {
    process.argv.shift();  //ignore rid of node
    process.argv.shift();  //ignore rid of path to mthis code
    pulseAll();  //bench test - uncomment to run a test

        recvPulses("65013",function(pulse) {
            console.log("pulseApp receiving pulse="+dump(pulse));
        });
}
function pulseAll() {    //sample test app
    sendPulses(buildPulseMessage() , process.argv);
    setTimeout(pulseAll,1000);  //do it again in a few seconds
}

/***************** TEST AREA ****************/
