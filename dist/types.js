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
