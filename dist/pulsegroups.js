"use strict";
/** @module pulsegroup Create Configuration for joining our pulseGroup object */
exports.__esModule = true;
var pulsegroup_1 = require("./pulsegroup");
var lib_1 = require("./lib");
var lib_2 = require("./lib");
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
    exports.myPulseGroups[pulseGroup.groupName] = new pulsegroup_1.AugmentedPulseGroup(pulseGroup);
    return exports.myPulseGroups[pulseGroup.groupName];
}
exports.addPulseGroup = addPulseGroup;
;
//
//  @WBNWBNWBN ... this receiver wil demux for all pulseGroups,
//
var dgram = require("dgram");
var receiver = dgram.createSocket("udp4");
var udp = dgram.createSocket("udp4");
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
    console.log(lib_2.ts() + ("PulseGroups : Received pulse " + pulseBuffer + " from " + rinfo.address + ":" + rinfo.port));
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
    if (incomingPulse.msgType == "11") {
        //console.log(`incomingPulse DARP PING (testport)`); // request=${JSON.stringify(incomingPulse)}`);
        console.log("PING MESSAGE incomingPulse.msgType=" + incomingPulse.msgType + "    incomingPulse=" + JSON.stringify(incomingPulse, null, 2));
        //
        //if (this.isGenesisNode() && this.nodeCount<this.config.MAXNODES) {
        //                    if ( this.nodeCount<this.config.MAXNODES) {
        //HERE put the nodeCount and the # better paths
        if (typeof exports.myPulseGroups[incomingPulse.group] == "undefined") {
            console.log("pulseGroups: IGNORING unknown group pulse: " + incomingPulse.group);
            console.log("" + lib_1.dump(exports.myPulseGroups));
            return;
        }
        //PONG MESSAGE
        var incomingPulseGroup = exports.myPulseGroups[incomingPulse.group];
        var message = lib_1.now() + ",12," + incomingPulseGroup.mintTable[0].version + "," + incomingPulseGroup.mintTable[0].ipaddr + "," + incomingPulseGroup.mintTable[0].port + "," + incomingPulseGroup.mintTable[0].geo + "," + incomingPulseGroup.mintTable[0].bootTimestamp + "," + incomingPulseGroup.mintTable[0].publickey;
        //else
        //    var message="http://"+this.config.GENESIS+":"+this.config.GENESISPORT+"/darp.bash?pongMsg="+pongMsgEncoded;
        console.log("Sending PONG (12) to " + rinfo.address + ":65013 message=" + message);
        udp.send(message, 65013, rinfo.address);
        //                    } else {
        //                        console.log(`pulseGroup full - not answering request to join... `);
        //                    }
        //
        //
        // STILL DEVELOPING THIS AREA -- PING should include stuff to allow receiver to decide if it is a better connection for it
        //  PONG should include enough to advocate the desired outcome - connect to me, to my genesis node, to this obne closer to you.
        //
        //
    }
    else {
        //console.log(`incomingPulse.msgType=${incomingPulse.msgType}`);
        if (parseInt(incomingPulse.msgType) == 12) { //PONG response
            //console.log(`INCOMING DARP PONG (12).... incomingPulse.msgType=${incomingPulse.msgType}`);
            //console.log(`pulsegroup.ts: PONG RESPONSE: ${JSON.stringify(incomingPulse,null,2)}`);
        }
        else { //default pass up the stack
            if (typeof exports.myPulseGroups[incomingPulse.group] == "undefined") {
                console.log("unknown group pulse: " + incomingPulse.group);
                console.log("" + lib_1.dump(exports.myPulseGroups));
            }
            else {
                var incomingPulseGroup = exports.myPulseGroups[incomingPulse.group];
                console.log("INCOMING DARP MESSAGE for pulse Group " + incomingPulse.group + " incomingPulse.msgType=" + incomingPulse.msgType);
                console.log("pulseGroup received " + (incomingPulse.geo + ":" + incomingPulse.group) + " message");
                exports.myPulseGroups[incomingPulse.group].processIncomingPulse(incomingPulse);
                incomingPulseGroup.processIncomingPulse(incomingPulse);
            }
        }
    }
});
receiver.bind(65013);
