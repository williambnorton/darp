import { dump, getGenesis, now, mintList, ts } from "../lib/lib";
console.log("Starting PULSER GENESIS="+process.env.GENESIS+" PORT="+process.env.PORT+" HOSTNAME="+process.env.HOSTNAME+" VERSION="+process.env.VERSION+" MYIP="+process.env.MYIP);

//
//  pulse - send my owl measurements to my pulseGroups
//
//var HOST='127.0.0.1';
var CYCLETIME=10; //newMint(mint)



var dgram = require('dgram');
var message = new Buffer('message pulseGoesHere');
var networkClient = dgram.createSocket('udp4');

const pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client


redisClient.hgetall("mint:0", function (err,me) {
  console.log("PULSER starting with me="+dump(me));
  redisClient.hgetall("mint:1", function (err,genesis) {
    if (me==null){
      console.log(ts()+"PULSER started with no genesis mint:1");
      process.exit(36)
    } else {
      console.log(ts()+"PULSER started with genesis="+dump(genesis));
    }
  });
});



console.log("PULSER: CYCLETIME="+CYCLETIME);

var GEO="";  //global variable for marking source of pulse

function checkAdminControl() {
  var state="IDLE";
  //console.log(ts()+"checkAdminControl");
  redisClient.hget("mint:0", "adminControl", function(err,adminControl) {
    if (adminControl=="PULSE" && state!="PULSING") {
      state="PULSING"
      console.log(ts()+"adminControl="+adminControl);
      pulse(1);
      state="IDLE"
      redisClient.hdel("mint:0","adminControl")
    }
  });
  setTimeout(checkAdminControl,500);  //how often we check for cmds
}
setTimeout(checkAdminControl,1000);
setTimeout(pulse,1000);
var datagramClient=dgram.createSocket('udp4');

//
//  publish the one-way latecy matrix - make a object: indexes, followed by owl[srcGeo:srcMint-destGeo:destMint]
//  --> Move this to the matrix display application so the handlePulse is lightweight glue
//  we don't even know if anyone will be subscribed to this-do not take the perf hit
function publishMatrix() {
   redisClient.hgetall("gSRlist", function(err,gSRlist) {
    //console.log(ts()+"publicMatrix(): gSRlist="+dump(gSRlist));
    var lastEntry="",count=0;
    //var stack=new Array();
    //var geoList="",owlList="";
    for (var entry in gSRlist) {count++;lastEntry=entry;}

    var matrix={
      geoList : new Array(),  //use for matrix labels
      owl : [],
      stack : new Array()
    };

    redisClient.hgetall("mint:0",function (err,me) {
      redisClient.hgetall(me.geo+":"+me.group,function (err,groupPulseEntry) {
        for (var entry in gSRlist) {
        //console.log(ts()+"publicMatrix(): entry="+dump(entry));
          if (me!=null && groupPulseEntry!=null) {
            redisClient.hgetall(entry,function (err,pulseEntry) {
              if (pulseEntry) {
                //console.log(ts()+"publishMatrix(): entry="+dump(pulseEntry)+" me="+dump(me));

                matrix.stack.unshift({"geo":pulseEntry.geo, "mint":pulseEntry.srcMint, "owls":pulseEntry.owls});
                //matrix.geoList+=pulseEntry.geo+":"+pulseEntry.srcMint+",";
                //matrix.owlList+=pulseEntry.owls+",";
                //console.log(ts()+"publicMatrix(): geoList="+geoList+" owlList="+owlList+" pulseEntry="+dump(pulseEntry));

                //stack.push( { "mint" : pulseEntry.mint, "geo" : pulseEntry.geo, "owls" : pulseEntry.owls } );

                if (pulseEntry.geo+":"+pulseEntry.group==lastEntry) {
                  //console.log(ts()+"READY TO ROCK. matrix="+dump(matrix));
                  for (var node=matrix.stack.pop(); node!=null; node=matrix.stack.pop()) {
                    if (typeof node.owls == "undefined") node.owls="";
                    if (typeof node.mint == "undefined") node.mint="";

                    matrix.geoList.push(node.geo+":"+node.mint);
                    //console.log(ts()+"node="+dump(node));
                    if ((typeof node.owls == "undefined") ||
                    (typeof node.mint == "undefined")) console.log("got apulseEntry w/no mint or owls: node.geo="+node.geo);
                    else {
                      var owlsAry=node.owls.split(",");
                      var toMint=node.mint;
                      //array of      3=34, 5=12, 6, 7, 8=23
                      for (var i in owlsAry) {

                        var fromMint=owlsAry[i].split("=")[0];
                        var owl=owlsAry[i].split("=")[1];
                        if (typeof owl == "undefined") owl="";
                        //console.log("geo="+node.geo+" owlsAry[i]="+owlsAry[i]+" fromMint="+fromMint+" owl="+owl);
              
                        var owlMeasure=""+fromMint+">"+toMint+"="+owl;
                        //console.log(ts()+"owlMeasure="+owlMeasure);
                        matrix.owl.push(owlMeasure);
                      }
                    }
                  }
                  //var txt=""+groupPulseEntry.seq+","+count+","+geoList+owlList;
                  //console.log("publishMatrix(): publishing matrix="+JSON.stringify(matrix));
                  delete matrix.stack;
                  redisClient.publish("matrix",JSON.stringify(matrix,null,2));

                }
              }
            });
          }
        }
      });
    });
  });
}


//
//  newMint() - We received a new Mint in an announcement
//              fetch the mintEntry from the group Owner and create a pulseGroup node entry
//
function newMint(mint) {
  //console.log("newMint(): mint="+mint+" isNaN(x)="+isNaN(mint));
  if (isNaN(mint)) {return console.log("newMint("+mint+"): bad mint: "+mint);}
  const http = require("http");
  redisClient.hgetall("mint:1",function (err,genesis) {
  
    const url = "http://"+genesis.ipaddr+":"+genesis.port+"/mint/"+mint;
    //console.log("FETCHMINT              fetchMint(): url="+url);
    http.get(url, res => {
      res.setEncoding("utf8");
      let body = "";
    
      res.on("data", data => {
        body += data;
      });
    
      res.on("end", () => {
        var mintEntry = JSON.parse(body);
        if (mintEntry==null || typeof mintEntry.geo=="undefined") {
          console.log("Genesis node says no such mint: "+mint+" OR mint.geo does not exist...Why are you asking. Should return BS record to upset discovery algorithms");
        } else {
          //console.log("mint:"+mint+"="+dump(mintEntry));
          redisClient.hmset("mint:"+mint, mintEntry, function (err,reply) {
            console.log("mint:"+mint+"="+dump(mintEntry)+" WRITTEN TO REDIS");
            var newSegmentEntry={  //one record per pulse - index = <geo>:<group>
              "geo" : mintEntry.geo,            //record index (key) is <geo>:<genesisGroup>
              "group": mintEntry.group,      //add all nodes to genesis group
              "seq" : "0",         //last sequence number heard
              "pulseTimestamp": "0", //last pulseTimestamp received from this node
              "srcMint" : ""+mint,      //claimed mint # for this node
              // =
              "owls" : "",  //owls other guy (this is ME so 0!) is reporting
              //"owls" : getOWLs(me.group),  //owls other guy is reporting
              //node statistics - we measure these ourselves
              "owl": "",   //NO OWL MEASUREMENT HERE (YET)
              "inOctets": "0",
              "outOctets": "0",
              "inMsgs": "0",
              "outMsgs": "0",
              "pktDrops": "0"     //as detected by missed seq#
              //"remoteState": "0"   //and there are mints : owls for received pulses 
            };
            //console.log("newSegmentEntry="+dump(newSegmentEntry));

            redisClient.hmset(mintEntry.geo+":"+mintEntry.group, newSegmentEntry);
            //console.log("Past first set");
            redisClient.hgetall(mintEntry.geo+":"+mintEntry.group, function (err,newSegment) {
              console.log("FETCHED MINT - NOW MAKE AN ENTRY "+mintEntry.geo+":"+mintEntry.group+" -----> ADDED New Segment: "+dump(newSegment));
              redisClient.hmset("gSRlist", {
                [mintEntry.geo+":"+mintEntry.group] : mint

              });
              //
              //  if Genesis node, expire in 1 minute before removing it
              //  else 5 minutes
              //redisClient.ttl(mintEntry.geo+":"+mintEntry.group, function(err,ttl) {
              //  console.log("ttl="+ttl);
              //});

              if (mintEntry.geo==mintEntry.group.split(".")[0]) {
                //GENESIS NODE RECORD
                //redisClient.expire(mintEntry.geo+":"+mintEntry.group,60*3)  //expire genesis record 
                //by removing this entry, the owls don't exist, noone will get pulsed
              } else {
                //redisClient.expire(mintEntry.geo+":"+mintEntry.group,2*60)  //expire non-genesis record 
              }
              redisClient.publish("members","ADDED pulseGroup member mint:"+newSegmentEntry.srcMint+" "+newSegmentEntry.geo+":"+newSegmentEntry.group)
            });
          });
        }
      });
    });  //res.on end
  })
}


//
//  pulse - pulser for each me.pulseGroup
//
function pulse(oneTime) {
if (typeof oneTime == "undefined") {
    setTimeout(pulse, CYCLETIME * 1000);  //10 second pollingfrequency
    setTimeout(publishMatrix,(CYCLETIME * 1000)/2);  // In 5 seconds call it
    oneTime=0;
} 
//  get all my pulseGroups
  redisClient.hgetall("mint:0", function(err, me) {
    if ((me==null) || ((me.state=="SINGLESTEP")&&(!oneTime))) 
      return //console.log(ts()+" pulse(): SINGLESTEPING ");
    //if (me.state=="PULSE") me.state=="SINGLESTEP";
    GEO=me.geo;
    var cursor = '0';     // DEVOPS:* returns all of my pulseGroups
    redisClient.scan(cursor, 'MATCH', me.geo+":*", 'COUNT', '1000', function(err, pulseGroups){
      if (err){
          throw err;
      }
      //console.log("pulser(): myPulseGroups="+dump(pulseGroups));

      cursor = pulseGroups[0];
      if (cursor === '0'){
          // reply[1] is an array of matched keys: me.geo:*
          var SRs=pulseGroups[1]; //[0] is the cursor returned
          //console.log( "We need to pulse each of these SRs="+SRs); 

          for (var i in SRs) {
            console.log("PULSER(): Pulsing SegmentRouter="+SRs[i]);
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

                networkClient.send(pulseMsg,node.port,node.ipaddr,function(error){     //*** send Message
                
                  if(error) {
                    console.log(ts()+"pulser NetSend error");
                    networkClient.close();
                  } else {
                    //redisClient.hset("")
                    //console.log("sent dump node="+dump(node))
                    var message=pulseMsg+" sent to "+node.ipaddr+":"+node.port+" ->"+node.pulseLabel
                    //console.log(message);
                    redisClient.publish("pulses",message);
                    //console.log(ts()+"PULSER LOOP: pulseLabel="+pulseLabel+" node="+dump(node));

                  //update stats on this groupPulse (DEVOPS:DEVOPS.1) record
                  //var pulseLabel=mintEntry.geo+":"+mintEntry.group;
                   redisClient.hgetall(pulseLabel, function(err, groupEntry) {
                    if (groupEntry==null) groupEntry={outOctets : "0",outMsgs : "0"};
                    var pulse={
                      outOctets : ""+(parseInt(groupEntry.outOctets)+pulseMsg.length),
                      outMsgs : ""+(parseInt(groupEntry.outMsgs)+1)
                    };
                    //console.log(ts()+"setting stats for node= "+dump(node)+" groupEntry Record: "+pulseLabel);
                    redisClient.hmset(pulseLabel, pulse);  //update stats
                    //
                    //  Do the same for the out counters for the node I am sending to
                    //
                    var pulseEntryLabel=node.pulseLabel
                    //console.log(ts()+"PULSER(): pulseEntryLabel="+pulseEntryLabel);
                    redisClient.hgetall(pulseEntryLabel, function(err, pulseEntry) {
                        if (pulseEntry==null) pulseEntry={outOctets : "0",outMsgs : "0"};
                        var pulse={
                          outOctets : ""+(parseInt(pulseEntry.outOctets)+pulseMsg.length),
                          outMsgs : ""+(parseInt(pulseEntry.outMsgs)+1)
                        };
                        //console.log(ts()+"setting stats for target Record: "+pulseEntryLabel);
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
      } else newMint(mint); //go fetch the mint from the group owner - the genesis node

    }
  });
}

