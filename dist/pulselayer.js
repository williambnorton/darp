"use strict";
/** @module pulselayer send "pulse" UDP message to all nodes */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPulses = exports.recvPulses = void 0;
var lib_1 = require("./lib");
var logger_1 = require("./logger");
var messagelayer_1 = require("./messagelayer");
/**
 * Bind the port to receive pulses and deserialiaze them into structured data.
 * @param {number} port Listening port.
 * @param {incomingPulseCallback} callback Function to deserialize the incoming pulse data.
 */
function recvPulses(port, callback) {
    messagelayer_1.recvMsg(port, function (incomingMessage) {
        //one-time set up of message handler callback
        logger_1.logger.info("pulselayer recvMsg callback: incomingMessage=" + incomingMessage);
        var ary = incomingMessage.split(",");
        var pulseTimestamp = parseInt(ary[0]);
        var senderTimestamp = parseInt(ary[1]);
        var OWL = pulseTimestamp - senderTimestamp;
        var owlsStart = lib_1.nth_occurrence(incomingMessage, ",", 9); //owls start after the 7th comma
        var pulseOwls = incomingMessage.substring(owlsStart + 1, incomingMessage.length);
        var pulse = {
            pulseTimestamp: pulseTimestamp,
            outgoingTimestamp: senderTimestamp,
            msgType: ary[2],
            version: ary[3],
            geo: ary[4],
            group: ary[5],
            seq: parseInt(ary[6]),
            bootTimestamp: parseInt(ary[7]),
            mint: parseInt(ary[8]),
            owls: pulseOwls,
            owl: OWL,
            lastMsg: incomingMessage,
        };
        logger_1.logger.debug("pulselayer recvMsg callback: message=" + incomingMessage + " owlstart=" + owlsStart + ", pulseOwls=" + pulseOwls);
        logger_1.logger.debug("pulselayer recvMsg callback: structured pulse=" + lib_1.dump(pulse));
        callback(pulse);
    });
}
exports.recvPulses = recvPulses;
/**
 * Forwards message to nodes in the list. Wraps messagelayer functionality.
 * @param {string} msg Pulse message serialized.
 * @param {string[]} nodelist List of nodes' IP adresses (can be empty).
 */
function sendPulses(msg, nodelist) {
    messagelayer_1.sendMsg(msg, nodelist);
}
exports.sendPulses = sendPulses;
