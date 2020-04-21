//
//  handlePulse - receive incoming pulses and store in redis
//
import { now, ts ,dump, newMint, makeYYMMDD } from '../lib/lib.js';

var SHOWPULSES="0";
const pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client

var dgram = require('dgram');
var server = dgram.createSocket('udp4');

var MYBUILD="";

var isGenesisNode=false;
var MYPUBLICKEY="deadbeef00deadbeef00deadbeef0013"; //TESTIUNG VALID KEY
redisClient.hgetall("mint:0", function (err,me) {
  console.log("PULSER starting with me="+dump(me));
 if (me!=null)
    MYPUBLICKEY=me.publickey;
  else {
      console.log(ts()+"NO REDIS");
      process.exit(36)
  }
});

//
//  mint:0 is me and my configuration, mint:1 is the groupOwner - a Genesis node
//
redisClient.hgetall("mint:0", function (err,me) {
  if (err) {
    console.log("hgetall me failed");
  } else {
    if (me==null) {
      console.log("handlePulse() - can't find me entry...exitting");
      process.exit(50);  //no mint:0
    }
    //console.log("handlePulse(): Configuration  me="+dump(me));
    MYBUILD=me.version;
    redisClient.hgetall("mint:1", function (err,genesis) {
      if (err) {
        console.log("HANDLEPULSE(): hgetall genesis failed");
      } else {
        console.log("HANDLEPULSE(): genesis="+dump(genesis));
        if (genesis==null) {
          console.log(ts()+"HANDLEPULSE(): Weird - genesis iis null - exitting");
          console.log(ts()+"HANDLEPULSE(): Weird - genesis iis null - exitting");
          console.log(ts()+"HANDLEPULSE(): Weird - genesis iis null - exitting");
          console.log(ts()+"HANDLEPULSE(): Weird - genesis iis null - exitting");
          console.log(ts()+"HANDLEPULSE(): Weird - genesis iis null - exitting");
          console.log(ts()+"IGNORING");
          //process.exit(36);  //RELOAD
        }
        if ( genesis && (genesis.publickey == me.publickey))
          isGenesisNode=true;
      }
    });
    server.bind(me.port, "0.0.0.0");
  }
});



//
//  only callback if authenticated
//
function  authenticatedMessage(pulse, callback) {
  redisClient.hgetall("mint:"+pulse.srcMint, function (err,senderMintEntry) {

    if (senderMintEntry==null) {
      console.log("authenticateMessage(): DROPPING We don't have a mint entry for this pulse:"+dump(pulse));
      //callback(null,false);
    } else
      //simple authentication matches mint to other resources
    if (senderMintEntry.geo==pulse.geo ) callback(null, true)
    else {
      console.log("authenticateMessage: unauthenticated packet - geo "+pulse.geo+" did not match our mint table"+dump(pulse)+dump(senderMintEntry.geo));
      //callback(null,false)
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
  if (SHOWPULSES!="0") 
    console.log(ts()+"HANDLEPULSE: received pulse "+message.length+" bytes from "+remote.address + ':' + remote.port +' - ' + message);
  var msg=message.toString();
  var ary=msg.split(",");
  //try {
  var pulseTimestamp=ary[5];                  //1583783486546
  var OWL=now()-pulseTimestamp;
  if (OWL<=-999) OWL=-99999;  //we can filter out clocks greater than +/- 99 seconds off
  if (OWL>=999) OWL=99999;    //bad clocks lead to really large OWL pulses 
  var pulseLabel=ary[2]+":"+ary[3];

  var owlsStart=nth_occurrence (msg, ',', 7);   //owls start after the 7th comma
  var owls=msg.substring(owlsStart+1,msg.length-1);

  //console.log(ts()+"handlepulse(): owls="+owls);

  redisClient.hgetall(pulseLabel, function(err, oldPulse) {
    //console.log("oldPulse.inMsgs="+oldPulse.inMsgs+" oldPulse.inOctets"+oldPulse.inOctets);
    redisClient.hgetall("mint:0", function(err, me) {

      if (me.state=="RELOAD") process.exit(36);  //this is set when reload button is pressed in express
      if (me.state=="STOP") process.exit(86);  //this is set when reload button is pressed in express

      if (oldPulse==null) {     //first time we see this entry, include stats to increment
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
        owl : ""+OWL,
        lastMsg : msg,
        inOctets : ""+(parseInt(oldPulse.inOctets)+message.length),
        inMsgs : ""+(parseInt(oldPulse.inMsgs)+1)
      };

      authenticatedMessage(pulse, function(err,authenticated) {

      //console.log("*******pulse.version="+pulse.version+" MYBUILD="+MYBUILD+" dump pulse="+dump(pulse));
      if ( pulse.version != MYBUILD ) {
        if (!isGenesisNode) {
          console.log(ts()+" ******** HANDLEPULSE(): NEW SOFTWARE AVAILABLE isGenesisNode="+isGenesisNode+" - GroupOwner said "+pulse.version+" we are running "+MYBUILD+" .......process exitting");
          console.log("INSIDE test pulse.version="+pulse.version+" MYBUILD="+MYBUILD+" dump pulse="+dump(pulse));

          process.exit(36);  //SOFTWARE RELOAD
        }
      };

      redisClient.publish("pulses",msg)
      redisClient.hmset(pulseLabel, pulse);  //store the pulse
      

      redisClient.hmset("mint:"+pulse.srcMint, {
        "owl" : pulse.owl
      });

      storeOWL(pulse.geo,me.geo,OWL);

      //
      //  if groupOwner pulsed this - make sure we have the credentials for each node
      //
      //console.log("pulse="+dump(pulse));

        //console.log("HANDLEPULSE() pulse from Genesis node");
        var mints=pulse.owls.replace(/=-?[0-9]*/g,'').split(",");
        //console.log("HANDLEPULSE() mints="+mints+" pulse.owls="+pulse.owls);

        // if we get a mint from the groupOwner that we don't know about, fetch it
        for (var mint in mints) {
          let mintLabel=mints[mint];
          //console.log("HANDLEPULSE mint="+mint+" mints="+mints+" mintLabel="+dump(mintLabel))
          redisClient.hget("mint:"+mintLabel, "mint", function (err,mintValue) {
            if (err) console.log("handlePulse - error checking mint exists. ERROR - should not happen");
            //console.log("HANDLEPULSE "+mintLabel+" mintValue="+mintValue)
            if (!mintValue ) {
              console.log("Fetching mint="+mintLabel+" for "+pulse.geo+" from genesis Node");
              newMint(mintLabel);  //new Mint
            }

          });
        }
 
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
  var filename = process.env.DARPDIR+"/"+src + '-' + dst + '.' + YYMMDD + '.txt';
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
//  checkSEversion() - reload SW if there is new code to be had
//this is needed because when genesis dies and doesn't know about the peers - peers must reloadSW
//
setTimeout(checkSWversion,20*1000);; // see if we need new SW

function checkSWversion() {
  setTimeout(checkSWversion,30*1000);;
  //console.log("checkSWversion() - currentSW="+MYBUILD);
  const http = require("http");
  redisClient.hgetall("mint:1",function (err,genesis) {
    if (err || genesis==null) {
      console.log("checkSWversion(): WE HAVE NO Genesis Node mint:1 pulse error="+err+" RELOAD");
      process.exit(36);
    }
    const url = "http://"+genesis.ipaddr+":"+genesis.port+"/version";
    //console.log("checkSWversion(): url="+url);
    http.get(url, res => {
      res.setEncoding("utf8");
      let body = "";
  
      res.on("data", data => {
        body += data;
      });
  
      res.on("end", () => {
        var version = JSON.parse(body);
        //console.log("mintEntry="+dump(mintEntry));
        if ( version != MYBUILD && !isGenesisNode ) {
           console.log(ts()+" handlepulse.ts checkSWversion(): NEW SOFTWARE AVAILABLE - GroupOwner said "+version+" we are running "+MYBUILD+" .......process exitting");
           process.exit(36);  //SOFTWARE RELOAD
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

 console.log(ts()+"");
 console.log(ts()+"");
 console.log(ts()+'UDP Server listening for pulses on ' + address.address + ':' + address.port);
 console.log(ts()+"");
 console.log(ts()+"");
 
});

process.on('SIGTERM', () => {
  console.info('handlePulse SIGTERM signal received.');
  process.exit(36);
});
