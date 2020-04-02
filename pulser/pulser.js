"use strict";
exports.__esModule = true;
var lib_1 = require("../lib/lib");
//import { builtinModules } from "module";
//
//  pulse - send my owl measurements to my pulseGroups
//
//var HOST='127.0.0.1';
var dgram = require('dgram');
var message = new Buffer('message pulseGoesHere');
var networkClient = dgram.createSocket('udp4');
var pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client
//pulse();
setTimeout(pulse, 1 * 1000);
//
//  pulse - pulser for each me.pulseGroups
//
function pulse() {
    var datagramClient = dgram.createSocket('udp4');
    //  get all my pulseGroups
    redisClient.hgetall("mint:0", function (err, me) {
        redisClient.incr("mint:0", "lastSeq", function () { });
        var cursor = '0'; // DEVOPS:* returns all of my pulseGroups
        redisClient.scan(cursor, 'MATCH', me.geo + ":*", 'COUNT', '100', function (err, reply) {
            if (err) {
                throw err;
            }
            console.log("myPulseGroups=" + lib_1.dump(reply));
            cursor = reply[0];
            if (cursor === '0') {
                console.log('Scan Complete ');
                // do your processing
                // reply[1] is an array of matched keys: me.geo:*
                var SRs = reply[1];
                console.log("We need to pulse each of these SRs=" + SRs);
                for (var i in SRs) {
                    console.log(" i=" + i + " SR[i]=" + SRs[i]);
                    var pulseLabel = SRs[i];
                    var pulseSrc = pulseLabel.split(":")[0];
                    var pulseGroup = pulseLabel.split(":")[1];
                    var pulseGroupOwner = pulseGroup.split(".")[0];
                    var ownerPulseLabel = pulseGroupOwner + ":" + pulseGroupOwner + ".1";
                    //make a pulse message
                    console.log("pulse(): Make a pulse Message, pulseGroup=" + pulseGroup + " pulseGroupOwner=" + pulseGroupOwner + " ownerPulseLabel=" + ownerPulseLabel + " pulseSrc=" + pulseSrc);
                    //in the format OWL,1,MAZORE,MAZORE.1,seq#,pulseTimestamp,OWLS=1>2=23,3>1=46
                    var pulseMessage = "OWL," + me.mint + "." + me.geo + ":" + pulseGroup + "," + me.lastSeq + "," + lib_1.now() + ","; //MAZORE:MAZJAP.1
                    //get mintTable to get credentials   
                    var owls = "";
                    lib_1.mintList(redisClient, ownerPulseLabel, function (err, mints) {
                        // get nodes' list of mints to send pulse to
                        // and send pulse
                        console.log(ownerPulseLabel + " tells us mints=" + mints + " pulseMessage=" + pulseMessage); //use this list to faetch my OWLs
                        buildPulsePkt(mints, pulseMessage, null);
                    });
                }
            }
        });
    });
    datagramClient.close();
    //setTimeout(pulse,10*1000);
}
//
//  buildPulsePkt() - build and send pulse
//  sendToAry - a stack of IP:Port to get this msg
//
function buildPulsePkt(mints, pulseMsg, sendToAry) {
    if (sendToAry == null)
        sendToAry = new Array();
    console.log("buildPulsePkt(): mints=" + mints);
    if (typeof mints == "undefined" || !mints || mints == "")
        return console.log("buildPulsePkt(): bad mints parm - ignoring");
    ;
    var mint = mints.pop(); //get our mint to add to the msg
    console.log("buildPulsePkt() mint=" + mint + " mints=" + mints + " pulseMsg=" + pulseMsg);
    redisClient.hgetall("mint:" + mint, function (err, mintEntry) {
        if (err) {
            console.log("buildPulsePkt(): ERROR - ");
        }
        else {
            if (mintEntry != null) {
                console.log("get my measurement from mintEntry=" + lib_1.dump(mintEntry));
                if (mintEntry.owl == 0)
                    pulseMsg += mint + ",";
                else
                    pulseMsg += mint + "=" + mintEntry.owl + ",";
                sendToAry.push({ "ipaddr": mintEntry.ipaddr, "port": mintEntry.port });
                if (mint != null) {
                    console.log("mint popped=" + mint);
                    buildPulsePkt(mints, pulseMsg, sendToAry);
                    console.log("after call");
                    return;
                }
                else {
                    console.log("Complete - now invoke sendTo for each of my mints pulseMsg=" + pulseMsg);
                    console.log("NOT GETTING HERE EEVR PULSER sendToAry=" + lib_1.dump(sendToAry));
                }
            }
            else {
                if (typeof mint != "undefined") {
                    console.log("mintEntry is null - Can't find mint=" + mint);
                    pulseMsg += mint + ",";
                    buildPulsePkt(mints, pulseMsg, sendToAry);
                }
                else {
                    console.log("MUST BE END OF PULSEGROUP LIST : mintEntry is undefined Can't find mint=" + mint);
                    console.log("PULSING " + pulseMsg + " to  sendToAry=" + lib_1.dump(sendToAry));
                    var _loop_1 = function (node) {
                        if (typeof node != "undefined" && node != null) {
                            //sending msg
                            console.log("networkClient.send(pulseMsg=" + pulseMsg + " node.port=" + node.port + " node.ipaddr=" + node.ipaddr);
                            networkClient.send(pulseMsg, node.port, node.ipaddr, function (error) {
                                if (error) {
                                    networkClient.close();
                                }
                                else {
                                    console.log("sent dump node=" + lib_1.dump(node));
                                    console.log(pulseMsg + " sent to " + node.ipaddr + ":" + node.port);
                                }
                            });
                        }
                    };
                    for (var node = sendToAry.pop(); node != null; node = sendToAry.pop()) {
                        _loop_1(node);
                    }
                    //pulseMsg+=mint+",";
                    //buildPulsePkt(mints,pulseMsg,sendToAry);
                }
            }
        }
    });
}
/****
//  iterator through each mint of a pulseGroup
//
function forEachMint(SR,callback) {
  console.log("forEachMint() : SR="+SR);
  //fetch the group mints mint:2 : 2  mint:5 : 5   ....
  redisClient.hgetall(SR, function(err, SR) {
    //console.log("insideIterator");
    if (err) {
            console.log("forEachMint(): hgetall pulseGroup mints "+SR+" failed");
    } else {
      //console.log("forEachMint(): *** ** ** pulseGroupNodes="+dump(SR));
      var mints=SR.owls.split(",");
      console.log("mints="+mints+" len="+mints.length);
      for (var mint in mints) {   //mint:1  mint:2  mint:3
        console.log("forEachMint: pulser mint="+mint);
        redisClient.hgetall("mint:"+mint, function(err, mintEntry) {
          if (err) {
            console.log("forEachMint(): hgetall mintKey "+mint+" failed");
          } else {
            if (mintEntry) {
              //console.log("callback mintEntry="+dump(mintEntry));
              callback(err,mintEntry);  //callback may fetch mint table
            }
          }
        });
      }
    }
  });
  //setTimeout(pulse,3000); //pulse again in 3 seconds
}
**/ 
