//
//  handlePulse - receive incoming pulses and store in redis
//
import {  now,  ts,  dump,  YYMMDD } from '../lib/lib.js';

console.log("Starting PROCESS GENESIS=" + process.env.GENESIS + " PORT=" + process.env.PORT + " HOSTNAME=" + process.env.HOSTNAME + " VERSION=" + process.env.VERSION + " MYIP=" + process.env.MYIP);


var SHOWPULSES = "0";
const pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client

var dgram = require('dgram');
var server = dgram.createSocket('udp4');

//
//  First make sure my context is set - REDIS and Genesis node connected
//
var MYBUILD = "";
var isGenesisNode = false;
redisClient.hgetall("mint:0", function(err, me) {
  console.log("HANDLEPULSE starting with me=" + dump(me));
  redisClient.hgetall("mint:1", function(err, genesis) {
      if (me == null) {
          console.log(ts() + "HANDLEPULSE started with no genesis mint:1 EXITTING...");
          process.exit(36)
      } else {
          SHOWPULSES = me.SHOWPULSES
          console.log(ts() + "HANDLEPULSE started with genesis=" + dump(genesis));
          if (genesis == null) {
              for (var i = 10; i > 0; i--) console.log(ts() + "Genesis not connected - exitting - another loop around");
              process.exit(36)
          }
          for (var i = 10; i > 0; i--) console.log(ts() + "DARP COMPONENTS STARTED-Point browser to http://" + me.ipaddr + ":" + me.port + "/");

      }
  });
});


console.log(ts() + "handlePulse: Starting");
//
//  mint:0 is me and my configuration, mint:1 is the groupOwner - a Genesis node
//
redisClient.hgetall("mint:0", function(err, me) {
  //console.log("handlePulse(): Configuration  me="+dump(me));
  MYBUILD = me.version;
  isGenesisNode = me.isGenesisNode;
  console.log(ts() + "handlepulse(): Binding pulsePort on UDP port " + me.port);
  server.bind(me.port, "0.0.0.0");
});

//
//  AdninControl is a channel for other applications to tell handlePulse to die and 
//      as a result start the shutdown/reboot or reload of the agent
//
function checkAdminControl() {
//console.log(ts()+"checkAdminControl");
  
    redisClient.hget("mint:0", "adminControl", function(err,adminControl) {
      if (adminControl=="RELOAD" ) {
        console.log(ts()+"RELOAD SOFTWARE adminControl="+adminControl);
        process.exit(36);
      }
      if (adminControl=="STOP" ||adminControl=="REBOOT"  ) {
        console.log(ts()+"STOP/REBOOT adminControl="+adminControl);
        process.exit(86);
      }
    });
    setTimeout(checkAdminControl,500);  //how often we check for cmds
  }
  setTimeout(checkAdminControl,1000);



//
//
//  incoming message - stuff it into quque right away
//
server.on('message', function(message, remote) {
    var strMsg=message.toString();
    //if (SHOWPULSES == "1")
    console.log(ts() + "HANDLEPULSE: received pulse " + message.length + " bytes from " + remote.address + ':' + remote.port + ' - ' + message/*+dump(remote)*/);
    //console.log("pushing onto msgQ : -> "+JSON.stringify({ incomingTimestamp : ""+now(), message : strMsg }));
    redisClient.lpush( 'rawpulses', ""+now()+","+strMsg  );
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

const SW_CHECK_FREQ=20;
setTimeout(checkSWversion, SW_CHECK_FREQ * 1000);; // see if we need new SW
//checkSWversion();
function checkSWversion() {
  setTimeout(checkSWversion, SW_CHECK_FREQ * 1000);;
  //console.log("checkSWversion() - currentSW="+MYBUILD);
  const http = require("http");
  redisClient.hgetall("mint:0", function(err, me) {
        redisClient.hgetall("mint:1", function(err, genesis) {
            if (err || genesis == null) {
                console.log("checkSWversion(): WE HAVE NO Genesis Node mint:1 pulse error=" + err + " RELOAD");
                process.exit(36);
            }
            //
            //  use this opportunity to reboot if group owner is AWOL for 20 seconds
            //

            var elapsedSecondsSinceOwnerPulse=Math.round(  ((now()-genesis.pulseTimestamp)/1000) );
            console.log("elapsedSecondsSinceOwnerPulse="+elapsedSecondsSinceOwnerPulse);
            //TODO: This doesn't work - the genesis node goes away and thenode dies connection refused
            //doen't matter - the reload of software will force a rejoin.
            if (elapsedSecondsSinceOwnerPulse> SW_CHECK_FREQ ) {
                console.log("HANDLEPULSE(): The Genesis Group went away... elapsedSecondsSinceOwnerPulse > SW_CHECK_FREQ so forcing reload and reconnect");
                console.log("HANDLEPULSE(): The Genesis Group went away... elapsedSecondsSinceOwnerPulse > SW_CHECK_FREQ so forcing reload and reconnect");
                console.log("HANDLEPULSE(): The Genesis Group went away... elapsedSecondsSinceOwnerPulse > SW_CHECK_FREQ so forcing reload and reconnect");

                process.exit(36);
            }
            const url = "http://" + genesis.ipaddr + ":" + genesis.port + "/version";
            //console.log("checkSWversion(): url="+url);
            http.get(url, res => {
                res.setEncoding("utf8");
                let body = "";

                res.on("data", data => {
                    body += data;
                });

                res.on('error', function(error) {
                    console.log("HANDLEPULSE: checkSWversion CAN'T REACH GENESIS NODE"); // Error handling here never triggered TODO
                  });

                res.on("end", () => {
                    var version = JSON.parse(body);
                    
                    //console.log(ts()+"HANDLEPULSE: checkSWversion(): "+" genesis SWversion=="+dump(version)+" currentSW="+MYBUILD);
                    if ((version != MYBUILD) ) {
                        if (me.ipaddr==genesis.ipaddr) return console.log("ignoring this software version - I am genesis node");
                        console.log(ts() + " HANDLEPULSE checkSWversion(): NEW SOFTWARE AVAILABLE - GroupOwner said " + version + " we are running " + MYBUILD + " .......process exitting");
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
server.on('listening', function() {
  var address = server.address();

  console.log(ts() + "");
  console.log(ts() + "");
  console.log(ts() + 'UDP Server listening for pulses on ' + address.address + ':' + address.port);
  console.log(ts() + "");
  console.log(ts() + "");

});

process.on('SIGTERM', () => {
  console.info('handlePulse SIGTERM signal received.');
  process.exit(36);
});