import { dump, getGenesis, now, mintList, ts } from "../lib/lib";
//import { builtinModules } from "module";

//
//  pulse - send my owl measurements to my pulseGroups
//
//var HOST='127.0.0.1';
var PAUSE=true;   //after next pulse, stop pulsing

var dgram = require('dgram');
var message = new Buffer('message pulseGoesHere');
var networkClient = dgram.createSocket('udp4');

const pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client

var GEO="";  //global variable for marking source of pulse
/*setInterval(
  () => pulse,
  10000
);*/
setTimeout(pulse,1000);
var datagramClient=dgram.createSocket('udp4');

//
//  publish the one-way latecy matrix
//
function publishMatrix() {
   redisClient.hgetall("gSRlist", function(err,gSRlist) {
    //console.log(ts()+"publicMatrix(): gSRlist="+dump(gSRlist));
    var lastEntry="",count=0;
    var stack=new Array();
    var geoList="",owlList="";
    for (var entry in gSRlist) {count++;lastEntry=entry;}

    for (var entry in gSRlist) {
      //console.log(ts()+"publicMatrix(): entry="+dump(entry));

        redisClient.hgetall(entry,function (err,pulseEntry) {
          if (pulseEntry) {
            geoList+=pulseEntry.geo+":"+pulseEntry.srcMint+",";
            owlList+=pulseEntry.owls+",";
            //console.log(ts()+"publicMatrix(): geoList="+geoList+" owlList="+owlList+" pulseEntry="+dump(pulseEntry));

            stack.push( { "mint" : pulseEntry.mint, "geo" : pulseEntry.geo, "owls" : pulseEntry.owls } );
            if (pulseEntry.geo+":"+pulseEntry.group==lastEntry) {
              var txt=count+","+geoList+owlList;
              //console.log("publishMatrix(): publishing matrix="+txt);
              redisClient.publish("matrix",txt);
            }
          }
        });
      }
   })
}


//
//  pulse - pulser for each me.pulseGroups
//
export function pulse(flag) {
  if (typeof flag == "undefined") {
    setTimeout(pulse,10 * 1000);  //10 second pollingfrequency
    setTimeout(publishMatrix,5 * 1000);  // In 5 seconds call it
    flag="periodicPoll"
  } else {
    flag="oneTime"
    console.log(ts()+"one-time pulseGroup pulse");
  }
  //  get all my pulseGroups
  redisClient.hgetall("mint:0", function(err, me) {
    if ((me==null) || (me.state=="HOLD" && flag!="oneTime")) return console.log(ts()+" pulse(): no mint:0 or HOLD ");

    GEO=me.geo;
    var cursor = '0';     // DEVOPS:* returns all of my pulseGroups
    redisClient.scan(cursor, 'MATCH', me.geo+":*", 'COUNT', '100', function(err, pulseGroups){
      if (err){
          throw err;
      }
      //console.log("pulser(): myPulseGroups="+dump(pulseGroups));

      cursor = pulseGroups[0];
      if (cursor === '0'){
          //console.log('Scan Complete ');
          // do your processing
          // reply[1] is an array of matched keys: me.geo:*
          var SRs=pulseGroups[1]; //[0] is the cursor returned
          //console.log( "We need to pulse each of these SRs="+SRs); 

          for (var i in SRs) {
            //console.log("PULSER(): Pulsing SegmentRouter="+SRs[i]);
            var pulseLabel=SRs[i];
            //chop into named pieces for debugging
            var pulseSrc=pulseLabel.split(":")[0];
            var pulseGroup=pulseLabel.split(":")[1];
            var pulseGroupOwner=pulseGroup.split(".")[0];
            var ownerPulseLabel=pulseGroupOwner+":"+pulseGroupOwner+".1";

            //console.log("ownerPulseLabel="+ownerPulseLabel);
            redisClient.hgetall(ownerPulseLabel,function(err,pulseGroupOwner) {
              //console.log(ts()+"pulseGroupOwner record="+dump(pulseGroupOwner));
              //console.log(ts()+"pulseGroupOwner.owls="+pulseGroupOwner.owls);
              //var emptyOwls=pulseGroupOwner.owls.replace(/=[0-9]*/g,'').split(",");
              //console.log("emptyOwls="+emptyOwls);

            //make a pulse message
            //console.log("pulse(): Make a pulse Message, pulseLabel="+pulseLabel+" pulseGroup="+pulseGroup+" pulseGroupOwner="+pulseGroupOwner+" ownerPulseLabel="+ownerPulseLabel+" pulseSrc="+pulseSrc);
            //in the format OWL,1,MAZORE,MAZORE.1,seq#,pulseTimestamp,OWLS=1>2=23,3>1=46
              redisClient.hgetall(pulseLabel,function(err,pulseLabelEntry){
                //console.log("***********************     PULSER()getting pulseLabelEntrty err="+err+" pulseLabelEntry="+dump(pulseLabelEntry)+" seq="+pulseLabelEntry.seq);
                pulseLabelEntry.seq=""+(parseInt(pulseLabelEntry.seq)+1);
                //console.log("-------------------------------------------->    pulseLabelEntry.seq="+pulseLabelEntry.seq);
                redisClient.hmset(pulseLabel, {
                  "seq" : pulseLabelEntry.seq
                }, function(err,reply) {


                  var pulseMessage="0,"+me.version+","+me.geo+","+pulseGroup+","+pulseLabelEntry.seq+","+now()+","+me.mint+",";  //MAZORE:MAZJAP.1

               
                  //get mintTable to get credentials   
                  var owls=""
                  mintList(redisClient, ownerPulseLabel, function(err,mints) {
                    // get nodes' list of mints to send pulse to
                    // and send pulse
                    //console.log(ownerPulseLabel+" tells us mints="+mints+" pulseMessage="+pulseMessage);  //use this list to faetch my OWLs
                    buildPulsePkt(mints,pulseMessage,null);
                  
                  });
                });

              });
            });

          }
      } else {
        console.log(ts()+"WEIRD - HSCAN RETURNED non-Zero cursos!!!!!- UNHANDLED ERROR");
      }
    });
  });
  //datagramClient.close();
}

//
//  buildPulsePkt() - build and send pulse
//  sendToAry - a stack of IP:Port to get this msg
//
function buildPulsePkt(mints, pulseMsg, sendToAry) {
  if ( sendToAry == null) sendToAry=new Array();
  //console.log("buildPulsePkt(): mints="+mints);
  if (typeof mints == "undefined" || !mints || mints=="") return //console.log("buildPulsePkt(): bad mints parm - ignoring - pulseMsg was to be "+pulseMsg);
  var mint=mints.pop(); //get our mint to add to the msg

  //console.log("buildPulsePkt() mint="+mint+" mints="+mints+" pulseMsg="+pulseMsg);
  redisClient.hgetall("mint:"+mint, function (err, mintEntry) {
    if (err) {
      console.log("buildPulsePkt(): ERROR - ");
    } else {
      if (mintEntry!=null) {
        //console.log("* * ** * * * * * * * * * * * * * * * * * * *       get my measurement from mintEntry="+dump(mintEntry));
        if (mintEntry.owl=="") pulseMsg+=mint+",";
        else pulseMsg+=mint+"="+mintEntry.owl+",";
        sendToAry.push({"ipaddr":mintEntry.ipaddr,"port":mintEntry.port,"pulseLabel":mintEntry.geo+":"+mintEntry.group});
        var pulseLabel=GEO+":"+mintEntry.group;   //all of my state announcements are marked from me

        if (mint!=null) {
          //console.log("mint popped="+mint+" mints="+mints+" sendToAry="+sendToAry+" pulseMsg="+pulseMsg);
          if (mints!="") buildPulsePkt(mints,pulseMsg,sendToAry);
          else {
            //
            //      message ready - pulse
            //console.log("PULSING "+pulseMsg+" to  sendToAry="+dump(sendToAry)); 
            for (let node=sendToAry.pop(); node != null; node=sendToAry.pop()) {

              if (typeof node != "undefined" && node != null) {
                redisClient.hmset("mint:0",{
                  "statsPulseMessageLength" : ""+pulseMsg.length
                });

                //sending msg
                //console.log("networkClient.send(pulseMsg="+pulseMsg+" node.port="+node.port+" node.ipaddr="+node.ipaddr);
                networkClient.send(pulseMsg,node.port,node.ipaddr,function(error){

                  if(error) {
                    console.log(ts()+"pulser NetSend error");
                    networkClient.close();
                  } else {
                    //redisClient.hset("")
                    //console.log("sent dump node="+dump(node))
                    var message=pulseMsg+" sent to "+node.ipaddr+":"+node.port+" "+dump(node)
                    console.log(message);
                    redisClient.publish("pulses",message);
                    console.log(ts()+"PULSER LOOP: pulseLabel="+pulseLabel+" node="+dump(node));

                  //update stats on this groupPulse (DEVOPS:DEVOPS.1) record
                  //var pulseLabel=mintEntry.geo+":"+mintEntry.group;
                  redisClient.hgetall(pulseLabel, function(err, groupEntry) {
                    if (groupEntry==null) groupEntry={outOctets : "0",outMsgs : "0"};
                    var pulse={
                      outOctets : ""+(parseInt(groupEntry.outOctets)+pulseMsg.length),
                      outMsgs : ""+(parseInt(groupEntry.outMsgs)+1)
                    };
                    console.log(ts()+"setting stats for node= "+dump(node)+" groupEntry Record: "+pulseLabel);
                    redisClient.hmset(pulseLabel, pulse);  //update stats
                    //
                    //  Do the same for the out counters for the node I am sending to
                    //
                    var pulseEntryLabel=node.pulseLabel
                    console.log(ts()+"PULSER(): pulseEntryLabel="+pulseEntryLabel);
                    redisClient.hgetall(pulseEntryLabel, function(err, pulseEntry) {
                        if (pulseEntry==null) pulseEntry={outOctets : "0",outMsgs : "0"};
                        var pulse={
                          outOctets : ""+(parseInt(pulseEntry.outOctets)+pulseMsg.length),
                          outMsgs : ""+(parseInt(pulseEntry.outMsgs)+1)
                        };
                        console.log(ts()+"setting stats for target Record: "+pulseEntryLabel);
                        redisClient.hmset(pulseEntryLabel, pulse);  //update stats
                        //console.log(ts()+"updating pulseRecord:="+dump(pulseEntry));

                    });
                  });
                  }


                });
              }
            }
  
          }
          return;
        } else {
          console.log("Complete - now invoke sendTo for each of my mints pulseMsg="+pulseMsg);
          console.log("NOT GETTING HERE EEVR PULSER sendToAry="+dump(sendToAry)); 
        }
      } 

    }
  });
}

