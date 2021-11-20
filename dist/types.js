"use strict";
exports.__esModule = true;
var PulseMessageEncoding;
(function (PulseMessageEncoding) {
    PulseMessageEncoding["latin1"] = "latin1";
    PulseMessageEncoding["utf8"] = "utf8";
})(PulseMessageEncoding = exports.PulseMessageEncoding || (exports.PulseMessageEncoding = {}));
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
/*
Each pulseGroup will send on their own
// Example OutgoingMessage: "0,Build.200619.1110,DEVOPS,DEVOPS.1,194,1592591506442,1592590923743,1,2,1, from 71.202.2.184:64339"
export enum SenderPayloadType {
    NodeList,
    OutgoingMessage
}
*/
var NodeAddress = /** @class */ (function () {
    function NodeAddress(ipaddr, port) {
        this.ipaddr = ipaddr;
        this.port = port;
    }
    return NodeAddress;
}());
exports.NodeAddress = NodeAddress;
