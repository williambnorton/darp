"use strict";
exports.__esModule = true;
//
//  PROCESSPULSE - receive incoming pulses and store in redis
//
var lib_js_1 = require("../lib/lib.js");
console.log("^^^^Starting PROCESSPULSE GENESIS=" + process.env.GENESIS + " PORT=" + process.env.PORT + " HOSTNAME=" + process.env.HOSTNAME + " VERSION=" + process.env.VERSION + " MYIP=" + process.env.MYIP);
//subscribe to feed - print it out.
var POLL_CYCLE = 1; //poll every __ second so timeout read every __ second
var OWLEXPIRES = 1000; //seconds should match polling cycle time - expir
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
            for (var i = 3; i > 0; i--)
                console.log(lib_js_1.ts() + "PROCESS PULSE STARTED - instrumentation at http://" + me.ipaddr + ":" + me.port + "/");
        }
    });
});
console.log(lib_js_1.ts() + "PROCESSPULSE: Starting....");
//
//  message format: 0,56,1583783486546,MAZORE,MAZORE.1,1>1=0,2>1=0
//
//    from pulser.ts:
//var pulseMessage="0,"+me.version+","+me.geo+","+pulseGroup+","+seq+","+now()+","+me.mint+",";  //MAZORE:MAZJAP.1
//
//server.on('message', function(message, remote) {
function processPulseWorker() {
    console.log("processPulseWorker(): Waiting for handlePulse to queue up a raw pulse...");
    redisClient.brpop('rawpulses', 10 /*secs*/, function (err, incomingPulse) {
        if (err)
            throw err;
        console.log("processPulseWorker(): Pop'd incomingPulse=" + incomingPulse);
        if (incomingPulse != null) {
            var message = incomingPulse.toString();
            var ary = message.split(",");
            var channel = ary[0];
            var incomingTimestamp = ary[1];
            message = message.substring(nth_occurrence(message, ',', 2) + 1, message.length);
            //console.log("channel="+channel+" incomingTimestamp="+incomingTimestamp+" message="+message);
            // FIX THESE
            //A couple calculations before filling the pulse structure
            var pulseTimestamp = ary[7]; //1583783486546
            var OWL = incomingTimestamp - pulseTimestamp;
            //            console.log("measured OWL="+OWL+" for message="+message);
            var owlsStart = nth_occurrence(message, ',', 8); //owls start after the 7th comma
            var pulseOwls = message.substring(owlsStart + 1, message.length);
            //console.log("1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890");
            var pulse = {
                version: ary[3],
                geo: ary[4],
                group: ary[5],
                seq: ary[6],
                pulseTimestamp: ary[7],
                bootTimestamp: ary[8],
                srcMint: ary[9],
                owls: pulseOwls,
                owl: "" + OWL,
                lastMsg: message,
                inOctets: "" + message.length,
                inMsgs: "" + 1,
                median: "0",
                pktDrops: "0"
            };
            ;
            console.log("****** processPulseWorker(): message=" + message + " owlstart=" + owlsStart, " pulseOwls=" + pulseOwls);
            console.log("structured pulse=" + lib_js_1.dump(pulse));
            //            processpulse(incomingTimestamp, message);
            processpulse(pulse, message.length);
        } //else console.log("processPulseWorker(): incomingPulse==null - probably time out");
        processPulseWorker(); //go get (or wait for) the next pulse
    });
}
//
//  only callback if authenticated
//
function authenticatedPulse(pulse, callback) {
    console.log("authenticatedPulse(pulse=" + lib_js_1.dump(pulse));
    redisClient.hgetall("mint:" + pulse.srcMint, function (err, senderMintEntry) {
        console.log("@wbn1:");
        if (err) {
            console.log("authenticatedpulse: ERROR lloking up mint pulse.srcMint=" + pulse.srcMint + "<");
            return;
        }
        console.log("@wbn2:");
        if (senderMintEntry == null) {
            console.log("authenticatedPulse(): DROPPING MESSAGE We don't (yet) have a mint entry for mint " + pulse.srcMint + " this pulse:" + lib_js_1.dump(pulse));
            callback(null, false);
        }
        else {
            console.log("@wbn3:");
            //simple authentication matches piulse mint to other resources
            if ((senderMintEntry.geo == pulse.geo) && (senderMintEntry.mint == pulse.srcMint)) {
                pulse.ipaddr = senderMintEntry.ipaddr; //
                pulse.port = senderMintEntry.port; //
                console.log("authenticatedPulse(): returning pulse: " + lib_js_1.dump(pulse));
                callback(pulse, true); //we have an aithenticated packet
            }
            else {
                console.log("PROCESSPULSE(): authenticatedPulse(): unauthenticated packet - geo " + pulse.geo + " was not a match for " + pulse.srcMint + " in our mint table...we had: " + senderMintEntry.geo + " mint= " + senderMintEntry.mint); //+dump(pulse)+dump(senderMintEntry.geo));
                callback(null, false);
            }
        }
    });
}
processPulseWorker();
//
//  processpulse - update pulseTable from incoming pulseObject
//
//function processpulse(incomingTimestamp, messagebuffer) {
function processpulse(incomingPulse, messageLength) {
    var pulseLabel = incomingPulse.geo + ":" + incomingPulse.group;
    console.log("* * * * processpulse(): pulseLabel=" + pulseLabel + " incomingPulse=" + lib_js_1.dump(incomingPulse) + " pulseTimestamp=" + incomingPulse.pulseTimestamp);
    redisClient.hgetall(pulseLabel, function (err, lastPulse) {
        //if (lastPulse) console.log("lastPulse="+dump(lastPulse));
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
                    "inMsgs": "0",
                    "seq": "0"
                };
            }
            incomingPulse.inOctets = "" + (parseInt(lastPulse.inOctets) + messageLength);
            incomingPulse.inMsgs = "" + (parseInt(lastPulse.inMsgs) + 1);
            incomingPulse.pktDrops = "" + (parseInt(incomingPulse.seq) - parseInt(incomingPulse.inMsgs));
            //          authenticatedPulse(incomingPulse, function(pulse, authenticated) { 
            var pulse = incomingPulse;
            var authenticated = true; //testing
            if (!authenticated) {
                console.log("IGNORING UNAUTHENTICATED PULSE: " + lib_js_1.dump(pulse));
                return;
            }
            console.log("********  * * * * * * * * * * *   * * * * * * * * * * * * * * * * *   authenticatedPulse: " + lib_js_1.dump(pulse));
            if ((pulse.srcMint == 1) && (pulse.version != me.version)) {
                console.log(lib_js_1.ts() + " ******** PROCESSPULSE(): GENESIS SAID NEW SOFTWARE AVAILABLE isGenesisNode=" + isGenesisNode + " - GroupOwner said " + pulse.version + " we are running " + MYBUILD + " .......process exitting");
                console.log(lib_js_1.ts() + " ******** PROCESSPULSE(): GENESIS SAID NEW SOFTWARE AVAILABLE isGenesisNode=" + isGenesisNode + " - GroupOwner said " + pulse.version + " we are running " + MYBUILD + " .......process exitting");
                console.log(lib_js_1.ts() + " ******** PROCESSPULSE(): GENESIS SAID NEW SOFTWARE AVAILABLE isGenesisNode=" + isGenesisNode + " - GroupOwner said " + pulse.version + " we are running " + MYBUILD + " .......process exitting");
                console.log("Genesis node pulsed us as " + pulse.version + " me.version=" + me.version + " dump pulse=" + lib_js_1.dump(pulse));
                process.exit(36); //SOFTWARE RELOAD
            }
            ;
            console.log("processpulse(): incoming pulse authenticated. Writing  " + lib_js_1.dump(pulse));
            redisClient.hset("mint:" + pulse.srcMint, "state", "RUNNING"); //GREEN-RUNNING means we received a pulse from it
            console.log("process[pulse(): pushing  " + pulse.geo + "-" + me.geo + "-history=" + pulse.owl);
            redisClient.lpush(pulse.geo + "-" + me.geo + "-history", "" + pulse.owl); //store incoming pulse
            console.log("                  ==*=============> processpulse(): saving pulse  " + pulseLabel + " pulse=" + lib_js_1.dump(pulse));
            console.log("                  ==*=============> processpulse(): saving pulse  " + pulseLabel + " pulse=" + lib_js_1.dump(pulse));
            console.log("                  ==*=============> processpulse(): saving pulse  " + pulseLabel + " pulse=" + lib_js_1.dump(pulse));
            console.log("                  ==*=============> processpulse(): saving pulse  " + pulseLabel + " pulse=" + lib_js_1.dump(pulse));
            console.log("                  ==*=============> processpulse(): saving pulse  " + pulseLabel + " pulse=" + lib_js_1.dump(pulse));
            redisClient.hmset(pulseLabel, pulse, function (err, reply) {
                if (err)
                    console.log("ERROR storing pulse " + err);
            }); //store the PULSE 
            console.log("STORING incoming OWL : " + pulse.geo + " -> " + me.geo + "=" + pulse.owl + "stored as " + me.geo + " field");
            redisClient.hset(me.geo, pulse.geo, pulse.owl, 'EX', OWLEXPIRES); //This pulse came to me - store OWL my latency measure
            redisClient.hmset("mint:" + pulse.srcMint, {
                "owl": pulse.owl,
                "pulseTimestamp": lib_js_1.now() //mark we just saw this --> we should also keep pushing EXP time out for mintEntry....
            });
            redisClient.hmset(pulse.geo + ":" + pulse.group, pulse); //THIS SHOULD EXPIRE
            redisClient.publish("pulses", JSON.stringify(pulse));
            //
            //    update stats for pulseEntry by reviewing last data points
            //
            redisClient.lrange(pulse.geo + "-" + me.geo + "-history", -300, -1, function (err, data) {
                if (err) {
                    console.log("PROCESSPULSE() history lookup ERROR:" + err);
                    return;
                }
                var d = new Date();
                if (pulse.owl == "")
                    pulse.owl = "0";
                var owlStat = "{ x: new Date('" + d + "'), y: " + pulse.owl + "},";
                //console.log("PROCESSPULSE: ---> incoming "+ pulse.geo + "-" + me.geo+"="+ owlStat);
                redisClient.rpush([pulse.geo + "-" + me.geo, owlStat]); //store incoming pulse
                //
                //    Store the measured latency for this pulse message to me
                //
                console.log("PROCESSPULSE: storeOWL setting group-" + pulse.geo + "-" + me.geo + " owl=" + pulse.owl);
                //
                //  Store the OWL measures received in the OWLs field and save for 1 pulse cycle 
                //
                storeOWLs(pulse.srcMint, pulse.owls, me.mint);
                //
                //    Also Store the OWL measured - stick it in the mintTable <--- DELETE THIS LATER
                //
            });
            //  });
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
