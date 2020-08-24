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

// Example OutgoingMessage: "0,Build.200619.1110,DEVOPS,DEVOPS.1,194,1592591506442,1592590923743,1,2,1, from 71.202.2.184:64339"
export enum SenderPayloadType {
    NodeList,
    OutgoingMessage
}

export class NodeAddress {
    ipaddr: string;
    port: number;
    constructor (ipaddr: string, port: number) {
        this.ipaddr = ipaddr;
        this.port = port;
    }
}

export class SenderMessage {
    // message sent by parent process to "sender" child_process
    type: SenderPayloadType;
    payload: NodeAddress[] | string;
    constructor (type: SenderPayloadType, payload: NodeAddress[] | string) {
        this.type = type;
        this.payload = payload;
    }
}
