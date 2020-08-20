"use strict";
/** @module messagelayer send and receive message to group of nodes */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMsg = exports.recvMsg = exports.messagelayer_stats = void 0;
var lib_1 = require("./lib");
var logger_1 = require("./logger");
var dgram = require("dgram");
// Create the UDP message bus for communication with all nodes
// All others only have to deal with message, we timestamp and queue it here
var server = dgram.createSocket("udp4");
var client = dgram.createSocket("udp4");
exports.messagelayer_stats = {
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
server.on("error", function (err) {
    logger_1.logger.error("messagelayer server error:\n" + err.stack);
    logger_1.logger.error("messagelayer server error - server recev error - not sure if we should continue...");
    //server.close();
});
server.on("listening", function () {
    var address = server.address();
    logger_1.logger.info("messagelayer server listening " + address.address + ":" + address.port);
});
/**
 * Bind listening port and attach message handler to deserialize pulse messages.
 * @param {number} port Listening port.
 * @param {pulseDeserializer} callback Message handler to deserialize pulse messages.
 */
function recvMsg(port, callback) {
    // API routine
    exports.messagelayer_stats.port = port.toString();
    server.bind(port);
    server.on("message", function (msg, rinfo) {
        var incomingTimestamp = (exports.messagelayer_stats.lastInTimestamp = lib_1.now());
        exports.messagelayer_stats.inOctets += msg.length;
        exports.messagelayer_stats.inMsgs++;
        logger_1.logger.info("messagelayer server received: " + msg + " from " + rinfo.address + ":" + rinfo.port); // INSTRUMENTATION POINT
        var incomingMessage = incomingTimestamp + "," + msg; // prepend our timeStamp
        exports.messagelayer_stats.lastInMsg = incomingMessage;
        callback(incomingMessage);
    });
}
exports.recvMsg = recvMsg;
//    SENDER CODE
/**
 * Send same message to all nodes in nodelist.
 * Example pulseMsg: "0,Build.200619.1110,DEVOPS,DEVOPS.1,194,1592591506442,1592590923743,1,2,1, from 71.202.2.184:64339"
 * @param {string} outgoingMessage Stringified pulse message as in example above
 * @param {string[]} nodelist List of nodes' addresses in IP_PORT format
 */
function sendMsg(outgoingMessage, nodelist) {
    // API routine
    nodelist.forEach(function (node) {
        var ipaddr = node.split("_")[0];
        var port = Number(node.split("_")[1]) || 65013;
        var timestampedMsg = "" + lib_1.now() + "," + outgoingMessage;
        var message = Buffer.from(timestampedMsg);
        exports.messagelayer_stats.outMsgs++;
        exports.messagelayer_stats.lastOutTimestamp = lib_1.now();
        exports.messagelayer_stats.lastOutMsg = timestampedMsg;
        exports.messagelayer_stats.outOctets += message.length;
        logger_1.logger.info("messagelayer client sending " + timestampedMsg + " to " + ipaddr + ":" + port);
        client.send(message, 0, message.length, port, ipaddr, function (err) {
            if (err) {
                logger_1.logger.error("messagelayer sendMessage()");
            }
        });
    });
}
exports.sendMsg = sendMsg;
