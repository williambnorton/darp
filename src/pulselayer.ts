/** @module pulselayer send "pulse" UDP message to all nodes */

import { dump, nth_occurrence } from "./lib";
import { logger } from "./logger";
import { sendMsg, recvMsg } from "./messagelayer";
import { IncomingPulse } from "./types";

type incomingPulseCallback = (incomingPulse: IncomingPulse) => void;

/**
 * Bind the port to receive pulses and deserialiaze them into structured data.
 * @param {number} port Listening port.
 * @param {incomingPulseCallback} callback Function to deserialize the incoming pulse data.
 */
export function recvPulses(port: number, callback: incomingPulseCallback): void {
    recvMsg(port, function (incomingMessage: string) {
        //one-time set up of message handler callback
        logger.info(`pulselayer recvMsg callback: incomingMessage=${incomingMessage}`);

        var ary = incomingMessage.split(",");
        const pulseTimestamp = parseInt(ary[0]);
        const senderTimestamp = parseInt(ary[1]);
        const OWL = pulseTimestamp - senderTimestamp;
        var owlsStart = nth_occurrence(incomingMessage, ",", 9); //owls start after the 7th comma
        var pulseOwls = incomingMessage.substring(owlsStart + 1, incomingMessage.length);
        var pulse: IncomingPulse = {
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

        logger.debug(`pulselayer recvMsg callback: message=${incomingMessage} owlstart=${owlsStart}, pulseOwls=${pulseOwls}`);
        logger.debug(`pulselayer recvMsg callback: structured pulse=${dump(pulse)}`);

        callback(pulse);
    });
}

/**
 * Forwards message to nodes in the list. Wraps messagelayer functionality.
 * @param {string} msg Pulse message serialized.
 * @param {string[]} nodelist List of nodes' IP adresses (can be empty).
 */
export function sendPulses(msg: string, nodelist: string[]) {
    sendMsg(msg, nodelist);
}
