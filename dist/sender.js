"use strict";
/** @module sender emits pulse message to a group of nodes */
exports.__esModule = true;
var dgram = require("dgram");
var lib_1 = require("./lib");
var logger_1 = require("./logger");
var types_1 = require("./types");
logger_1.logger.setLevel(logger_1.LogLevel.ERROR);
var PULSE_INTERVAL = parseInt(process.argv[2]);
var sender = dgram.createSocket("udp4");
var pulseGroupMap = new Map();
process.on('message', function (senderMessage) {
    pulseGroupMap.set(senderMessage.type, senderMessage.payload);
});
// Send same message to all nodes in nodelist
//setInterval(() => {
var nodeList = pulseGroupMap.get(types_1.SenderPayloadType.NodeList);
var outgoingMessage = pulseGroupMap.get(types_1.SenderPayloadType.OutgoingMessage);
nodeList.forEach(function (node) {
    var outgoingTimestamp = lib_1.now().toString();
    var pulseMessage = outgoingTimestamp + "," + outgoingMessage;
    var pulseBuffer = Buffer.from(pulseMessage, types_1.PulseMessageEncoding.latin1);
    logger_1.logger.info("Sending " + pulseMessage + " to " + node.ipaddr + ":" + node.port);
    console.log("Sending " + pulseMessage + " to " + node.ipaddr + ":" + node.port);
    sender.send(pulseBuffer, 0, pulseBuffer.length, node.port, node.ipaddr, function (error) {
        if (error) {
            logger_1.logger.error("Sender error: " + error.message);
        }
    });
});
//}, PULSE_INTERVAL);
