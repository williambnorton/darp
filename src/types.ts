export enum PulseMessageEncoding {
    latin1 = "latin1",
    utf8 = "utf8"
}

// Incoming pulse definition, when deserialized form pulse message. Export for use in pulselayer.
export class IncomingPulse {
    outgoingTimestamp: number;
    pulseTimestamp: number;
    msgType: string;
    version: string;
    geo: string;
    group: string;
    seq: number;
    bootTimestamp: number;
    mint: number;
    owls: string;
    owl: number;
    lastMsg: string;
    constructor(
        pulseTimestamp: number,
        outgoingTimestamp: number,
        msgType: string,
        version: string,
        geo: string,
        group: string,
        seq: number,
        bootTimestamp: number,
        mint: number,
        owls: string,
        owl: number,
        lastMsg: string
    ) {
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
}


