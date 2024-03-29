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
//
//  addPulseGroup() - this adds water to a pulseGroup object and starts it up
//
function addPulseGroup(pulseGroup) {
    console.log("addPulseGroup(): Adding new pulseGroup object " + pulseGroup.groupName);
    exports.myPulseGroups[pulseGroup.groupName] = new pulsegroup_1.AugmentedPulseGroup(pulseGroup);
    exports.myPulseGroups[pulseGroup.groupName].launch();
    console.log("addPulseGroup() launched " + JSON.stringify(pulseGroup, null, 2));
    return exports.myPulseGroups[pulseGroup.groupName];
}
exports.addPulseGroup = addPulseGroup;
;
//
//   skulker() - delete puylseGroups marked as "STOP" adminControl
//  @wbnwbn
function skulker() {
    var connected = (new Date()).getTime(); //Assume connected into the cloud
    for (var p in exports.myPulseGroups) {
        if (exports.myPulseGroups[p].adminControl == "STOP") {
            delete exports.myPulseGroups[p];
            console.log(lib_2.ts() + ("skulker(): myPulseGroups[p].adminControl==\"STOP\" ...deleted expired pulseGroup object -> " + exports.myPulseGroups[p].groupName));
        }
        if (exports.myPulseGroups[p].groupOwner != exports.myPulseGroups[p].mintTable[0].geo) {
            connected = (new Date()).getTime(); //connected into not-me
        }
    }
    var lastUpdated = lib_1.now() - connected;
    if (lastUpdated > 60 * 1000) {
        console.log("skulker(): Not connected to mesh for 60 seconds exitting");
        process.exit();
    }
    setTimeout(skulker, 1000);
}
setTimeout(skulker, 60 * 1000); //give the docker 60 seconds to connect
//
//  @WBNWBNWBN ... this receiver wil demux for all pulseGroups,
//
var dgram = require("dgram");
var receiver = dgram.createSocket("udp4");
var udp = dgram.createSocket("udp4");
var forwardingPlane = [dgram]; //
var _loop_1 = function () {
    forwardingPlane[i] = dgram.createSocket("udp4");
    forwardingPlane[i].on("error", function (err) {
        console.log("Receiver error:\n" + err);
        forwardingPlane[i].close();
    });
    forwardingPlane[i].on("listening", function () {
        console.log("listening " + i);
        //const address = forwardingPlane[i].address();
        //console.log(`Receiver listening ${address.address}:${address.port}`);
    });
    var index = i;
    forwardingPlane[i].on("message", function (pulseBuffer, rinfo) {
        var incomingTimestamp = lib_1.now().toString();
        //console.log(ts()+`PulseGroups : Received pulse ${pulseBuffer} from ${rinfo.address}:${rinfo.port}`);
        // prepend our timeStamp
        var incomingMessage = incomingTimestamp + "," + pulseBuffer.toString();
        console.log(lib_2.ts() + ("incoming FORWARDing plane for port " + index + " Message: " + incomingTimestamp + " " + incomingMessage));
    });
    console.log("binding PORT " + (65014 + i));
    forwardingPlane[i].bind(65014 + i);
};
for (var i = 0; i < 25; i++) {
    _loop_1();
}
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
    //console.log(ts()+`PulseGroups : Received pulse ${pulseBuffer} from ${rinfo.address}:${rinfo.port}`);
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
        //console.log(`PING MESSAGE received incomingPulse=${JSON.stringify(incomingPulse,null,2)}`);
        //
        //PONG MESSAGE
        //var message=`${now()},12,${incomingPulseGroup.mintTable[0].version},${incomingPulseGroup.mintTable[0].ipaddr},${incomingPulseGroup.mintTable[0].port},${incomingPulseGroup.mintTable[0].geo},${incomingPulseGroup.mintTable[0].bootTimestamp},${incomingPulseGroup.mintTable[0].publickey}` 
        var message = lib_1.now() + ",12," + pulsegroup_1.CONFIG.VERSION + "," + pulsegroup_1.CONFIG.IP + "," + pulsegroup_1.CONFIG.PORT + "," + pulsegroup_1.CONFIG.GEO + "," + pulsegroup_1.CONFIG.BOOTTIMESTAMP + "," + pulsegroup_1.CONFIG.PUBLICKEY + ",From," + rinfo.address + "," + rinfo.port;
        //else
        //    var message="http://"+this.config.GENESIS+":"+this.config.GENESISPORT+"/darp.bash?pongMsg="+pongMsgEncoded;
        //    console.log(`Sending PONG (12) to ${rinfo.address}:65013 message=${message}`);
        udp.send(message, 65013, rinfo.address);
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
                //var incomingPulseGroup=myPulseGroups[incomingPulse.group];
                //console.log(`INCOMING DARP MESSAGE from ${incomingPulse.geo+":"+incomingPulse.group} `);
                exports.myPulseGroups[incomingPulse.group].processIncomingPulse(incomingPulse); //pass to pulse group
                //incomingPulseGroup.processIncomingPulse(incomingPulse);
            }
        }
    }
});
receiver.bind(65013);
