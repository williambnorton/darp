"use strict";
exports.__esModule = true;
//
//  handlePulse - receive incoming pulses and store in redis
//
var lib_js_1 = require("../lib/lib.js");
var pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client
var dgram = require('dgram');
var server = dgram.createSocket('udp4');
var MYBUILD = "";
var isGenesisNode = false;
redisClient.hgetall("mint:0", function (err, me) {
    if (err) {
        console.log("hgetall me failed");
    }
    else {
        if (me == null) {
            console.log("handlePulse() - can't find me entry...exitting");
            process.exit(127);
        }
        //console.log("handlePulse(): Configuration  me="+dump(me));
        MYBUILD = me.version;
        redisClient.hgetall("mint:1", function (err, genesis) {
            if (err) {
                console.log("hgetall genesis failed");
            }
            else {
                console.log("HANDLEPULSE(): genesis=" + lib_js_1.dump(genesis));
                if (genesis && (genesis.publickey == me.publickey))
                    isGenesisNode = true;
                //if (genesis==null) {
                //  console.log("handlePulse() - can't find genesis entry...exitting");
                //  process.exit(127);
                //}
                //console.log("handlePulse(): genesis="+dump(genesis));
                //server.bind(me.port, "0.0.0.0");
            }
        });
        server.bind(me.port, "0.0.0.0");
    }
});
//
// listen for incoming pulses and convert into redis commands
//
server.on('listening', function () {
    var address = server.address();
    console.log('UDP Server listening on ' + address.address + ':' + address.port);
    console.log(lib_js_1.ts() + "");
    console.log(lib_js_1.ts() + "");
    console.log(lib_js_1.ts() + "");
    console.log(lib_js_1.ts() + "");
    console.log(lib_js_1.ts() + "");
    console.log(lib_js_1.ts() + "");
    console.log(lib_js_1.ts() + "");
    console.log(lib_js_1.ts() + "");
    console.log(lib_js_1.ts() + "");
    console.log(lib_js_1.ts() + "");
    console.log(lib_js_1.ts() + "");
    console.log(lib_js_1.ts() + "");
});
//
//  message format: 0,56,1583783486546,MAZORE,MAZORE.1,1>1=0,2>1=0
//
//    from pulser.ts:
//var pulseMessage="0,"+me.version+","+me.geo+","+pulseGroup+","+seq+","+now()+","+me.mint+",";  //MAZORE:MAZJAP.1
//
server.on('message', function (message, remote) {
    console.log("HANDLEPULSE: received pulse from " + remote.address + ':' + remote.port + ' - ' + message);
    var msg = message.toString();
    var ary = msg.split(",");
    //try {
    var pulseTimestamp = ary[5]; //1583783486546
    var pulseLabel = ary[2] + ":" + ary[3];
    var owlsStart = nth_occurrence(msg, ',', 7); //owls start after the 7th comma
    var owls = msg.substring(owlsStart + 1, msg.length - 1);
    //console.log(ts()+"handlepulse(): owls="+owls);
    redisClient.hgetall(pulseLabel, function (err, oldPulse) {
        //console.log("oldPulse.inMsgs="+oldPulse.inMsgs+" oldPulse.inOctets"+oldPulse.inOctets);
        if (oldPulse == null) {
            oldPulse = { "inOctets": "0", "inMsgs": "0" };
        }
        if (err) {
            console.log("ERROR in on.message handling");
        }
        var pulse = {
            version: ary[1],
            geo: ary[2],
            group: ary[3],
            seq: ary[4],
            pulseTimestamp: pulseTimestamp,
            srcMint: ary[6],
            owls: owls,
            owl: lib_js_1.now() - pulseTimestamp,
            lastMsg: msg,
            inOctets: "" + (parseInt(oldPulse.inOctets) + message.length),
            inMsgs: "" + (parseInt(oldPulse.inMsgs) + 1)
        };
        redisClient.publish("pulses", msg);
        //
        //  if groupOwner pulsed this - make sure we have the credentials for each node
        //
        //console.log("pulse="+dump(pulse));
        if (pulse.srcMint == "1") { ///Believe the group Owner wrt population
            //console.log("HANDLEPULSE() pulse from Genesis node");
            var mints = pulse.owls.replace(/=[0-9]*/g, '').split(",");
            var _loop_1 = function () {
                var mintLabel = mints[mint];
                //console.log("HANDLEPULSE mint="+mint+" mints="+mints+" mintLabel="+dump(mintLabel))
                redisClient.hget("mint:" + mintLabel, "mint", function (err, mintValue) {
                    if (err)
                        console.log("handlePulse - error checking mint exists. ERROR - should not happen");
                    //console.log("HANDLEPULSE "+mintLabel+" mintValue="+mintValue)
                    if (!mintValue) {
                        //console.log("Fetching mint="+mintLabel+" from genesis Node");
                        newMint(mintLabel); //new Mint
                    }
                });
            };
            //console.log("HANDLEPULSE() mints="+mints);
            for (var mint in mints) {
                _loop_1();
            }
        }
        redisClient.hmset(pulseLabel, pulse, function (err, reply) {
            redisClient.hgetall(pulseLabel, function (err, pulseRecord) {
                //console.log("HANDLEPULSE STOWING pulseRecord="+dump(pulseRecord));
                redisClient.hmset("mint:" + pulse.srcMint, "owl", pulse.owl);
            });
            //console.log(ts()+" HANDLEPULSE(): Checking version "+pulse.version+" vs. "+MYBUILD);
            if (pulse.version != MYBUILD && !isGenesisNode) {
                console.log(lib_js_1.ts() + " HANDLEPULSE(): NEW SOFTWARE AVAILABLE - GroupOwner said " + pulse.version + " we are running " + MYBUILD + " .......process exitting");
                process.exit(36); //SOFTWARE RELOAD
            }
        });
    });
});
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
//  newMint() - We received a new Mint in an announcement
//              fetch the mintEntry from the group Owner and create a pulseGroup node entry
//
function newMint(mint) {
    var http = require("http");
    redisClient.hgetall("mint:1", function (err, genesis) {
        var url = "http://" + genesis.ipaddr + ":" + genesis.port + "/mint/" + mint;
        console.log("FETCHMINT              fetchMint(): url=" + url);
        http.get(url, function (res) {
            res.setEncoding("utf8");
            var body = "";
            res.on("data", function (data) {
                body += data;
            });
            res.on("end", function () {
                var mintEntry = JSON.parse(body);
                //console.log("mint:"+mint+"="+dump(mintEntry));
                redisClient.hmset("mint:" + mint, mintEntry);
                console.log("mint:" + mint + "=" + lib_js_1.dump(mintEntry) + " WRITTEN TO REDIS");
                var newSegmentEntry = {
                    "geo": mintEntry.geo,
                    "group": mintEntry.group,
                    "seq": "0",
                    "pulseTimestamp": "0",
                    "srcMint": "" + mint,
                    // =
                    "owls": "",
                    //"owls" : getOWLs(me.group),  //owls other guy is reporting
                    //node statistics - we measure these ourselves
                    "owl": "",
                    "inOctets": "0",
                    "outOctets": "0",
                    "inMsgs": "0",
                    "outMsgs": "0",
                    "pktDrops": "0" //as detected by missed seq#
                    //"remoteState": "0"   //and there are mints : owls for received pulses 
                };
                redisClient.hmset(mintEntry.geo + ":" + mintEntry.group, newSegmentEntry);
                redisClient.hgetall(mintEntry.geo + ":" + mintEntry.group, function (err, newSegment) {
                    var _a;
                    console.log("FETCHED MINT - NOW MAKE AN ENTRY " + mintEntry.geo + ":" + mintEntry.group + " -----> ADDED New Segment: " + lib_js_1.dump(newSegment));
                    redisClient.hmset("gSRlist", (_a = {},
                        _a[mintEntry.geo + ":" + mintEntry.group] = mint,
                        _a));
                    redisClient.publish("members", "ADDING pulseGroup member mint:" + newSegmentEntry.srcMint + " " + newSegmentEntry.geo + ":" + newSegmentEntry.group);
                });
            });
        });
    });
}
