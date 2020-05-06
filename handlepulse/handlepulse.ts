//
//  handlePulse - receive incoming pulses and store in redis
//
import {
  now,
  ts,
  dump,
  newMint,
  makeYYMMDD
} from '../lib/lib.js';
console.log("Starting HANDLEPULSE GENESIS=" + process.env.GENESIS + " PORT=" + process.env.PORT + " HOSTNAME=" + process.env.HOSTNAME + " VERSION=" + process.env.VERSION + " MYIP=" + process.env.MYIP);

var OWLEXPIRES = 10; //seconds should match polling cycle time

var SHOWPULSES = "0";
const pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client

var dgram = require('dgram');
var server = dgram.createSocket('udp4');

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
          for (var i = 10; i > 0; i--) console.log(ts() + "DARP COMPONENTS STARTED-Point your browser to http://" + me.ipaddr + ":" + me.port + "/");

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

//
//  message format: 0,56,1583783486546,MAZORE,MAZORE.1,1>1=0,2>1=0
//
//    from pulser.ts:
//var pulseMessage="0,"+me.version+","+me.geo+","+pulseGroup+","+seq+","+now()+","+me.mint+",";  //MAZORE:MAZJAP.1
//
server.on('message', function(message, remote) {
  //if (SHOWPULSES == "1")
      console.log(ts() + "HANDLEPULSE: received pulse " + message.length + " bytes from " + remote.address + ':' + remote.port + ' - ' + message);
  var msg = message.toString();
  var ary = msg.split(",");
  //try {
  var pulseTimestamp = ary[5]; //1583783486546
  var OWL = now() - pulseTimestamp;
  if (OWL <= -999) OWL = -99999; //FOR DEBUGGING ... we can filter out clocks greater than +/- 99 seconds off
  if (OWL >= 999) OWL = 99999;  //bad clocks lead to really large OWL pulses 
  var pulseLabel = ary[2] + ":" + ary[3];

  var owlsStart = nth_occurrence(msg, ',', 8); //owls start after the 7th comma
  var owls = msg.substring(owlsStart + 1, msg.length - 1);

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
              bootTimestamp: ary[6],
              srcMint: ary[7],
              owls: owls,
              owl: "" + OWL,
              lastMsg: msg,
              inOctets: "" + (parseInt(lastPulse.inOctets) + message.length),
              inMsgs: "" + (parseInt(lastPulse.inMsgs) + 1)
          };

          authenticatedPulse(pulse, function(pulse, authenticated) { 

            //console.log(ts()+"Authenticated packet = we have a mint and geos match: "+pulse.ipaddr+":"+pulse.mint);
              if (me.state == "CONFIGURED") { //we received a pulse from this node, it is now running
                  console.log(ts() + "me=" + dump(me));
                  me.state = "RUNNING"
                  redisClient.hset("mint:0", "state", "RUNNING"); //RUNNING means mint inquiries work
                  redisClient.hgetall("mint:0", function(newme) {
                      console.log(ts() + "Received pulse from a node previously called CONFIGURED... Set its state RUNNING:" + dump(newme));
                  })
              }

              //console.log("*******pulse.version="+pulse.version+" MYBUILD="+MYBUILD+" dump pulse="+dump(pulse));  //INSTRUMENTAITON POINT
              if (pulse.version != MYBUILD) {
                  if (!isGenesisNode) {
                      console.log(ts() + " ******** HANDLEPULSE(): NEW SOFTWARE AVAILABLE isGenesisNode=" + isGenesisNode + " - GroupOwner said " + pulse.version + " we are running " + MYBUILD + " .......process exitting");
                      console.log("Genesis node pulsed us as " + pulse.version + " MYBUILD=" + MYBUILD + " dump pulse=" + dump(pulse));
                      process.exit(36); //SOFTWARE RELOAD
                  }
              };

              redisClient.publish("pulses", msg)
              redisClient.hmset(pulseLabel, pulse); //store the pulse

              var pulseSamplePrefix = "darp-";

              //add to matrix with expiration times
              //redisClient.set(pulseSamplePrefix+pulse.srcMint+"-"+me.mint+"="+pulse.owl, pulse.owl);  //store the pulse


              //redisClient.expire(pulseSamplePrefix+pulse.srcMint+"-"+me.mint+"="+pulse.owl,15);  //save for a pollcycle.5 seconds
              
              redisClient.set(pulseSamplePrefix + pulse.geo + "-" + me.geo + "-" + pulse.owl, pulse.owl, 'EX', OWLEXPIRES);

              //{ x: new Date('" + d + "'), y: " + owl + "},

              var d = new Date();
              if (pulse.owl=="") pulse.owl="0";
              var owlStat = "{ x: new Date('" + d + "'), y: " + pulse.owl + "},";

              //redisClient.rpush([ pulse.srcMint + "-" + me.mint, pulse.srcMint+"-"+me.mint+"-"+pulse.owl]);
              //redisClient.rpush([ pulse.srcMint + "-" + me.mint, owlStat]);
              redisClient.rpush([ pulse.geo + "-" + me.geo, owlStat]);

              //console.log(ts()+"HANDLEPULSE(): storing with TTL "+pulse.srcMint+"-"+me.mint+"="+ pulse.owl);

              //
              //  Store the OWL measure and save for 1 pulse cycle - naming convention darp-src-dst-owl`
              //
              console.log("handlepulse(): owls="+pulse.owls);
              var owlsAry = pulse.owls.split(",")
              //console.log(ts()+"owlsAry="+owlsAry);
              //
              //    for each owl in pulsed owls, add to history-srcGeo-dstGeo 
              //
              for (var measure in owlsAry) {
                  console.log(ts()+"measure="+measure+" owlsAry[measure]="+owlsAry[measure]);
                  var srcMint = owlsAry[measure].split("=")[0]
                  console.log("HANDLEPULSE: owlsAry[measure]=:"+owlsAry[measure]);
                  redisClient.hgetall("mint:"+srcMint, function(err, mintEntry) {
                      if (mintEntry!=null) {
                        var srcGeo=mintEntry.geo; //
                        var dstGeo=me.geo;
                        var owl = owlsAry[measure].split("=")[1]
                        if (typeof owl == "undefined") owl = ""

                        console.log("HANDLEPULSE: srcGeo="+srcGeo+" dstGeo="+dstGeo+" owl="+owl);
                        //srcMint+"-"+me.mint
                        //redisClient.set(pulseSamplePrefix+srcMint+"-"+pulse.srcMint+"="+owl, owl);  //store the pulse
                        //redisClient.expire(pulseSamplePrefix+srcMint+"-"+pulse.srcMint+"="+pulse.owl,15);  //save for a pollcycle.5 seconds
                        redisClient.set(pulseSamplePrefix + srcGeo + "-" + pulse.geo + "-" + owl, owl, 'EX', OWLEXPIRES);

                        //redisClient.rpush([ srcMint + "-" + pulse.srcMint, srcMint+"-"+pulse.srcMint+"-"+owl+"-"+now()]);              
                        if (owl=="") owl=0;
                        owlStat = "{ x: new Date('" + d + "'), y: " + owl + "},";
                        console.log("HANDLEPULSE: "+srcGeo + "-" + pulse.geo+"="+ dump(owlStat));
                        redisClient.rpush([ srcGeo + "-" + pulse.geo, owlStat]);   
                      } else {
                          console.log("handlePulse(): we don't have the mint for "+srcMint);

                          //if this mint was mentioned by genesis node, go fetch it
                          //if not genesis node, ignore this mint
                      }           
                  });
              }

              redisClient.hmset("mint:" + pulse.srcMint, { //store this OWL in the mintTable for convenience
                  "owl": pulse.owl,
                  "pulseTimestamp" : now()  //mark we just saw this --> we should also keep pushing EXP time out for mintEntry....
              });

              //storeOWL(pulse.geo,me.geo,OWL);

              //console.log(ts()+"HANDLEPULSE(): storedOWL "+dump(pulse));

              //});
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
  var YYMMDD = makeYYMMDD();
  var filename = process.env.DARPDIR + "/" + src + '-' + dst + '.' + YYMMDD + '.txt';
  var logMsg = "{ x: new Date('" + d + "'), y: " + owl + "},\n";
  //console.log("About to file("+filename+") log message:"+logMsg);

  //if (owl > 2000 || owl < 0) {
  //console.log("storeOWL(src=" + src + " dst=" + dst + " owl=" + owl + ") one-way latency out of spec: " + owl + "STORING...0");
  //
  //owl = 0;
  //}
  //var logMsg = "{y:" + owl + "},\n";
  fs.appendFile(filename, logMsg, function(err) {
      if (err) throw err;
      //console.log('Saved!');
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

//
//  checkSEversion() - reload SW if there is new code to be had
//this is needed because when genesis dies and doesn't know about the peers - peers must reloadSW
//
setTimeout(checkSWversion, 20 * 1000);; // see if we need new SW
//checkSWversion();
function checkSWversion() {
  setTimeout(checkSWversion, 20 * 1000);;
  //console.log("checkSWversion() - currentSW="+MYBUILD);
  const http = require("http");
  redisClient.hgetall("mint:1", function(err, genesis) {
      if (err || genesis == null) {
          console.log("checkSWversion(): WE HAVE NO Genesis Node mint:1 pulse error=" + err + " RELOAD");
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

          res.on("end", () => {
              var version = JSON.parse(body);
              //console.log(ts()+"HANDLEPULSE: checkSWversion(): genesis SWversion=="+dump(version)+" currentSW="+MYBUILD);
              if (version != MYBUILD && !isGenesisNode) {
                  console.log(ts() + " HANDLEPULSE checkSWversion(): NEW SOFTWARE AVAILABLE - GroupOwner said " + version + " we are running " + MYBUILD + " .......process exitting");
                  process.exit(36); //SOFTWARE RELOAD
              }
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