"use strict";
exports.__esModule = true;
//
//  PROCESSPULSE - receive incoming pulses and store in redis
//
var lib_js_1 = require("../lib/lib.js");
console.log("^^^^Starting PROCESSPULSE GENESIS=" + process.env.GENESIS + " PORT=" + process.env.PORT + " HOSTNAME=" + process.env.HOSTNAME + " VERSION=" + process.env.VERSION + " MYIP=" + process.env.MYIP);
//subscribe to feed - print it out.
var OWLEXPIRES = 2; //seconds should match polling cycle time
var SHOWPULSES = "0";
var pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client
var dgram = require('dgram');
var server = dgram.createSocket('udp4');
var MYBUILD = "";
var isGenesisNode = false;
redisClient.hgetall("mint:0", function (err, me) {
    if (err)
        console.log("processpulse(): error fetching mint:0 me");
    if (me == null)
        return console.log("processpulse() me==null returning");
    console.log("PROCESSPULSE starting with me=" + lib_js_1.dump(me));
    redisClient.hgetall("mint:1", function (err, genesis) {
        console.log(lib_js_1.ts() + "PROCESSPULSE started with genesis=" + lib_js_1.dump(genesis));
        if (err)
            console.log("no genesis - error=" + err);
        if (genesis == null) {
            console.log(lib_js_1.ts() + "PROCESSPULSE started with no genesis mint:1 EXITTING...");
            process.exit(36);
        }
        else {
            SHOWPULSES = me.SHOWPULSES;
            console.log(lib_js_1.ts() + "PROCESSPULSE started with genesis=" + lib_js_1.dump(genesis));
            //if (genesis == null) {
            //    for (var i = 10; i > 0; i--) console.log(ts() + "Genesis not connected - exitting - another loop around");
            //    process.exit(36)
            // }
            for (var i = 10; i > 0; i--)
                console.log(lib_js_1.ts() + "DARP COMPONENTS STARTED - instrumentation at http://" + me.ipaddr + ":" + me.port + "/");
        }
    });
});
console.log(lib_js_1.ts() + "PROCESSPULSE: Starting....");
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
                console.log("PROCESSPULSE(): authenticatedPulse(): unauthenticated packet - geo " + pulse.geo + " was not a match for " + pulse.srcMint + " in our mint table...we had: " + senderMintEntry.geo + " mint= " + senderMintEntry.mint); //+dump(pulse)+dump(senderMintEntry.geo));
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
//server.on('message', function(message, remote) {
function waitForPush() {
    console.log("waitForPush(): STARTING");
    redisClient.brpop('rawpulses', 0, function (err, incomingPulse) {
        if (err)
            throw err;
        console.log("waitForPush(): incomingPulse=" + incomingPulse);
        if (incomingPulse != null) {
            var ary = incomingPulse.toString().split(",");
            var channel = ary.pop();
            var message = ary.join(",");
            var incomingTimestamp = ary[0];
            console.log("channel=" + channel + " incomingTimestamp=" + incomingTimestamp + " message=" + message);
            // FIX THESE
            //            console.log("message="+dump(message));
            var incomingPulseTimestamp = incomingTimestamp; //find this
            var pulseTimestamp = ary[5]; //1583783486546
            var OWL = incomingPulseTimestamp - pulseTimestamp;
            //            console.log("measured OWL="+OWL+" for message="+message);
            var owlsStart = nth_occurrence(message, ',', 8); //owls start after the 7th comma
            var pulseOwls = message.substring(owlsStart + 1, message.length - 1);
            var pulse = {
                version: ary[1],
                geo: ary[2],
                group: ary[3],
                seq: ary[4],
                pulseTimestamp: ary[5],
                bootTimestamp: ary[6],
                srcMint: ary[7],
                owls: pulseOwls,
                owl: "" + OWL,
                lastMsg: message,
                inOctets: "" + message.length,
                inMsgs: "" + 1,
                median: "0",
                pktDrops: "0"
            };
            ;
            console.log("structured pulse=" + lib_js_1.dump(pulse));
            processpulse(incomingPulseTimestamp, message);
            redisClient.publish("pulses", pulse);
        }
        waitForPush();
    });
}
waitForPush();
function processpulse(incomingTimestamp, messagebuffer) {
    console.log("processpulse(): incomingTimestamp=" + incomingTimestamp + " messagebuffer: " + messagebuffer);
    var message = messagebuffer.toString();
    //  if (SHOWPULSES == "1")
    //waitForPush();
    //      console.log(ts() + "PROCESSPULSE: received pulse " + message.length + " bytes from " + remote.address + ':' + remote.port + ' - ' + message/*+dump(remote)*/);
    console.log(lib_js_1.ts() + "PROCESSPULSE: received pulse " + message);
    //var message = item;
    //      var msg = message.toString();
    var ary = message.toString().split(",");
    //try {
    var pulseTimestamp = ary[5]; //1583783486546
    var OWL = incomingTimestamp - pulseTimestamp;
    console.log("measured OWL=" + OWL + " for message=" + message);
    //if (OWL <= -999) OWL = -99999; //FOR DEBUGGING ... we can filter out clocks greater than +/- 99 seconds off
    //if (OWL >= 999) OWL = 99999;  //bad clocks lead to really large OWL pulses 
    var pulseLabel = ary[2] + ":" + ary[3];
    var owlsStart = nth_occurrence(message, ',', 8); //owls start after the 7th comma
    var pulseOwls = message.substring(owlsStart + 1, message.length - 1);
    //console.log(ts()+"**************************PROCESSPULSE(): owls="+owls);  //INSTRUMENTAITON POINT
    redisClient.hgetall(pulseLabel, function (err, lastPulse) {
        //console.log("oldPulse.inMsgs="+oldPulse.inMsgs+" oldPulse.inOctets"+oldPulse.inOctets);
        redisClient.hgetall("mint:0", function (err, me) {
            if (me == null) {
                console.log(lib_js_1.ts() + "PROCESSPULSE(): mint:0 does not exist - Genesis node not up yet...exitting");
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
                lastMsg: message,
                inOctets: "" + (parseInt(lastPulse.inOctets) + message.length),
                inMsgs: "" + (parseInt(lastPulse.inMsgs) + 1),
                median: "0",
                pktDrops: "0"
            };
            var pktDrops = "" + (parseInt(pulse.seq) - parseInt(pulse.inMsgs));
            pulse.pktDrops = pktDrops;
            authenticatedPulse(pulse, function (pulse, authenticated) {
                if ((pulse.srcMint == 1) && (pulse.version != MYBUILD)) {
                    console.log(lib_js_1.ts() + " ******** PROCESSPULSE(): GENESIS SAID NEW SOFTWARE AVAILABLE isGenesisNode=" + isGenesisNode + " - GroupOwner said " + pulse.version + " we are running " + MYBUILD + " .......process exitting");
                    console.log(lib_js_1.ts() + " ******** PROCESSPULSE(): GENESIS SAID NEW SOFTWARE AVAILABLE isGenesisNode=" + isGenesisNode + " - GroupOwner said " + pulse.version + " we are running " + MYBUILD + " .......process exitting");
                    console.log(lib_js_1.ts() + " ******** PROCESSPULSE(): GENESIS SAID NEW SOFTWARE AVAILABLE isGenesisNode=" + isGenesisNode + " - GroupOwner said " + pulse.version + " we are running " + MYBUILD + " .......process exitting");
                    console.log("Genesis node pulsed us as " + pulse.version + " MYBUILD=" + MYBUILD + " dump pulse=" + lib_js_1.dump(pulse));
                    process.exit(36); //SOFTWARE RELOAD
                }
                ;
                redisClient.hset("mint:" + pulse.srcMint, "state", "RUNNING"); //GREEN-RUNNING means we received a pulse from it
                redisClient.lpush(pulse.geo + "-" + me.geo + "-history", "" + OWL); //store incoming pulse
                redisClient.lrange(pulse.geo + "-" + me.geo + "-history", -300, -1, function (err, data) {
                    if (err) {
                        console.log("iPROCESSPULSE() history lookup ERROR:" + err);
                        return;
                    }
                    //console.log("      * * * * * STATS pulse.geo="+pulse.geo+" newData="+newData+" median="+pulse.median+" pulse="+dump(pulse));
                    //redisClient.publish("pulses", message);
                    redisClient.hmset(pulseLabel, pulse); //store the RAW PULSE EXPIRE ENTRY???
                    //redisClient.hgetall(pulseLabel,function (err, writtenPulse){  //INSTRUMENTATIOJ POINT
                    //  console.log("wrote :"+dump(writtenPulse));
                    //})
                    //console.log("STORING incoming OWL : " +  pulse.geo +  " -> "+me.geo + "=" + pulse.owl + "stored as "+me.geo+" field");
                    redisClient.hset(me.geo, pulse.geo, pulse.owl, 'EX', OWLEXPIRES); //This pulse came to me - store OWL my latency measure
                    var d = new Date();
                    if (pulse.owl == "")
                        pulse.owl = "0";
                    var owlStat = "{ x: new Date('" + d + "'), y: " + pulse.owl + "},";
                    //console.log("PROCESSPULSE: ---> incoming "+ pulse.geo + "-" + me.geo+"="+ owlStat);
                    redisClient.rpush([pulse.geo + "-" + me.geo, owlStat]); //store incoming pulse
                    //
                    //    Store the measured latency for this pulse message to me
                    //
                    //console.log("PROCESSPULSE: storeOWL setting group-"+pulse.geo + "-" + me.geo+" owl="+pulse.owl);
                    //console.log("PROCESSPULSE:");
                    //
                    //  Store the OWL measures received in the OWLs field and save for 1 pulse cycle 
                    //
                    storeOWLs(pulse.srcMint, pulse.owls, me.mint);
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
}
;
function storeOWLs(srcMint, owls, memint) {
    //console.log("PROCESSPULSE(): storeOWLs srcMint="+srcMint+" owls="+owls);
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
        if (!(destMint == memint)) //Do not believe what remote says is my latency - I just measured it!
            storeOWL(srcMint, destMint, owl);
    }
}
//
//      storeOWL() - store one way latency to file or graphing & history
//
function storeOWL(srcMint, destMint, owl) {
    //console.log("PROCESSPULSE: storeOWL() srcMint="+srcMint+" destMint="+destMint+" "+" owl="+owl);
    redisClient.hgetall("mint:" + srcMint, function (err, srcEntry) {
        redisClient.hgetall("mint:" + destMint, function (err, destEntry) {
            if (srcEntry != null) {
                if (destEntry != null) {
                    //console.log("STORING incoming OWL : " +  srcEntry.geo +  " -> "+destEntry.geo + "=" + owl + "stored as "+destEntry.geo+" field");
                    redisClient.hset(destEntry.geo, srcEntry.geo, owl, 'EX', OWLEXPIRES); //store owl in destEntry
                    //Create and store the graph entries <---HACK
                    var d = new Date();
                    if (owl == "")
                        owl = "0";
                    var owlStat = "{ x: new Date('" + d + "'), y: " + owl + "},";
                    //console.log("PROCESSPULSE: OWL DATA ---> "+ srcEntry.geo + "-" + destEntry.geo+"="+ owlStat);
                    redisClient.rpush([srcEntry.geo + "-" + destEntry.geo, owlStat]);
                }
                else
                    console.log("PROCESSPULSE: We have no mint for this mint: " + destMint);
            }
            else
                console.log("PROCESSPULSE: We have no mint for this mint: " + srcMint);
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
