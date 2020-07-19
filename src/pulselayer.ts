/** @module pulselayer send "pulse" UDP message to all nodes */

import { dump, nth_occurrence } from './lib';
import { logger } from './logger';
import { sendMsg, recvMsg } from './messagelayer';
import { IncomingPulseInterface } from './pulsegroup';


type incomingPulseCallback = (incomingPulse: IncomingPulseInterface) => void;


/**
 * Bind the port to receive pulses and deserialiaze them into structured data.
 * @param {number} port Listening port.
 * @param {incomingPulseCallback} callback Function to deserialize the incoming pulse data.
 */
export function recvPulses(port: number, callback: incomingPulseCallback): void {
    recvMsg(port, function (incomingMessage: string) {  //one-time set up of message handler callback
        
        //logger.info(`pulselayer recvMsg callback: incomingMessage=${incomingMessage}`);
        
        var ary = incomingMessage.split(",");
        const pulseTimestamp = parseInt(ary[0]);
        const senderTimestamp = parseInt(ary[1]);
        const OWL = pulseTimestamp - senderTimestamp;
        var owlsStart = nth_occurrence(incomingMessage, ',', 9); //owls start after the 7th comma
        var pulseOwls = incomingMessage.substring(owlsStart + 1, incomingMessage.length);
        var pulse: IncomingPulseInterface = {
            pulseTimestamp: pulseTimestamp,
            outgoingTimestamp: senderTimestamp,
            msgType: ary[2],
            version: ary[3],
            geo: ary[4],
            group: ary[5],
            seq: parseInt(ary[6]),
            bootTimestamp: parseInt(ary[7]),   //if genesis node reboots --> all node reload SW too
            mint: parseInt(ary[8]),
            owls: pulseOwls,
            owl: OWL,
            lastMsg: incomingMessage
        };

        //logger.info(`pulselayer recvMsg callback: message=${incomingMessage} owlstart=${owlsStart}, pulseOwls=${pulseOwls}`);
        //logger.info(`pulselayer recvMsg callback: structured pulse=${dump(pulse)}`);

        callback(pulse);
    });
};


/**
 * Forwards message to nodes in the list. Wraps messagelayer functionality. 
 * @param {string} msg Pulse message serialized.
 * @param {string[]} nodelist List of nodes' IP adresses (can be empty).
 */
export function sendPulses(msg: string, nodelist: string[]) {
    sendMsg(msg, nodelist);
}


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
