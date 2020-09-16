"use strict";
/** @module receiver listens to messages from a group of nodes */
exports.__esModule = true;
var dgram = require("dgram");
var lib_1 = require("./lib");
var logger_1 = require("./logger");
var types_1 = require("./types");
logger_1.logger.setLevel(logger_1.LogLevel.ERROR);
var LISTENING_PORT = parseInt(process.argv[2]);
var receiver = dgram.createSocket("udp4");
receiver.on("error", function (err) {
    logger_1.logger.error("Receiver error:\n" + err.stack);
    receiver.close();
});
receiver.on("listening", function () {
    var address = receiver.address();
    logger_1.logger.info("Receiver listening " + address.address + ":" + address.port);
});
receiver.on("message", function (pulseBuffer, rinfo) {
    var incomingTimestamp = lib_1.now().toString();
    logger_1.logger.info("Received " + pulseBuffer + " from " + rinfo.address + ":" + rinfo.port);
    // prepend our timeStamp
    var incomingMessage = incomingTimestamp + "," + pulseBuffer.toString(types_1.PulseMessageEncoding.latin1);
    if (typeof process.send !== "undefined") {
        process.send(incomingMessage);
    }
});
receiver.bind(LISTENING_PORT);
