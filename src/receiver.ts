/** @module receiver listens to messages from a group of nodes */

import dgram = require("dgram");
import { now } from "./lib";
import { logger, LogLevel } from "./logger";
import { PulseMessageEncoding } from "./types";

logger.setLevel(LogLevel.ERROR);

const LISTENING_PORT = parseInt(process.argv[2]);
const receiver = dgram.createSocket("udp4");

receiver.on("error", (err) => {
    logger.error(`Receiver error:\n${err.stack}`);
    //receiver.close();
});

receiver.on("listening", () => {
    const address = receiver.address();
    logger.info(`Receiver listening ${address.address}:${address.port}`);
});

receiver.on("message", (pulseBuffer, rinfo) => {
    const incomingTimestamp = now().toString();
    logger.info(`Received ${pulseBuffer} from ${rinfo.address}:${rinfo.port}`);
    // prepend our timeStamp
    const incomingMessage = incomingTimestamp + "," + pulseBuffer.toString(PulseMessageEncoding.latin1);
    if (typeof process.send !== "undefined") {
        process.send(incomingMessage);
    }
});

receiver.bind(LISTENING_PORT);

// TODO: remove, as these are not used anywhere
// messagelayerStats.port = port.toString();
// then on every message received
// messagelayerStats.lastInTimestamp = now();
// messagelayerStats.inOctets += msg.length;
// messagelayerStats.inMsgs++;
// messagelayerStats.lastInMsg = incomingMessage;