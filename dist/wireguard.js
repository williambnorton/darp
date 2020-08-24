"use strict";
/** @module wireguard configure wireguard conf file in wireguard as darp.pending.conf */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setWireguard = exports.addPeerWGStanza = exports.addMyWGStanza = exports.wgdump = exports.getPublicKey = void 0;
var fs = require("fs");
var lib_1 = require("./lib");
var WGDIR = process.env.WGDIR; //this is the direcvtory to build and evolve wg config files
function getPublicKey() {
    return fs.readFileSync(WGDIR + "/publickey", "utf8");
}
exports.getPublicKey = getPublicKey;
function wgdump() {
    var wgconfig = "";
    try {
        wgconfig = fs.readFileSync(WGDIR + "/darp0.conf", "utf8");
    }
    catch (err) {
        console.log("wireguard: dumpWGconf() ERROR");
    }
    console.log("wgconfig=" + wgconfig);
}
exports.wgdump = wgdump;
//
//  addMyWGStanza() - the interface stanza for the node itself
//
function addMyWGStanza(geo, ipaddr, port, mint, publickey) {
    var line0 = "#  " + lib_1.ts() + " Auto generated wireguard config file for DARP";
    var line1 = "#  " + geo + " " + ipaddr + ":" + port + " mint=" + mint + " PUBLICKEY=" + publickey;
    var ip = lib_1.mint2IP(mint); //private address for this node
    var line2 = "     Address = " + ip + "/32, fd86:ea04:1115::" + mint + "/64";
    var line3 = "     ListenPort = 80";
    return line0 + "\n" + line1 + "\n" + line2 + "\n" + line3;
}
exports.addMyWGStanza = addMyWGStanza;
//
//  addPeerWGStanza() - the peer stanzas for the node itself
//
function addPeerWGStanza(geo, ipaddr, port, mint, publickey) {
    var ip = lib_1.mint2IP(mint); //private address for this node
    var line1 = "#\n" +
        "# " + geo + " can send to us on this channel mint=" + mint + "\n" +
        "[Peer]\n" +
        "PublicKey = " + publickey + "\n" +
        "AllowedIPs = " + ip + "/32, fd86:ea04:1115::" + mint + "/128\n" +
        "Endpoint = " + ipaddr + ":" + "80" + "\n" +
        "PersistentKeepalive = 25" + "\n\n";
    return line1;
}
exports.addPeerWGStanza = addPeerWGStanza;
function setWireguard(stanzas) {
    //we assume these file were set by configWG.bash script
    var BASECONFIG = "";
    try {
        BASECONFIG = fs.readFileSync(WGDIR + "/wgbase.conf", "utf8");
    }
    catch (err) {
        BASECONFIG = "deadbeef00deadbeef00deadbeef0012";
    }
    fs.writeFile(WGDIR + "/darp0.pending.conf", BASECONFIG + stanzas, function (err) {
        if (err)
            throw err;
    });
}
exports.setWireguard = setWireguard;
