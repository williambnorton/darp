"use strict";
exports.__esModule = true;
var lib_1 = require("../lib/lib");
//import { builtinModules } from "module";
//
//  pulse - send my owl measurements to my pulseGroups
//
//var HOST='127.0.0.1';
var PAUSE = false; //after next pulse, stop pulsing
var dgram = require('dgram');
var message = new Buffer('message pulseGoesHere');
var networkClient = dgram.createSocket('udp4');
var pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client
var GEO = ""; //global variable for marking source of pulse
/*setInterval(
  () => pulse,
  10000
);*/
pulse();
//
//  pulse - pulser for each me.pulseGroups
//
function pulse() {
    setTimeout(pulse, 10 * 1000);
    if (PAUSE)
        return;
    var datagramClient = dgram.createSocket('udp4');
    //  get all my pulseGroups
    redisClient.hgetall("mint:0", function (err, me) {
        GEO = me.geo;
        var cursor = '0'; // DEVOPS:* returns all of my pulseGroups
        redisClient.scan(cursor, 'MATCH', me.geo + ":*", 'COUNT', '100', function (err, pulseGroups) {
            if (err) {
                throw err;
            }
            //console.log("pulser(): myPulseGroups="+dump(pulseGroups));
            cursor = pulseGroups[0];
            if (cursor === '0') {
                //console.log('Scan Complete ');
                // do your processing
                // reply[1] is an array of matched keys: me.geo:*
                var SRs = pulseGroups[1]; //[0] is the cursor returned
                //console.log( "We need to pulse each of these SRs="+SRs); 
                for (var i in SRs) {
                    //console.log("PULSER(): Pulsing SegmentRouter="+SRs[i]);
                    var pulseLabel = SRs[i];
                    //chop into named pieces for debugging
                    var pulseSrc = pulseLabel.split(":")[0];
                    var pulseGroup = pulseLabel.split(":")[1];
                    var pulseGroupOwner = pulseGroup.split(".")[0];
                    var ownerPulseLabel = pulseGroupOwner + ":" + pulseGroupOwner + ".1";
                    console.log("ownerPulseLabel=" + ownerPulseLabel);
                    redisClient.hgetall(ownerPulseLabel, function (err, pulseGroupOwner) {
                        console.log(lib_1.ts() + "pulseGroupOwner record=" + lib_1.dump(pulseGroupOwner));
                        console.log(lib_1.ts() + "pulseGroupOwner.owls=" + pulseGroupOwner.owls);
                        var emptyOwls = pulseGroupOwner.owls.replace(/=[0-9]*/g, '').split(",");
                        console.log("emptyOwls=" + emptyOwls);
                        //make a pulse message
                        //console.log("pulse(): Make a pulse Message, pulseLabel="+pulseLabel+" pulseGroup="+pulseGroup+" pulseGroupOwner="+pulseGroupOwner+" ownerPulseLabel="+ownerPulseLabel+" pulseSrc="+pulseSrc);
                        //in the format OWL,1,MAZORE,MAZORE.1,seq#,pulseTimestamp,OWLS=1>2=23,3>1=46
                        redisClient.hgetall(pulseLabel, function (err, pulseLabelEntry) {
                            //console.log("***********************     PULSER()getting pulseLabelEntrty err="+err+" pulseLabelEntry="+dump(pulseLabelEntry)+" seq="+pulseLabelEntry.seq);
                            pulseLabelEntry.seq = "" + (parseInt(pulseLabelEntry.seq) + 1);
                            //console.log("-------------------------------------------->    pulseLabelEntry.seq="+pulseLabelEntry.seq);
                            redisClient.hmset(pulseLabel, {
                                "seq": pulseLabelEntry.seq
                            }, function (err, reply) {
                                var pulseMessage = "0," + me.version + "," + me.geo + "," + pulseGroup + "," + pulseLabelEntry.seq + "," + lib_1.now() + "," + me.mint + ","; //MAZORE:MAZJAP.1
                                //get mintTable to get credentials   
                                var owls = "";
                                lib_1.mintList(redisClient, ownerPulseLabel, function (err, mints) {
                                    // get nodes' list of mints to send pulse to
                                    // and send pulse
                                    //console.log(ownerPulseLabel+" tells us mints="+mints+" pulseMessage="+pulseMessage);  //use this list to faetch my OWLs
                                    buildPulsePkt(mints, pulseMessage, null);
                                });
                            });
                        });
                    });
                }
            }
            else {
                console.log(lib_1.ts() + "WEIRD - HSCAN RETURNED non-Zero cursos!!!!!- UNHANDLED ERROR");
            }
        });
    });
    datagramClient.close();
}
//
//  buildPulsePkt() - build and send pulse
//  sendToAry - a stack of IP:Port to get this msg
//
function buildPulsePkt(mints, pulseMsg, sendToAry) {
    if (sendToAry == null)
        sendToAry = new Array();
    //console.log("buildPulsePkt(): mints="+mints);
    if (typeof mints == "undefined" || !mints || mints == "")
        return console.log("buildPulsePkt(): bad mints parm - ignoring - pulseMsg was to be " + pulseMsg);
    ;
    var mint = mints.pop(); //get our mint to add to the msg
    //console.log("buildPulsePkt() mint="+mint+" mints="+mints+" pulseMsg="+pulseMsg);
    redisClient.hgetall("mint:" + mint, function (err, mintEntry) {
        if (err) {
            console.log("buildPulsePkt(): ERROR - ");
        }
        else {
            if (mintEntry != null) {
                //console.log("get my measurement from mintEntry="+dump(mintEntry));
                if (mintEntry.owl == "")
                    pulseMsg += mint + ",";
                else
                    pulseMsg += mint + "=" + mintEntry.owl + ",";
                sendToAry.push({ "ipaddr": mintEntry.ipaddr, "port": mintEntry.port });
                var pulseLabel = GEO + ":" + mintEntry.group; //all of my state announcements are marked from me
                if (mint != null) {
                    //console.log("mint popped="+mint+" mints="+mints+" sendToAry="+sendToAry+" pulseMsg="+pulseMsg);
                    if (mints != "")
                        buildPulsePkt(mints, pulseMsg, sendToAry);
                    else {
                        var _loop_1 = function (node) {
                            if (typeof node != "undefined" && node != null) {
                                //sending msg
                                //console.log("networkClient.send(pulseMsg="+pulseMsg+" node.port="+node.port+" node.ipaddr="+node.ipaddr);
                                networkClient.send(pulseMsg, node.port, node.ipaddr, function (error) {
                                    if (error) {
                                        networkClient.close();
                                    }
                                    else {
                                        //console.log("sent dump node="+dump(node))
                                        console.log(pulseMsg + " sent to " + node.ipaddr + ":" + node.port);
                                    }
                                    //update out stats on this pulse record
                                    //var pulseLabel=mintEntry.geo+":"+mintEntry.group;
                                    redisClient.hgetall(pulseLabel, function (err, oldPulse) {
                                        if (oldPulse == null)
                                            oldPulse = { outOctets: "0", outMsgs: "0" };
                                        var pulse = {
                                            outOctets: "" + (parseInt(oldPulse.outOctets) + message.length),
                                            outMsgs: "" + (parseInt(oldPulse.outMsgs) + 1)
                                        };
                                        redisClient.hmset(pulseLabel, pulse); //update stats
                                    });
                                });
                            }
                        };
                        //
                        //      message ready - pulse
                        //console.log("PULSING "+pulseMsg+" to  sendToAry="+dump(sendToAry)); 
                        for (var node = sendToAry.pop(); node != null; node = sendToAry.pop()) {
                            _loop_1(node);
                        }
                    }
                    return;
                }
                else {
                    console.log("Complete - now invoke sendTo for each of my mints pulseMsg=" + pulseMsg);
                    console.log("NOT GETTING HERE EEVR PULSER sendToAry=" + lib_1.dump(sendToAry));
                }
            }
        }
    });
}
