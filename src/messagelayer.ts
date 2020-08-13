/** @module messagelayer send and receive message to group of nodes */

import { now } from "./lib";
import { logger } from "./logger";
import dgram = require("dgram");

// Create the UDP message bus for communication with all nodes
// All others only have to deal with message, we timestamp and queue it here
const server = dgram.createSocket("udp4");
const client = dgram.createSocket("udp4");
type pulseDeserializer = (incomingMessage: string) => void;

export var messagelayer_stats = {
    port: "",
    inMsgs: 0,
    outMsgs: 0,
    lastInTimestamp: 0,
    lastOutTimestamp: 0,
    inOctets: 0,
    outOctets: 0,
    lastInMsg: "",
    lastOutMsg: "",
};

// RECEIVER CODE

server.on("error", (err: Error) => {
    logger.error(`messagelayer server error:\n${err.stack}`);
    logger.error(`messagelayer server error - server recev error - not sure if we should continue...`);
    //server.close();
});

server.on("listening", () => {
    const address = server.address();
    logger.info(`messagelayer server listening ${address.address}:${address.port}`);
});

/**
 * Bind listening port and attach message handler to deserialize pulse messages.
 * @param {number} port Listening port.
 * @param {pulseDeserializer} callback Message handler to deserialize pulse messages.
 */
export function recvMsg(port: number, callback: pulseDeserializer) {
    // API routine
    messagelayer_stats.port = port.toString();
    server.bind(port);
    server.on("message", (msg, rinfo) => {
        var incomingTimestamp = (messagelayer_stats.lastInTimestamp = now());
        messagelayer_stats.inOctets += msg.length;
        messagelayer_stats.inMsgs++;
        logger.info(`messagelayer server received: ${msg} from ${rinfo.address}:${rinfo.port}`); // INSTRUMENTATION POINT
        var incomingMessage = `${incomingTimestamp},${msg}`; // prepend our timeStamp
        messagelayer_stats.lastInMsg = incomingMessage;
        callback(incomingMessage);
    });
}

//    SENDER CODE

/**
 * Send same message to all nodes in nodelist.
 * Example pulseMsg: "0,Build.200619.1110,DEVOPS,DEVOPS.1,194,1592591506442,1592590923743,1,2,1, from 71.202.2.184:64339"
 * @param {string} outgoingMessage Stringified pulse message as in example above
 * @param {string[]} nodelist List of nodes' addresses in IP_PORT format
 */
export function sendMsg(outgoingMessage: string, nodelist: string[]) {
    // API routine
    nodelist.forEach(function (node: string) {
        const ipaddr = node.split("_")[0];
        const port = Number(node.split("_")[1]) || 65013;
        const timestampedMsg = "" + now() + "," + outgoingMessage;
        const message = Buffer.from(timestampedMsg);
        messagelayer_stats.outMsgs++;
        messagelayer_stats.lastOutTimestamp = now();
        messagelayer_stats.lastOutMsg = timestampedMsg;
        messagelayer_stats.outOctets += message.length;
        logger.info(`messagelayer client sending ${timestampedMsg} to ${ipaddr}:${port}`);
        client.send(message, 0, message.length, port, ipaddr, (err: Error | null) => {
                if (err) {
                    logger.error(`messagelayer sendMessage()`);
                }
            }
        );
    });
}
