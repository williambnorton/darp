"use strict";
exports.__esModule = true;
//
//  handlePulse - receive incoming pulses and store in redis
//
var lib_js_1 = require("../lib/lib.js");
console.log("Starting HANDLEPULSE GENESIS=" + process.env.GENESIS + " PORT=" + process.env.PORT + " HOSTNAME=" + process.env.HOSTNAME + " VERSION=" + process.env.VERSION + " MYIP=" + process.env.MYIP);
var OWLEXPIRES = 10; //seconds should match polling cycle time
var SHOWPULSES = "0";
var pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client
var dgram = require('dgram');
var server = dgram.createSocket('udp4');
var MYBUILD = "";
var isGenesisNode = false;
redisClient.hgetall("mint:0", function (err, me) {
    console.log("HANDLEPULSE starting with me=" + lib_js_1.dump(me));
    redisClient.hgetall("mint:1", function (err, genesis) {
        if (me == null) {
            console.log(lib_js_1.ts() + "HANDLEPULSE started with no genesis mint:1 EXITTING...");
            process.exit(36);
        }
        else {
            SHOWPULSES = me.SHOWPULSES;
            console.log(lib_js_1.ts() + "HANDLEPULSE started with genesis=" + lib_js_1.dump(genesis));
            if (genesis == null) {
                for (var i = 10; i > 0; i--)
                    console.log(lib_js_1.ts() + "Genesis not connected - exitting - another loop around");
                process.exit(36);
            }
            for (var i = 10; i > 0; i--)
                console.log(lib_js_1.ts() + "DARP COMPONENTS STARTED-Point your browser to http://" + me.ipaddr + ":" + me.port + "/");
        }
    });
});
console.log(lib_js_1.ts() + "handlePulse: Starting");
//
//  mint:0 is me and my configuration, mint:1 is the groupOwner - a Genesis node
//
redisClient.hgetall("mint:0", function (err, me) {
    //console.log("handlePulse(): Configuration  me="+dump(me));
    MYBUILD = me.version;
    isGenesisNode = me.isGenesisNode;
    console.log(lib_js_1.ts() + "handlepulse(): Binding pulsePort on UDP port " + me.port);
    server.bind(me.port, "0.0.0.0");
});
function checkAdminControl() {
    //console.log(ts()+"checkAdminControl");
    redisClient.hget("mint:0", "adminControl", function (err, adminControl) {
        if (adminControl == "RELOAD") {
            console.log(lib_js_1.ts() + "RELOAD SOFTWARE adminControl=" + adminControl);
            process.exit(36);
        }
        if (adminControl == "STOP" || adminControl == "REBOOT") {
            console.log(lib_js_1.ts() + "STOP/REBOOT adminControl=" + adminControl);
            process.exit(86);
        }
    });
    setTimeout(checkAdminControl, 500); //how often we check for cmds
}
setTimeout(checkAdminControl, 1000);
//
//  only callback if authenticated
//
function authenticatedPulse(pulse, callback) {
    redisClient.hgetall("mint:" + pulse.srcMint, function (err, senderMintEntry) {
        if (senderMintEntry == null) {
            console.log("authenticatedPulse(): DROPPING MESSAGE We don't (yet) have a mint entry for mint " + pulse.srcMint + " this pulse:" + lib_js_1.dump(pulse));
            //callback(null,false);
        }
        else {
            //simple authentication matches mint to other resources
            if ((senderMintEntry.geo == pulse.geo) && (senderMintEntry.mint == pulse.srcMint)) {
                pulse.ipaddr = senderMintEntry.ipaddr; //for convenience
                pulse.port = senderMintEntry.port; //for convenience
                callback(pulse, true);
            }
            else {
                console.log("HANDLEPULSE(): authenticatedPulse(): unauthenticated packet - geo " + pulse.geo + " was not a match for " + pulse.srcMint + " in our mint table...we had: " + senderMintEntry.geo + " mint= " + senderMintEntry.mint); //+dump(pulse)+dump(senderMintEntry.geo));
                //callback(null,false)
            }
        }
    });
}
//
//  message format: 0,56,1583783486546,MAZORE,MAZORE.1,1>1=0,2>1=0
//
//    from pulser.ts:
//var pulseMessage="0,"+me.version+","+me.geo+","+pulseGroup+","+seq+","+now()+","+me.mint+",";  //MAZORE:MAZJAP.1
//
server.on('message', function (message, remote) {
    //if (SHOWPULSES == "1")
    console.log(lib_js_1.ts() + "HANDLEPULSE: received pulse " + message.length + " bytes from " + remote.address + ':' + remote.port + ' - ' + message);
    var msg = message.toString();
    var ary = msg.split(",");
    //try {
    var pulseTimestamp = ary[5]; //1583783486546
    var OWL = lib_js_1.now() - pulseTimestamp;
    if (OWL <= -999)
        OWL = -99999; //FOR DEBUGGING ... we can filter out clocks greater than +/- 99 seconds off
    if (OWL >= 999)
        OWL = 99999; //bad clocks lead to really large OWL pulses 
    var pulseLabel = ary[2] + ":" + ary[3];
    var owlsStart = nth_occurrence(msg, ',', 8); //owls start after the 7th comma
    var pulseOwls = msg.substring(owlsStart + 1, msg.length - 1);
    //console.log(ts()+"**************************handlepulse(): owls="+owls);  //INSTRUMENTAITON POINT
    redisClient.hgetall(pulseLabel, function (err, lastPulse) {
        //console.log("oldPulse.inMsgs="+oldPulse.inMsgs+" oldPulse.inOctets"+oldPulse.inOctets);
        redisClient.hgetall("mint:0", function (err, me) {
            if (me == null) {
                console.log(lib_js_1.ts() + "HANDLEPULSE(): mint:0 does not exist - Genesis node not up yet...exitting");
                process.exit(36);
            }
            //if (me.state=="RELOAD") process.exit(36);  //this is set when reload button is pressed in express
            //if (me.state=="STOP") process.exit(86);  //this is set when reload button is pressed in express
            if (lastPulse == null) { //first time we see this entry, include stats to increment
                lastPulse = {
                    "inOctets": "0",
                    "inMsgs": "0"
                };
            }
            if (err) {
                console.log("ERROR in on.message handling");
                process.exit(36);
            }
            var pulse = {
                version: ary[1],
                geo: ary[2],
                group: ary[3],
                seq: ary[4],
                pulseTimestamp: pulseTimestamp,
                bootTimestamp: ary[6],
                srcMint: ary[7],
                owls: pulseOwls,
                owl: "" + OWL,
                lastMsg: msg,
                inOctets: "" + (parseInt(lastPulse.inOctets) + message.length),
                inMsgs: "" + (parseInt(lastPulse.inMsgs) + 1)
            };
            authenticatedPulse(pulse, function (pulse, authenticated) {
                if (pulse.srcMint == "1" && pulse.version != MYBUILD) {
                    console.log(lib_js_1.ts() + " ******** HANDLEPULSE(): NEW SOFTWARE AVAILABLE isGenesisNode=" + isGenesisNode + " - GroupOwner said " + pulse.version + " we are running " + MYBUILD + " .......process exitting");
                    console.log("Genesis node pulsed us as " + pulse.version + " MYBUILD=" + MYBUILD + " dump pulse=" + lib_js_1.dump(pulse));
                    process.exit(36); //SOFTWARE RELOAD
                }
                ;
                redisClient.publish("pulses", msg);
                redisClient.hmset(pulseLabel, pulse); //store the pulse
                var d = new Date();
                if (pulse.owl == "")
                    pulse.owl = "0";
                var owlStat = "{ x: new Date('" + d + "'), y: " + pulse.owl + "},";
                redisClient.rpush([pulse.geo + "-" + me.geo, owlStat]);
                //
                //    Store the measured latency for this pulse message to us
                //
                redisClient.set("darp-" + pulse.geo + "-" + me.geo, pulse.owl, 'EX', OWLEXPIRES);
                console.log("handlePulse:");
                //
                //  Store the OWL measures received in the OWLs field and save for 1 pulse cycle 
                //
                storeOWLs(pulse.srcMint, pulse.owls);
                //
                //    Also Store the OWL measured - stick it in the mintTable <--- DELETE THIS LATER
                //
                redisClient.hmset("mint:" + pulse.srcMint, {
                    "owl": pulse.owl,
                    "pulseTimestamp": lib_js_1.now() //mark we just saw this --> we should also keep pushing EXP time out for mintEntry....
                });
            });
        });
    });
});
function storeOWLs(srcMint, owls) {
    console.log("HANDLEPULSE(): storeOWLs srcMint=" + srcMint + " owls=" + owls);
    //
    //    for each owl in pulsed owls, add to history-srcGeo-dstGeo 
    //
    var owlsAry = owls.split(",");
    //console.log("owlsAry="+dump(owlsAry));
    for (var dest in owlsAry) {
        var destMint = owlsAry[dest].split("=")[0];
        var owl = owlsAry[dest].split("=")[1];
        if (typeof owl == "undefined")
            owl = "";
        storeOWL(srcMint, destMint, owl);
    }
}
//
//      storeOWL() - store one way latency to file or graphing & history
//
function storeOWL(srcMint, destMint, owl) {
    console.log("HANDLEPULSE: storeOWL() srcMint=" + srcMint + " destMint=" + destMint + " " + " owl=" + owl);
    redisClient.hgetall("mint:" + srcMint, function (err, srcEntry) {
        redisClient.hgetall("mint:" + destMint, function (err, destEntry) {
            if (srcEntry != null) {
                if (destEntry != null) {
                    //we have src and dst entry - store the OWL
                    //console.log("HANDLEPULSE: storeOWL setting srcEntry.geo="+srcEntry.geo+" dstEntry.geo="+destEntry.geo+" owl="+owl);
                    redisClient.set("darp-" + srcEntry.geo + "-" + destEntry.geo, owl, 'EX', OWLEXPIRES);
                    //Create and store the graph entries <---HACK
                    var d = new Date();
                    if (owl == "")
                        owl = "0";
                    var owlStat = "{ x: new Date('" + d + "'), y: " + owl + "},";
                    console.log("HANDLEPULSE: " + srcEntry.geo + "-" + destEntry.geo + "=" + owlStat);
                    redisClient.rpush([srcEntry.geo + "-" + destEntry.geo, owlStat]);
                }
                else
                    console.log("HANDLEPULSE: We have no mint for this mint: " + destMint);
            }
            else
                console.log("HANDLEPULSE: We have no mint for this mint: " + srcMint);
        });
    });
}
function nth_occurrence(string, char, nth) {
    var first_index = string.indexOf(char);
    var length_up_to_first_index = first_index + 1;
    if (nth == 1) {
        return first_index;
    }
    else {
        var string_after_first_occurrence = string.slice(length_up_to_first_index);
        var next_occurrence = nth_occurrence(string_after_first_occurrence, char, nth - 1);
        if (next_occurrence === -1) {
            return -1;
        }
        else {
            return length_up_to_first_index + next_occurrence;
        }
    }
}
//
//  checkSEversion() - reload SW if there is new code to be had
//this is needed because when genesis dies and doesn't know about the peers - peers must reloadSW
//
setTimeout(checkSWversion, 20 * 1000);
; // see if we need new SW
//checkSWversion();
function checkSWversion() {
    setTimeout(checkSWversion, 20 * 1000);
    ;
    //console.log("checkSWversion() - currentSW="+MYBUILD);
    var http = require("http");
    redisClient.hgetall("mint:1", function (err, genesis) {
        if (err || genesis == null) {
            console.log("checkSWversion(): WE HAVE NO Genesis Node mint:1 pulse error=" + err + " RELOAD");
            process.exit(36);
        }
        var url = "http://" + genesis.ipaddr + ":" + genesis.port + "/version";
        //console.log("checkSWversion(): url="+url);
        http.get(url, function (res) {
            res.setEncoding("utf8");
            var body = "";
            res.on("data", function (data) {
                body += data;
            });
            res.on("end", function () {
                var version = JSON.parse(body);
                //console.log(ts()+"HANDLEPULSE: checkSWversion(): genesis SWversion=="+dump(version)+" currentSW="+MYBUILD);
                if (version != MYBUILD && !isGenesisNode) {
                    console.log(lib_js_1.ts() + " HANDLEPULSE checkSWversion(): NEW SOFTWARE AVAILABLE - GroupOwner said " + version + " we are running " + MYBUILD + " .......process exitting");
                    process.exit(36); //SOFTWARE RELOAD
                }
            });
        });
    });
}
//
// listen for incoming pulses and convert into redis commands
//
server.on('listening', function () {
    var address = server.address();
    console.log(lib_js_1.ts() + "");
    console.log(lib_js_1.ts() + "");
    console.log(lib_js_1.ts() + 'UDP Server listening for pulses on ' + address.address + ':' + address.port);
    console.log(lib_js_1.ts() + "");
    console.log(lib_js_1.ts() + "");
});
process.on('SIGTERM', function () {
    console.info('handlePulse SIGTERM signal received.');
    process.exit(36);
});
