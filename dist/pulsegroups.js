"use strict";
/** @module pulsegroup Create Configuration for joining our pulseGroup object */
exports.__esModule = true;
var pulsegroup_1 = require("./pulsegroup");
var lib_1 = require("./lib");
exports.myPulseGroups = {};
//export function getMyPulseGroups() { return myPulseGroups;}
function forEachPulseGroup(callback) {
    for (var pulseGroup in exports.myPulseGroups)
        callback(exports.myPulseGroups, exports.myPulseGroups[pulseGroup]);
}
exports.forEachPulseGroup = forEachPulseGroup;
;
function addPulseGroup(pulseGroup) {
    console.log("Adding new pulseGroup object " + pulseGroup.groupName);
    exports.myPulseGroups[pulseGroup.groupName] = new pulsegroup_1.AugmentedPulseGroup(new pulsegroup_1.Config(), pulseGroup);
    return exports.myPulseGroups[pulseGroup.groupName];
}
exports.addPulseGroup = addPulseGroup;
;
//
//  @WBNWBNWBN ... this receiver wil demux for all pulseGroups,
//
var dgram = require("dgram");
var receiver = dgram.createSocket("udp4");
receiver.on("error", function (err) {
    console.log("Receiver error:\n" + err);
    receiver.close();
});
receiver.on("listening", function () {
    var address = receiver.address();
    console.log("Receiver listening " + address.address + ":" + address.port);
});
receiver.on("message", function (pulseBuffer, rinfo) {
    var incomingTimestamp = lib_1.now().toString();
    console.log("PulseGroups : Received pulse " + pulseBuffer + " from " + rinfo.address + ":" + rinfo.port);
    // prepend our timeStamp
    var incomingMessage = incomingTimestamp + "," + pulseBuffer.toString();
    //demux here to send to proper pulseGroup
    var ary = incomingMessage.split(",");
    var pulseTimestamp = parseInt(ary[0]);
    var senderTimestamp = parseInt(ary[1]);
    var OWL = pulseTimestamp - senderTimestamp;
    var owlsStart = lib_1.nth_occurrence(incomingMessage, ",", 9); //owls start after the 7th comma
    var pulseOwls = incomingMessage.substring(owlsStart + 1, incomingMessage.length);
    var incomingPulse = {
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
    if (typeof exports.myPulseGroups[incomingPulse.geo + ":" + incomingPulse.group] == "undefined") {
        console.log("unknown group pulse: " + incomingPulse.geo + ":" + incomingPulse.group);
        console.log("" + lib_1.dump(exports.myPulseGroups));
    }
    else {
        console.log("pulseGroup received " + (incomingPulse.geo + ":" + incomingPulse.group));
        exports.myPulseGroups[incomingPulse.geo + ":" + incomingPulse.group].recvPulses(incomingMessage, rinfo.address, rinfo.port);
    }
});
receiver.bind(65013);
