//
//  handlePulse - receive incoming pulses and store in redis
//
import { now, ts ,dump, newMint } from '../lib/lib.js';

const pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client

var dgram = require('dgram');
var server = dgram.createSocket('udp4');

var MYBUILD="";

var isGenesisNode=false;

redisClient.hgetall("mint:0", function (err,me) {
  if (err) {
    console.log("hgetall me failed");
  } else {
    if (me==null) {
      console.log("handlePulse() - can't find me entry...exitting");
      process.exit(127);
    }
    //console.log("handlePulse(): Configuration  me="+dump(me));
    MYBUILD=me.version;
    redisClient.hgetall("mint:1", function (err,genesis) {
      if (err) {
        console.log("hgetall genesis failed");
      } else {
        console.log("HANDLEPULSE(): genesis="+dump(genesis));
        if ( genesis && (genesis.publickey == me.publickey))
          isGenesisNode=true;
        //if (genesis==null) {
        //  console.log("handlePulse() - can't find genesis entry...exitting");
        //  process.exit(127);
        //}
        //console.log("handlePulse(): genesis="+dump(genesis));
        //server.bind(me.port, "0.0.0.0");
      }
    });
    server.bind(me.port, "0.0.0.0");
  }
});

//
// listen for incoming pulses and convert into redis commands
//
server.on('listening', function() {
  var address = server.address();
 console.log('UDP Server listening on ' + address.address + ':' + address.port);
 console.log(ts()+"");
 console.log(ts()+"");
 console.log(ts()+"");
 console.log(ts()+"");
 console.log(ts()+"");

 console.log(ts()+"");
 console.log(ts()+"");
 console.log(ts()+"");
 console.log(ts()+"");
 console.log(ts()+"");
 console.log(ts()+"");
 console.log(ts()+"");
 
});

//
//  message format: 0,56,1583783486546,MAZORE,MAZORE.1,1>1=0,2>1=0
//
//    from pulser.ts:
//var pulseMessage="0,"+me.version+","+me.geo+","+pulseGroup+","+seq+","+now()+","+me.mint+",";  //MAZORE:MAZJAP.1
//
server.on('message', function(message, remote) {
  console.log("HANDLEPULSE: received pulse from "+remote.address + ':' + remote.port +' - ' + message);
  var msg=message.toString();
  var ary=msg.split(",");
  //try {
  var pulseTimestamp=ary[5];                  //1583783486546
  var pulseLabel=ary[2]+":"+ary[3];

  var owlsStart=nth_occurrence (msg, ',', 7);   //owls start after the 7th comma
  var owls=msg.substring(owlsStart+1,msg.length-1);

  //console.log(ts()+"handlepulse(): owls="+owls);

  redisClient.hgetall(pulseLabel, function(err, oldPulse) {
    //console.log("oldPulse.inMsgs="+oldPulse.inMsgs+" oldPulse.inOctets"+oldPulse.inOctets);
    if (oldPulse==null) {
      oldPulse={ "inOctets" : "0", "inMsgs" : "0"}
    }
    if (err) {console.log("ERROR in on.message handling");}
    var pulse={
      version : ary[1],
      geo : ary[2],
      group : ary[3],
      seq : ary[4],
      pulseTimestamp : pulseTimestamp,
      srcMint : ary[6],
      owls : owls,
      owl : now()-pulseTimestamp,
      lastMsg : msg,
      inOctets : ""+(parseInt(oldPulse.inOctets)+message.length),
      inMsgs : ""+(parseInt(oldPulse.inMsgs)+1)
    };
    redisClient.publish("pulses",msg)
    //
    //  if groupOwner pulsed this - make sure we have the credentials for each node
    //
    //console.log("pulse="+dump(pulse));

    if (pulse.srcMint=="1" || pulse.srcMint!="1" ) {   ///Believe the group Owner wrt population
        //console.log("HANDLEPULSE() pulse from Genesis node");
        var mints=pulse.owls.replace(/=[0-9]*/g,'').split(",");
        //console.log("HANDLEPULSE() mints="+mints);

        for (var mint in mints) {
          let mintLabel=mints[mint];
          //console.log("HANDLEPULSE mint="+mint+" mints="+mints+" mintLabel="+dump(mintLabel))
          redisClient.hget("mint:"+mintLabel, "mint", function (err,mintValue) {
            if (err) console.log("handlePulse - error checking mint exists. ERROR - should not happen");
            //console.log("HANDLEPULSE "+mintLabel+" mintValue="+mintValue)
            if (!mintValue ) {
              console.log("Fetching mint="+mintLabel+" from genesis Node");
              newMint(mintLabel);  //new Mint
            }

          });
        }
    } 
    redisClient.hmset(pulseLabel,pulse, function (err,reply) {
      redisClient.hgetall(pulseLabel, function (err,pulseRecord) {
        //console.log("HANDLEPULSE STOWING pulseRecord="+dump(pulseRecord));
        redisClient.hmset("mint:"+pulse.srcMint,"owl",pulse.owl);
      });

      //console.log(ts()+" HANDLEPULSE(): Checking version "+pulse.version+" vs. "+MYBUILD);
      if ( pulse.version != MYBUILD && !isGenesisNode ) {
        console.log(ts()+" HANDLEPULSE(): NEW SOFTWARE AVAILABLE - GroupOwner said "+pulse.version+" we are running "+MYBUILD+" .......process exitting");
        process.exit(36);  //SOFTWARE RELOAD
      }
    });
  });
});

function nth_occurrence (string, char, nth) {
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
//  newMint() - We received a new Mint in an announcement
//              fetch the mintEntry from the group Owner and create a pulseGroup node entry
//
function newMint(mint) {
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
            console.log("newSegmentEntry="+dump(newSegmentEntry));

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
              if (mintEntry.geo==mintEntry.group.split(".")[0]) {
                //GENESIS NODE RECORD
                redisClient.expire(mintEntry.geo+":"+mintEntry.group,60*3)  //expire genesis record 
                //by removing this entry, the owls don't exist, noone will get pulsed
            } else {
                redisClient.expire(mintEntry.geo+":"+mintEntry.group,60*1)  //expire non-genesis record 
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
//  checkSEversion() - reload SW if there is new code to be had
//
setTimeout(checkSWversion,5*1000);;
function checkSWversion() {
  setTimeout(checkSWversion,5*1000);;

  //console.log("checkSWversion() - currentSW="+MYBUILD);
  const http = require("http");
  redisClient.hgetall("mint:1",function (err,genesis) {
    const url = "http://"+genesis.ipaddr+":"+genesis.port+"/version";
    //console.log("checkSWversion(): url="+url);
    http.get(url, res => {
      res.setEncoding("utf8");
      let body = "";
  
      res.on("data", data => {
        body += data;
      });
  
      res.on("end", () => {
        var mintEntry = JSON.parse(body);
        //console.log("mintEntry="+dump(mintEntry));
        if ( mintEntry.version != MYBUILD && !isGenesisNode ) {
          console.log(ts()+" HANDLEPULSE(): NEW SOFTWARE AVAILABLE - GroupOwner said "+mintEntry.version+" we are running "+MYBUILD+" .......process exitting");
          process.exit(36);  //SOFTWARE RELOAD
        }
      });

    });
  });
}
