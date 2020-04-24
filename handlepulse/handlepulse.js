"use strict";
exports.__esModule = true;
//
//  handlePulse - receive incoming pulses and store in redis
//
var lib_js_1 = require("../lib/lib.js");
console.log("Starting HANDLEPULSE GENESIS=" + process.env.GENESIS + " PORT=" + process.env.PORT + " HOSTNAME=" + process.env.HOSTNAME + " VERSION=" + process.env.VERSION + " MYIP=" + process.env.MYIP);
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
            console.log(lib_js_1.ts() + "HANDLEPULSE started with no genesis mint:1");
            process.exit(36);
        }
        else {
            console.log(lib_js_1.ts() + "HANDLEPULSE started with genesis=" + lib_js_1.dump(genesis));
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
//
//  only callback if authenticated
//
function authenticatedMessage(pulse, callback) {
    redisClient.hgetall("mint:" + pulse.srcMint, function (err, senderMintEntry) {
        if (senderMintEntry == null) {
            console.log("authenticateMessage(): DROPPING We don't have a mint entry for this pulse:" + lib_js_1.dump(pulse));
            //callback(null,false);
        }
        else {
            //simple authentication matches mint to other resources
            if (senderMintEntry.geo == pulse.geo)
                callback(null, true);
            else {
                console.log("authenticateMessage: unauthenticated packet - geo " + pulse.geo + " did not match our mint table" + lib_js_1.dump(pulse) + lib_js_1.dump(senderMintEntry.geo));
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
    //  if (SHOWPULSES!="0") 
    console.log(lib_js_1.ts() + "HANDLEPULSE: received pulse " + message.length + " bytes from " + remote.address + ':' + remote.port + ' - ' + message);
    var msg = message.toString();
    var ary = msg.split(",");
    //try {
    var pulseTimestamp = ary[5]; //1583783486546
    var OWL = lib_js_1.now() - pulseTimestamp;
    if (OWL <= -999)
        OWL = -99999; //we can filter out clocks greater than +/- 99 seconds off
    if (OWL >= 999)
        OWL = 99999; //bad clocks lead to really large OWL pulses 
    var pulseLabel = ary[2] + ":" + ary[3];
    var owlsStart = nth_occurrence(msg, ',', 7); //owls start after the 7th comma
    var owls = msg.substring(owlsStart + 1, msg.length - 1);
    //console.log(ts()+"handlepulse(): owls="+owls);
    redisClient.hgetall(pulseLabel, function (err, lastPulse) {
        //console.log("oldPulse.inMsgs="+oldPulse.inMsgs+" oldPulse.inOctets"+oldPulse.inOctets);
        redisClient.hgetall("mint:0", function (err, me) {
            if (me.state == "RELOAD")
                process.exit(36); //this is set when reload button is pressed in express
            if (me.state == "STOP")
                process.exit(86); //this is set when reload button is pressed in express
            if (lastPulse == null) { //first time we see this entry, include stats to increment
                lastPulse = { "inOctets": "0", "inMsgs": "0" };
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
                owl: "" + OWL,
                lastMsg: msg,
                inOctets: "" + (parseInt(lastPulse.inOctets) + message.length),
                inMsgs: "" + (parseInt(lastPulse.inMsgs) + 1)
            };
            authenticatedMessage(pulse, function (err, authenticated) {
                //console.log("*******pulse.version="+pulse.version+" MYBUILD="+MYBUILD+" dump pulse="+dump(pulse));
                if (pulse.version != MYBUILD) {
                    if (!isGenesisNode) {
                        console.log(lib_js_1.ts() + " ******** HANDLEPULSE(): NEW SOFTWARE AVAILABLE isGenesisNode=" + isGenesisNode + " - GroupOwner said " + pulse.version + " we are running " + MYBUILD + " .......process exitting");
                        console.log("INSIDE test pulse.version=" + pulse.version + " MYBUILD=" + MYBUILD + " dump pulse=" + lib_js_1.dump(pulse));
                        process.exit(36); //SOFTWARE RELOAD
                    }
                }
                ;
                redisClient.publish("pulses", msg);
                redisClient.hmset(pulseLabel, pulse); //store the pulse
                console.log(lib_js_1.ts() + "saving matrix entries to redis");
                //add to matrix with expiration times
                redisClient.hmset(pulse.group + ":" + pulse.srcMint + "-" + me.mint, pulse.owl); //store the pulse
                console.log(lib_js_1.ts() + "saving matrix LOOP entries to redis");
                var owlsAry = pulse.owls.split(",");
                console.log(lib_js_1.ts() + "owlsAry=" + owlsAry);
                for (var measure in owlsAry) {
                    console.log(lib_js_1.ts() + "measure=" + measure + " owlsAry[measure]=" + owlsAry[measure]);
                    var srcMint = measure.split("=")[0];
                    var owl = measure.split("=")[1];
                    if (typeof owl == "undefined")
                        owl = "";
                    var owlEntryLabel = pulse.group + ":" + srcMint + "-" + me.mint;
                    console.log(lib_js_1.ts() + "STORING " + owlEntryLabel + " owls=" + owls + " srcMint=" + srcMint + " owl=" + owl);
                    redisClient.hmset(owlEntryLabel, owl); //store the pulse
                }
                redisClient.hmset("mint:" + pulse.srcMint, {
                    "owl": pulse.owl
                });
                storeOWL(pulse.geo, me.geo, OWL);
                console.log(lib_js_1.ts() + "HANDLEPULSE(): storedOWL " + lib_js_1.dump(pulse));
            });
        });
    });
});
//
//      storeOWL() - store one way latency to file or graphing & history
//
function storeOWL(src, dst, owl) {
    var fs = require('fs');
    var d = new Date();
    var YYMMDD = lib_js_1.makeYYMMDD();
    var filename = process.env.DARPDIR + "/" + src + '-' + dst + '.' + YYMMDD + '.txt';
    var logMsg = "{ x: new Date('" + d + "'), y: " + owl + "},\n";
    //console.log("About to file("+filename+") log message:"+logMsg);
    //if (owl > 2000 || owl < 0) {
    //console.log("storeOWL(src=" + src + " dst=" + dst + " owl=" + owl + ") one-way latency out of spec: " + owl + "STORING...0");
    //
    //owl = 0;
    //}
    //var logMsg = "{y:" + owl + "},\n";
    fs.appendFile(filename, logMsg, function (err) {
        if (err)
            throw err;
        //console.log('Saved!');
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
function checkSWversion() {
    setTimeout(checkSWversion, 30 * 1000);
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
                //console.log("mintEntry="+dump(mintEntry));
                if (version != MYBUILD && !isGenesisNode) {
                    console.log(lib_js_1.ts() + " handlepulse.ts checkSWversion(): NEW SOFTWARE AVAILABLE - GroupOwner said " + version + " we are running " + MYBUILD + " .......process exitting");
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
