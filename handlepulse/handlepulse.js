"use strict";
exports.__esModule = true;
//
//  handlePulse - receive incoming pulses and store in redis
//
var lib_js_1 = require("../lib/lib.js");
console.log("Starting PROCESS GENESIS=" + process.env.GENESIS + " PORT=" + process.env.PORT + " HOSTNAME=" + process.env.HOSTNAME + " VERSION=" + process.env.VERSION + " MYIP=" + process.env.MYIP);
var SW_CHECK_FREQ = 1200; //how many seconds between software checks
var SHOWPULSES = "0";
var pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client
var dgram = require('dgram');
var server = dgram.createSocket('udp4');
//function checkForConfig() {
//
//  First make sure my context is set - REDIS up, and Genesis node connected
//  
//
redisClient.hgetall("mint:0", function (err, me) {
    if ((err) || (me == null)) {
        console.log(lib_js_1.ts() + "HANDLEPULSE started with no mint:0 ... failing");
        process.exit(36);
        //setTimeout(checkForConfig,2000);
        //return;
    }
    console.log("HANDLEPULSE starting with me=" + lib_js_1.dump(me));
    redisClient.hgetall("mint:1", function (err, genesis) {
        if (me == null) {
            console.log(lib_js_1.ts() + "HANDLEPULSE started with no genesis mint:1 ");
            process.exit(36);
        }
        else {
            SHOWPULSES = me.SHOWPULSES;
            console.log(lib_js_1.ts() + "HANDLEPULSE started with genesis=" + lib_js_1.dump(genesis));
            if (genesis == null) {
                for (var i = 10; i > 0; i--)
                    console.log(lib_js_1.ts() + "Genesis not connected - retrying in a few seconds ");
                //setTimeout(checkForConfig,2000); 
            }
            for (var i = 10; i > 0; i--)
                console.log(lib_js_1.ts() + __dirname + " DARP COMPONENTS STARTED-Point browser to http://" + me.ipaddr + ":" + me.port + "/");
            //          main();
        }
    });
});
//}
//checkForConfig();
//function main() {
console.log(lib_js_1.ts() + "handlePulse: Starting");
//
//  mint:0 is me and my configuration, mint:1 is the groupOwner - a Genesis node
//
redisClient.hgetall("mint:0", function (err, me) {
    if ((err) || (me == null)) {
        console.log("handlepulse: can't find self - exitting");
        process.exit(36); //reload software and try again
    }
    //console.log("handlePulse(): Configuration  me="+dump(me));
    console.log(lib_js_1.ts() + "handlepulse(): Binding pulsePort on UDP port " + me.port);
    server.bind(me.port, "0.0.0.0");
});
//
//  AdninControl is a channel for other applications to tell handlePulse to die and 
//      as a result start the shutdown/reboot or reload of the agent
//
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
//
//  incoming message - stuff it into quque right away
//
server.on('message', function (message, remote) {
    var strMsg = message.toString();
    //if (SHOWPULSES == "1")
    console.log(lib_js_1.ts() + "HANDLEPULSE: received pulse " + message.length + " bytes from " + remote.address + ':' + remote.port + ' - ' + message /*+dump(remote)*/);
    //console.log("pushing onto msgQ : -> "+JSON.stringify({ incomingTimestamp : ""+now(), message : strMsg }));
    redisClient.lpush('rawpulses', "" + lib_js_1.now() + "," + strMsg);
    //redisClient.publish( 'rawpulses', JSON.stringify({ incomingTimestamp : ""+now(), message : strMsg }), function(err, reply) {
    //    if (err) console.log("handlepulse: onm message into data store ERROR reply="+reply); //prints
    //}); 
});
//
//  checkSEversion() - reload SW if there is new code to be had
//this is needed because when genesis dies and doesn't know about the peers - peers must reloadSW
//  TODO: Version is based on date: Build.YYMMDD.HHMMSS
//      Only listen to genesis pulse version#'s, Ignore all others
//      And only check SWversion if not gnesis version, and use > comparison
setTimeout(checkSWversion, SW_CHECK_FREQ * 1000);
; // see if we need new SW
//checkSWversion();
function checkSWversion() {
    setTimeout(checkSWversion, SW_CHECK_FREQ * 1000);
    ;
    //console.log("checkSWversion() - currentSW="+MYBUILD);
    var http = require("http");
    redisClient.hgetall("mint:0", function (err, me) {
        redisClient.hgetall("mint:1", function (err, genesis) {
            if (err || genesis == null) {
                console.log("checkSWversion(): WE HAVE NO Genesis Node mint:1 pulse error=" + err + " RELOAD");
                process.exit(36);
            }
            //
            //  use this opportunity to reboot if group owner is AWOL for 20 seconds
            //
            var elapsedSecondsSinceOwnerPulse = Math.round(((lib_js_1.now() - genesis.pulseTimestamp) / 1000));
            console.log("elapsedSecondsSinceOwnerPulse=" + elapsedSecondsSinceOwnerPulse);
            //TODO: This doesn't work - the genesis node goes away and thenode dies connection refused
            //doen't matter - the reload of software will force a rejoin.
            if (elapsedSecondsSinceOwnerPulse > SW_CHECK_FREQ) {
                console.log("HANDLEPULSE(): The Genesis Group went away... elapsedSecondsSinceOwnerPulse > SW_CHECK_FREQ so forcing reload and reconnect");
                console.log("HANDLEPULSE(): The Genesis Group went away... elapsedSecondsSinceOwnerPulse > SW_CHECK_FREQ so forcing reload and reconnect");
                console.log("HANDLEPULSE(): The Genesis Group went away... elapsedSecondsSinceOwnerPulse > SW_CHECK_FREQ so forcing reload and reconnect");
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
                res.on('error', function (error) {
                    console.log("HANDLEPULSE: checkSWversion CAN'T REACH GENESIS NODE"); // Error handling here never triggered TODO
                });
                res.on("end", function () {
                    var version = JSON.parse(body);
                    //console.log(ts()+"HANDLEPULSE: checkSWversion(): "+" genesis SWversion=="+dump(version)+" currentSW="+MYBUILD);
                    if ((version != me.version)) {
                        if (me.ipaddr == genesis.ipaddr)
                            return console.log("ignoring this software version - I am genesis node");
                        console.log(lib_js_1.ts() + " HANDLEPULSE checkSWversion(): NEW SOFTWARE AVAILABLE - GroupOwner said " + version + " we are running " + me.version + " .......process exitting");
                        process.exit(36); //SOFTWARE RELOAD
                    }
                });
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
//}
