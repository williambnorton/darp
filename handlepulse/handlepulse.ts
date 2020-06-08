//
//  handlePulse - receive incoming pulses and store in redis
//
import {
  now,
  ts,
  dump,
  YYMMDD
} from '../lib/lib.js';

console.log("Starting PROCESS GENESIS=" + process.env.GENESIS + " PORT=" + process.env.PORT + " HOSTNAME=" + process.env.HOSTNAME + " VERSION=" + process.env.VERSION + " MYIP=" + process.env.MYIP);

var OWLEXPIRES = 2; //seconds should match polling cycle time

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
/*
//
//  only callback if authenticated
//
function authenticatedPulse(pulse, callback) {
  redisClient.hgetall("mint:" + pulse.srcMint, function(err, senderMintEntry) {  //find its mint entry

      if (senderMintEntry == null) {
          console.log("authenticatedPulse(): DROPPING MESSAGE We don't (yet) have a mint entry for mint "+pulse.srcMint+" this pulse:" + dump(pulse));
          //callback(null,false);
      } else {
          //simple authentication matches mint to other resources
          if ((senderMintEntry.geo == pulse.geo)&&(senderMintEntry.mint == pulse.srcMint)) {
            pulse.ipaddr=senderMintEntry.ipaddr; //for convenience
            pulse.port=senderMintEntry.port;  //for convenience

            callback(pulse, true)
          }
          else {
              console.log("HANDLEPULSE(): authenticatedPulse(): unauthenticated packet - geo " + pulse.geo + " was not a match for "+pulse.srcMint+" in our mint table...we had: "+senderMintEntry.geo+" mint= " + senderMintEntry.mint); //+dump(pulse)+dump(senderMintEntry.geo));
              //callback(null,false)
          }
      }
  });
}
***/
//
//  message format: 0,56,1583783486546,MAZORE,MAZORE.1,1>1=0,2>1=0
//
//    from pulser.ts:
//var pulseMessage="0,"+me.version+","+me.geo+","+pulseGroup+","+seq+","+now()+","+me.mint+",";  //MAZORE:MAZJAP.1
//
//
//  incoming message - stuff it into quque right away
//
server.on('message', function(message, remote) {
    var strMsg=message.toString();
    //if (SHOWPULSES == "1")
    console.log(ts() + "HANDLEPULSE: received pulse " + message.length + " bytes from " + remote.address + ':' + remote.port + ' - ' + message/*+dump(remote)*/);
    console.log("pushing onto msgQ : -> "+JSON.stringify({ incomingTimestamp : ""+now(), message : strMsg }));
    redisClient.publish( 'pulses', JSON.stringify({ incomingTimestamp : ""+now(), message : strMsg }), function(err, reply) {
        if (err) console.log("handlepulse: onm message into data store ERROR reply="+reply); //prints
    }); 
});

/**** 
  var msg = message.toString();
  var ary = msg.split(",");
  //try {
  var pulseTimestamp = ary[5]; //1583783486546
  var OWL = now() - pulseTimestamp;
  //if (OWL <= -999) OWL = -99999; //FOR DEBUGGING ... we can filter out clocks greater than +/- 99 seconds off
  //if (OWL >= 999) OWL = 99999;  //bad clocks lead to really large OWL pulses 
  var pulseLabel = ary[2] + ":" + ary[3];

  var owlsStart = nth_occurrence(msg, ',', 8); //owls start after the 7th comma
  var pulseOwls = msg.substring(owlsStart + 1, msg.length-1);

  //console.log(ts()+"**************************handlepulse(): owls="+owls);  //INSTRUMENTAITON POINT

  redisClient.hgetall(pulseLabel, function(err, lastPulse) {
      //console.log("oldPulse.inMsgs="+oldPulse.inMsgs+" oldPulse.inOctets"+oldPulse.inOctets);
      redisClient.hgetall("mint:0", function(err, me) {
          if (me == null) {
              console.log(ts() + "HANDLEPULSE(): mint:0 does not exist - Genesis node not up yet...exitting");
              process.exit(36)
          }

          //if (me.state=="RELOAD") process.exit(36);  //this is set when reload button is pressed in express
          //if (me.state=="STOP") process.exit(86);  //this is set when reload button is pressed in express

          if (lastPulse == null) { //first time we see this entry, include stats to increment
              lastPulse = {
                  "inOctets": "0",
                  "inMsgs": "0"
              }
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
              bootTimestamp: ary[6],   //if genesis node reboots --> all node reload SW too
              srcMint: ary[7],
              owls: pulseOwls,
              owl: "" + OWL,
              lastMsg: msg,
              inOctets: "" + (parseInt(lastPulse.inOctets) + message.length),
              inMsgs: "" + (parseInt(lastPulse.inMsgs) + 1),
              median: "0",
              pktDrops: "0"
          };
          var pktDrops=""+ (parseInt(pulse.seq)-parseInt(pulse.inMsgs));
          pulse.pktDrops=pktDrops;
          authenticatedPulse(pulse, function(pulse, authenticated) { 

              if ((pulse.srcMint==1) && (pulse.version != MYBUILD)) {
                console.log(ts() + " ******** HANDLEPULSE(): GENESIS SAID NEW SOFTWARE AVAILABLE isGenesisNode=" + isGenesisNode + " - GroupOwner said " + pulse.version + " we are running " + MYBUILD + " .......process exitting");
                console.log(ts() + " ******** HANDLEPULSE(): GENESIS SAID NEW SOFTWARE AVAILABLE isGenesisNode=" + isGenesisNode + " - GroupOwner said " + pulse.version + " we are running " + MYBUILD + " .......process exitting");
                console.log(ts() + " ******** HANDLEPULSE(): GENESIS SAID NEW SOFTWARE AVAILABLE isGenesisNode=" + isGenesisNode + " - GroupOwner said " + pulse.version + " we are running " + MYBUILD + " .......process exitting");
                console.log("Genesis node pulsed us as " + pulse.version + " MYBUILD=" + MYBUILD + " dump pulse=" + dump(pulse));
                      process.exit(36); //SOFTWARE RELOAD
              };

              redisClient.hset("mint:"+pulse.srcMint, "state", "RUNNING");  //GREEN-RUNNING means we received a pulse from it

              redisClient.lpush(pulse.geo + "-" + me.geo+"-history", ""+OWL );  //store incoming pulse
              redisClient.lrange(pulse.geo + "-" + me.geo+"-history", -300, -1, (err, data) => {
                if (err) {
                 console.log("ihandlepulse() history lookup ERROR:"+err);
                 return;
                }
               
                //console.log("      * * * * * STATS pulse.geo="+pulse.geo+" newData="+newData+" median="+pulse.median+" pulse="+dump(pulse));
                redisClient.publish("pulses", msg);
                redisClient.hmset(pulseLabel, pulse); //store the RAW PULSE EXPIRE ENTRY???
  
                //redisClient.hgetall(pulseLabel,function (err, writtenPulse){  //INSTRUMENTATIOJ POINT
                //  console.log("wrote :"+dump(writtenPulse));
                //})

                //console.log("STORING incoming OWL : " +  pulse.geo +  " -> "+me.geo + "=" + pulse.owl + "stored as "+me.geo+" field");
                redisClient.hset(me.geo, pulse.geo, pulse.owl, 'EX', OWLEXPIRES);  //This pulse came to me - store OWL my latency measure

                var d = new Date();
                if (pulse.owl=="") pulse.owl="0";
                var owlStat = "{ x: new Date('" + d + "'), y: " + pulse.owl + "},";

                //console.log("HANDLEPULSE: ---> incoming "+ pulse.geo + "-" + me.geo+"="+ owlStat);
                redisClient.rpush([ pulse.geo + "-" + me.geo, owlStat ]);  //store incoming pulse

                //
                //    Store the measured latency for this pulse message to me
                //
                //console.log("HANDLEPULSE: storeOWL setting group-"+pulse.geo + "-" + me.geo+" owl="+pulse.owl);

                

                //console.log("handlePulse:");
                //
                //  Store the OWL measures received in the OWLs field and save for 1 pulse cycle 
                //
                storeOWLs( pulse.srcMint, pulse.owls, me.mint );
                //
                //    Also Store the OWL measured - stick it in the mintTable <--- DELETE THIS LATER
                //
                redisClient.hmset("mint:" + pulse.srcMint, { //store this OWL in the mintTable for convenience
                    "owl": pulse.owl,
                    "pulseTimestamp" : now()  //mark we just saw this --> we should also keep pushing EXP time out for mintEntry....
                });


                });



          });
      });
  });
});``

function storeOWLs(srcMint, owls, memint) {
//console.log("HANDLEPULSE(): storeOWLs srcMint="+srcMint+" owls="+owls);
    //
    //    for each owl in pulsed owls, add to history-srcGeo-dstGeo 
    //
    var owlsAry=owls.split(",");
    //console.log("owlsAry="+dump(owlsAry));
    for (var dest in owlsAry) {
        var destMint=owlsAry[dest].split("=")[0];
        var owl=owlsAry[dest].split("=")[1];
        if (typeof owl == "undefined") owl="";
        if ( !(destMint==memint) )   //Do not believe what remote says is my latency - I just measured it!
            storeOWL(srcMint,destMint,owl)
    }
}
//
//      storeOWL() - store one way latency to file or graphing & history
//
function storeOWL(srcMint, destMint, owl) {
    //console.log("HANDLEPULSE: storeOWL() srcMint="+srcMint+" destMint="+destMint+" "+" owl="+owl);

    redisClient.hgetall("mint:"+srcMint, function(err, srcEntry) {
        redisClient.hgetall("mint:"+destMint, function(err, destEntry) {
            if (srcEntry!=null ) {
                if (destEntry!=null) {

                    //console.log("STORING incoming OWL : " +  srcEntry.geo +  " -> "+destEntry.geo + "=" + owl + "stored as "+destEntry.geo+" field");
                    redisClient.hset(destEntry.geo, srcEntry.geo, owl, 'EX', OWLEXPIRES);  //store owl in destEntry

                    //Create and store the graph entries <---HACK
                    var d = new Date();
                    if (owl=="") owl="0"
                    var owlStat = "{ x: new Date('" + d + "'), y: " + owl + "},";
                    
                    //console.log("HANDLEPULSE: OWL DATA ---> "+ srcEntry.geo + "-" + destEntry.geo+"="+ owlStat);
                    redisClient.rpush([ srcEntry.geo + "-" + destEntry.geo, owlStat]);   

                } else console.log("HANDLEPULSE: We have no mint for this mint: "+destMint);
            } else console.log("HANDLEPULSE: We have no mint for this mint: "+srcMint);
        });
    });

}

function nth_occurrence(string, char, nth) {
  var first_index = string.indexOf(char);
  var length_up_to_first_index = first_index + 1;

  if (nth == 1) {
      return first_index;
  } else {
      var string_after_first_occurrence = string.slice(length_up_to_first_index);
      var next_occurrence = nth_occurrence(string_after_first_occurrence, char, nth - 1);

      if (next_occurrence === -1) {
          return -1;
      } else {
          return length_up_to_first_index + next_occurrence;
      }
  }
}
***/
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
            //console.log("elapsedSecondsSinceOwnerPulse="+elapsedSecondsSinceOwnerPulse);
            //TODO: This doesn't work - the genesis node goes away and thenode dies connection refused
            //doen't matter - the reload of software will force a rejoin.
            if (elapsedSecondsSinceOwnerPulse> 10 ) {
                console.log("HANDLEPULSE(): The Genesis Group went away... elapsedSecondsSinceOwnerPulse > 10 so forcing reload and reconnect");
                console.log("HANDLEPULSE(): The Genesis Group went away... elapsedSecondsSinceOwnerPulse > 10 so forcing reload and reconnect");
                console.log("HANDLEPULSE(): The Genesis Group went away... elapsedSecondsSinceOwnerPulse > 10 so forcing reload and reconnect");

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