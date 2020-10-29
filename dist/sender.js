"use strict";
/** @module sender emits pulse message to a group of nodes */
exports.__esModule = true;
var dgram = require("dgram");
var logger_1 = require("./logger");
logger_1.logger.setLevel(logger_1.LogLevel.ERROR);
var PULSE_INTERVAL = parseInt(process.argv[2]);
var sender = dgram.createSocket("udp4");
var pulseGroupMap = new Map();
process.on('message', function (senderMessage) {
    pulseGroupMap.set(senderMessage.type, senderMessage.payload);
});
/*
// Send same message to all nodes in nodelist
setInterval(() => {
    const nodeList: NodeAddress[] = pulseGroupMap.get(SenderPayloadType.NodeList)
    const outgoingMessage: string = pulseGroupMap.get(SenderPayloadType.OutgoingMessage)
    nodeList.forEach(function (node: NodeAddress) {
        const outgoingTimestamp = now().toString();
        const pulseMessage = outgoingTimestamp + "," + outgoingMessage;
        const pulseBuffer = Buffer.from(pulseMessage, PulseMessageEncoding.latin1);
        logger.info(`Sending ${pulseMessage} to ${node.ipaddr}:${node.port}`);
        sender.send(pulseBuffer, 0, pulseBuffer.length, node.port, node.ipaddr, (error) => {
            if (error) {
                logger.error(`Sender error: ${error.message}`);
            }
        });
    });
}, PULSE_INTERVAL);
*/ 
