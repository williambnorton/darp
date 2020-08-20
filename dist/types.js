"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SenderMessage = exports.NodeAddress = exports.SenderPayloadType = exports.IncomingPulse = exports.MessagelayerStats = exports.PulseMessageEncoding = void 0;
var PulseMessageEncoding;
(function (PulseMessageEncoding) {
    PulseMessageEncoding["latin1"] = "latin1";
    PulseMessageEncoding["utf8"] = "utf8";
})(PulseMessageEncoding = exports.PulseMessageEncoding || (exports.PulseMessageEncoding = {}));
// TODO: remove, as this is not used anywhere 
var MessagelayerStats = /** @class */ (function () {
    function MessagelayerStats() {
        this.port = "";
        this.inMsgs = 0;
        this.outMsgs = 0;
        this.lastInTimestamp = 0;
        this.lastOutTimestamp = 0;
        this.inOctets = 0;
        this.outOctets = 0;
        this.lastInMsg = "";
        this.lastOutMsg = "";
    }
    return MessagelayerStats;
}());
exports.MessagelayerStats = MessagelayerStats;
// Incoming pulse definition, when deserialized form pulse message. Export for use in pulselayer.
var IncomingPulse = /** @class */ (function () {
    function IncomingPulse(pulseTimestamp, outgoingTimestamp, msgType, version, geo, group, seq, bootTimestamp, mint, owls, owl, lastMsg) {
        this.pulseTimestamp = pulseTimestamp;
        this.outgoingTimestamp = outgoingTimestamp;
        this.msgType = msgType;
        this.version = version;
        this.geo = geo;
        this.group = group;
        this.seq = seq;
        this.bootTimestamp = bootTimestamp; //if genesis node reboots --> all node reload SW too
        this.mint = mint;
        this.owls = owls;
        this.owl = owl;
        this.lastMsg = lastMsg;
    }
    return IncomingPulse;
}());
exports.IncomingPulse = IncomingPulse;
// Example OutgoingMessage: "0,Build.200619.1110,DEVOPS,DEVOPS.1,194,1592591506442,1592590923743,1,2,1, from 71.202.2.184:64339"
var SenderPayloadType;
(function (SenderPayloadType) {
    SenderPayloadType[SenderPayloadType["NodeList"] = 0] = "NodeList";
    SenderPayloadType[SenderPayloadType["OutgoingMessage"] = 1] = "OutgoingMessage";
})(SenderPayloadType = exports.SenderPayloadType || (exports.SenderPayloadType = {}));
var NodeAddress = /** @class */ (function () {
    function NodeAddress(ipaddr, port) {
        this.ipaddr = ipaddr;
        this.port = port;
    }
    return NodeAddress;
}());
exports.NodeAddress = NodeAddress;
var SenderMessage = /** @class */ (function () {
    function SenderMessage(type, payload) {
        this.type = type;
        this.payload = payload;
    }
    return SenderMessage;
}());
exports.SenderMessage = SenderMessage;
