/** @module wireguard configure wireguard conf file in wireguard as darp.pending.conf */

import fs = require("fs");
import { ts, mint2IP } from "./lib";

const WGDIR = process.env.WGDIR; //this is the direcvtory to build and evolve wg config files

export function getPublicKey() {
    return fs.readFileSync(WGDIR + "/publickey", "utf8");
}

export function wgdump() {
    var wgconfig = "";
    try {
        wgconfig = fs.readFileSync(WGDIR + "/darp0.conf", "utf8");
    } catch (err) {
        console.log("wireguard: dumpWGconf() ERROR");
    }
    console.log("wgconfig=" + wgconfig);
}

//
//  addMyWGStanza() - the interface stanza for the node itself
//
export function addMyWGStanza(geo: string, ipaddr: string, port: number, mint: number, publickey: string): string {
    var line0 = "#" //#`#  ${ts()} Auto generated wireguard config file for DARP`;
    var line1 = `#  ${geo} ${ipaddr}:${port} mint=${mint} PUBLICKEY=${publickey}`;
    const ip = mint2IP(mint); //private address for this node
    var line2 = `     Address = ${ip}/32, fd86:ea04:1115::${mint}/64`;
    var line3 = `     ListenPort = ${port+mint}`;
    return line0 + "\n" + line1 + "\n" + line2 + "\n" + line3;
}

//
//  addPeerWGStanza() - the peer stanzas for the node itself
//
export function addPeerWGStanza(geo: string, ipaddr: string, port: number, mint: number, publickey: string): string {
    const ip = mint2IP(mint); //private address for this node
    var line1 = "#\n" +
        "# " + geo + " can send to us on this channel mint=" + mint + "\n" +
        "[Peer]\n" +
        "PublicKey = " + publickey + "\n" +
        "AllowedIPs = " + ip + "/32, fd86:ea04:1115::" + mint + "/128\n" +
        "Endpoint = " + ipaddr + ":" + "80" + "\n" +
        "PersistentKeepalive = 25" + "\n\n";
    return line1;
}

export function setWireguard(stanzas: string) {
    //we assume these file were set by configWG.bash script
    var BASECONFIG = "";
    try {
        BASECONFIG = fs.readFileSync(WGDIR + "/wgbase.conf", "utf8");
    } catch (err) {
        BASECONFIG = "deadbeef00deadbeef00deadbeef0012";
    }

    fs.writeFile(
        WGDIR + "/darp0.pending.conf",
        BASECONFIG + stanzas,
        (err) => {
            if (err) throw err;
        }
    );
}
