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

    myPulseGroups[pulseGroup.groupName]=new AugmentedPulseGroup(pulseGroup);
    return myPulseGroups[pulseGroup.groupName];
};

    //
    //  @WBNWBNWBN ... this receiver wil demux for all pulseGroups,
    //
    var dgram = require("dgram");

    const receiver = dgram.createSocket("udp4");
    const udp = dgram.createSocket("udp4");    


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

        if (typeof myPulseGroups[incomingPulse.group]=="undefined") {
            console.log(`unknown group pulse: ${incomingPulse.group}`);
            console.log(`${dump(myPulseGroups)}`);
        } else {
            var incomingPulseGroup=myPulseGroups[incomingPulse.group];


            if (incomingPulse.msgType=="11") {
                    //console.log(`incomingPulse DARP PING (testport)`); // request=${JSON.stringify(incomingPulse)}`);
                console.log(`PING MESSAGE incomingPulse.msgType=${incomingPulse.msgType}    incomingPulse=${JSON.stringify(incomingPulse,null,2)}`);
                    //
                    //if (this.isGenesisNode() && this.nodeCount<this.config.MAXNODES) {
//                    if ( this.nodeCount<this.config.MAXNODES) {
                            //HERE put the nodeCount and the # better paths
                        //PONG MESSAGE
                var message=`${now()},12,${incomingPulseGroup.mintTable[0].version},${incomingPulseGroup.mintTable[0].ipaddr},${incomingPulseGroup.mintTable[0].port},${incomingPulseGroup.mintTable[0].geo},${incomingPulseGroup.mintTable[0].bootTimestamp},${incomingPulseGroup.mintTable[0].publickey}` 

                        //else
                        //    var message="http://"+this.config.GENESIS+":"+this.config.GENESISPORT+"/darp.bash?pongMsg="+pongMsgEncoded;

                console.log(`Sending PONG (12) to ${rinfo.address}:65013 message=${message}`);
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
            } else {
                    //console.log(`incomingPulse.msgType=${incomingPulse.msgType}`);
                if (parseInt(incomingPulse.msgType)==12) {    //PONG response
                        //console.log(`INCOMING DARP PONG (12).... incomingPulse.msgType=${incomingPulse.msgType}`);
                        //console.log(`pulsegroup.ts: PONG RESPONSE: ${JSON.stringify(incomingPulse,null,2)}`);
                } else {  //default pass up the stack
                    console.log(`INCOMING DARP PING RESPONSE incomingPulse.msgType=${incomingPulse.msgType}`);
                    incomingPulseGroup.processIncomingPulse(incomingPulse);
                }

                return; //DARP Ping processed
            }

                                
            console.log(`pulseGroup received ${incomingPulse.geo+":"+incomingPulse.group} message`);
            myPulseGroups[incomingPulse.group].processIncomingPulse(incomingPulse);
        }



    });

    receiver.bind(65013);


