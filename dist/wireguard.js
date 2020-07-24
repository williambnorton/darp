"use strict";
/** @module wireguard configure wireguard conf file in wireguard as darp.pending.conf */
exports.__esModule = true;
var lib_1 = require("./lib");
//import pulseRedis = require('redis');
var WGDIR = process.env.DARPDIR + "/wireguard"; //this is the direcvtory to build and evolve wg config files
//const redisClient = pulseRedis.createClient(); //creates a new client
function getPublicKey() {
    return require('fs').readFileSync(WGDIR + '/publickey', 'utf8');
}
exports.getPublicKey = getPublicKey;
function wgdump() {
    var wgconfig = "";
    try {
        wgconfig = require('fs').readFileSync(WGDIR + '/darp0.conf', 'utf8');
    }
    catch (err) {
        console.log("wireguard: dumpWGconf() ERROR");
    }
    console.log("wgconfig=" + wgconfig);
}
exports.wgdump = wgdump;
function addMyWGStanza(geo, ipaddr, port, mint, publickey) {
    var line1 = "#    Individual entry for peer node: " + geo + " " + ipaddr + " " + port + " mint=" + mint + " " + lib_1.ts() + " my shared PUBLICKEY=" + publickey + " auto generated by wireguard.ts";
    var octet3 = Math.round(mint / 254);
    var octet4 = mint % 254;
    var line2 = "     Address = 10.10." + octet3 + "." + octet4 + "/32, fd86:ea04:1115::" + mint + "/64";
    var line3 = "     ListenPort = 80";
    return line1 + "\n" + line2 + "\n" + line3;
}
exports.addMyWGStanza = addMyWGStanza;
function addPeerWGStanza(geo, ipaddr, port, mint, publickey) {
    var octet3 = Math.round(mint / 254);
    var octet4 = mint % 254;
    var line1 = "#\n" +
        "# " + geo + " can send to us on this channel mint=" + mint + "\n" +
        "[Peer]\n" +
        "PublicKey = " + publickey + "\n" +
        "AllowedIPs = 10.10." + octet3 + "." + octet4 + "/32, fd86:ea04:1115::" + mint + "/128\n" +
        "Endpoint = " + ipaddr + ":" + "80" + "\n" +
        "PersistentKeepalive = 25" + "\n\n";
    return line1;
}
exports.addPeerWGStanza = addPeerWGStanza;
function setWireguard(stanzas) {
    //we assume these file were set by configWG.bash script
    console.log("setWireguard(): saving mint entry as stanza for each wg connection." + stanzas);
    var BASECONFIG = "";
    try {
        BASECONFIG = require('fs').readFileSync(WGDIR + '/wgbase.conf', 'utf8');
    }
    catch (err) {
        BASECONFIG = "deadbeef00deadbeef00deadbeef0012";
    }
    //console.log("setWireguard(): CONFIG="+BASECONFIG+Stanzas);
    var fs = require('fs');
    fs.writeFile(WGDIR + '/darp0.pending.conf', BASECONFIG + stanzas, function (err) {
        // throws an error, you could also catch it here
        if (err)
            throw err;
        console.log("***************************** wireguard.ts: WRITING wgConfig file: " + WGDIR + "/darp0.conf :");
        console.log(stanzas);
        //wgdump();                            
    });
}
exports.setWireguard = setWireguard;
;
