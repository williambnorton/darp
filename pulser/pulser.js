"use strict";
exports.__esModule = true;
var lib_1 = require("../lib/lib");
//
//  pulse - send my owl measurements to my pulseGroups
//
//var HOST='127.0.0.1';
var dgram = require('dgram');
var message = new Buffer('message pulseGoesHere');
var networkClient = dgram.createSocket('udp4');
var pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client
pulse();
function pulse() {
    //get my pulsegroups
    redisClient.hgetall("me", function (err, me) {
        if (err) {
            console.log("hgetall me failed");
        }
        else {
            console.log("me=" + JSON.stringify(me, null, 2));
            //  MAZORE.1 MAZDAL.1
            var pulseGroups = me.pulseGroups.split(" ");
            for (var PG in pulseGroups) {
                var pulseGroup = pulseGroups[PG];
                //fetch the group mints mint:2 : 2  mint:5 : 5   ....
                redisClient.hgetall(pulseGroup, function (err, pulseGroupNodes) {
                    if (err) {
                        console.log("hgetall pulseGroup mints " + pulseGroupNodes + " failed");
                    }
                    else {
                        console.log("pulseGroup=" + lib_1.dump(pulseGroupNodes));
                        for (var mintKey in pulseGroupNodes) {
                            console.log("pulser mintKey=" + mintKey);
                            redisClient.hgetall(mintKey, function (err, mint) {
                                if (err) {
                                    console.log("hgetall mint " + mintKey + " failed");
                                }
                                else {
                                    console.log("mintKey=" + lib_1.dump(mintKey));
                                }
                            });
                        }
                    }
                });
            }
            /****
            // for each pulseGroup name, hgetall <pulseGoupName> to get population
            for (var pulseGroup in pulseGroups) {
              var groupEntry=pulseGroups[pulseGroup];
                console.log("groupEntry="+JSON.stringify(groupEntry,null,2));
      
                redisClient.hgetall(groupEntry+".owls", function(err, owls) {
                  console.log("owls="+JSON.stringify(owls,null,2));
                  // for each pulseGroup population, make a pulsePacket
                  var pulseMsg=makePulse(groupEntry,owls);
                  // for each node in pulseGroup, send pulseMessage
                  console.log("pulse="+pulseMsg);
                  for (var owl in owls) {
                      console.log("pulsing pulseMsg:"+pulseMsg+" owl="+owl+" to "+HOST+":"+PORT);
                       networkClient.send(pulseMsg, 0, pulseMsg.length, PORT, HOST, function(err, bytes) {
                        if (err) throw err;
                          console.log('UDP message sent to ' + HOST +':'+ PORT);
                          //networkClient.close();
                      });
                  }
      
                });
             ****/
        }
    });
    //setTimeout(pulse,3000); //pulse again in 3 seconds
}
/*
function makePulse(groupEntry,owls) {
  console.log("groupEntry="+groupEntry+" owls="+owls);
  var seqNum="1"; //fetch the from pulseGroupTable MazORE.1 seqNum:

  var d = new Date();
  var now=d.getTime();
  var srcNode="1";

  //var pulse="0:"+seqNum+":"+now+":"+myMint+":"+groupEntry;
  var pulse="OWL:"+seqNum+":"+now+":"+me.geo+":"+groupEntry+":"+"2:1:23,3:1:243"  //MAZORE:MAZJAP.1
//OWL:MAZORE:MAZORE.1:1:2-1=23,3-1=46

  for (var owl in owls) {
    //console.log("owl="+owl+"="+owls[owl]);
    var owlMeasurement=owl.split(":");

    if (owlMeasurement.length==3) {
      // for each node in pulseGroup, send pulseMessage
      var group=owlMeasurement[0];
      var srcMint=parseInt(owlMeasurement[1]);
      var dstMint=parseInt(owlMeasurement[2]);
      //console.log("group="+group+" srcMint="+srcMint+" dstMint="+dstMint);
      if (dstMint==me.mint) pulse+=":"+srcMint+":"+owls[owl];
    }
  }
  return pulse;
}

*/
