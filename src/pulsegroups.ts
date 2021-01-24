/** @module pulsegroup Create Configuration for joining our pulseGroup object */

import { PulseGroup,AugmentedPulseGroup, Config } from './pulsegroup';
import { now, nth_occurrence, dump  } from "./lib";
import { IncomingPulse } from "./types";

export type PulseGroups = { [x: string]: AugmentedPulseGroup };
export var myPulseGroups:PulseGroups={};

//export function getMyPulseGroups() { return myPulseGroups;}

export function forEachPulseGroup(callback: CallableFunction) {
    for (var pulseGroup in myPulseGroups) 
        callback(myPulseGroups, myPulseGroups[pulseGroup]);
};

export function addPulseGroup(pulseGroup:PulseGroup) {
    console.log(`Adding new pulseGroup object ${pulseGroup.groupName}`);
    myPulseGroups[pulseGroup.groupName]=new AugmentedPulseGroup(new Config(), pulseGroup);
    return myPulseGroups[pulseGroup.groupName];
};

    //
    //  @WBNWBNWBN ... this receiver wil demux for all pulseGroups,
    //
    var dgram = require("dgram");

    const receiver = dgram.createSocket("udp4");

    receiver.on("error", (err:string) => {
        console.log(`Receiver error:\n${err}`);
        receiver.close();
    });

    receiver.on("listening", () => {
        const address = receiver.address();
        console.log(`Receiver listening ${address.address}:${address.port}`);
    });

    receiver.on("message", (pulseBuffer:string, rinfo) => {
        const incomingTimestamp = now().toString();
        console.log(`PulseGroups : Received pulse ${pulseBuffer} from ${rinfo.address}:${rinfo.port}`);
        // prepend our timeStamp
        const incomingMessage = incomingTimestamp + "," + pulseBuffer.toString();
        //demux here to send to proper pulseGroup

        var ary = incomingMessage.split(",");
        const pulseTimestamp = parseInt(ary[0]);
        const senderTimestamp = parseInt(ary[1]);
        const OWL = pulseTimestamp - senderTimestamp;
        var owlsStart = nth_occurrence(incomingMessage, ",", 9); //owls start after the 7th comma
        var pulseOwls = incomingMessage.substring(owlsStart + 1, incomingMessage.length);
        var incomingPulse: IncomingPulse = {
            pulseTimestamp: pulseTimestamp,
            outgoingTimestamp: senderTimestamp,
            msgType: ary[2],
            version: ary[3],
            geo: ary[4],
            group: ary[5],
            seq: parseInt(ary[6]),
            bootTimestamp: parseInt(ary[7]), //if genesis node reboots --> all node reload SW too
            mint: parseInt(ary[8]),
            owls: pulseOwls,
            owl: OWL,
            lastMsg: incomingMessage,
        };

        if (typeof myPulseGroups[incomingPulse.geo+":"+incomingPulse.group]=="undefined") {
            console.log(`unknown group pulse: ${incomingPulse.geo}:${incomingPulse.group}`);
            console.log(`${dump(myPulseGroups)}`);
        } else {
            console.log(`pulseGroup received ${incomingPulse.geo+":"+incomingPulse.group}`);
            myPulseGroups[incomingPulse.geo+":"+incomingPulse.group].recvPulses(incomingMessage,rinfo.address,rinfo.port);
        }
    });

    receiver.bind(65013);


