/** @module sender emits pulse message to a group of nodes */

import dgram = require("dgram");
import { now } from "./lib";
import { logger, LogLevel } from "./logger";
import { NodeAddress, PulseMessageEncoding, SenderMessage, SenderPayloadType } from "./types";

logger.setLevel(LogLevel.ERROR);

const PULSE_INTERVAL = parseInt(process.argv[2]);
const sender = dgram.createSocket("udp4");
const pulseGroupMap = new Map();

process.on('message', (senderMessage: SenderMessage) => {
    pulseGroupMap.set(senderMessage.type, senderMessage.payload);
});

// Send same message to all nodes in nodelist
//setInterval(() => {
    const nodeList: NodeAddress[] = pulseGroupMap.get(SenderPayloadType.NodeList)
    const outgoingMessage: string = pulseGroupMap.get(SenderPayloadType.OutgoingMessage)
    nodeList.forEach(function (node: NodeAddress) {
        const outgoingTimestamp = now().toString();
        const pulseMessage = outgoingTimestamp + "," + outgoingMessage;
        const pulseBuffer = Buffer.from(pulseMessage, PulseMessageEncoding.latin1);
        logger.info(`Sending ${pulseMessage} to ${node.ipaddr}:${node.port}`);
        console.log(`Sending ${pulseMessage} to ${node.ipaddr}:${node.port}`);
        sender.send(pulseBuffer, 0, pulseBuffer.length, node.port, node.ipaddr, (error) => {
            if (error) {
                logger.error(`Sender error: ${error.message}`);
            }
        });
    });
//}, PULSE_INTERVAL);
