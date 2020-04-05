//
//  handlePulse - receive incoming pulses and store in redis
//
import { now, ts ,dump } from '../lib/lib.js';

const pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client

var dgram = require('dgram');
var server = dgram.createSocket('udp4');

redisClient.hgetall("mint:0", function (err,me) {
  if (err) {
    console.log("hgetall me failed");
  } else {
    if (me==null) {
      console.log("handlePulse() - can't find me entry...exitting");
      process.exit(127);
    }
    console.log("handlePulse(): me="+dump(me));
    server.bind(me.port, "0.0.0.0");
  }
});

redisClient.hgetall("mint:1", function (err,genesis) {
  if (err) {
    console.log("hgetall genesis failed");
  } else {
    if (genesis==null) {
      console.log("handlePulse() - can't find genesis entry...exitting");
      process.exit(127);
    }
    console.log("handlePulse(): genesis="+dump(genesis));
    //server.bind(me.port, "0.0.0.0");
  }
});


//
// listen for incoming pulses and convert into redis commands
//
server.on('listening', function() {
  var address = server.address();
 console.log('UDP Server listening on ' + address.address + ':' + address.port);
});

//
//  message format: 0,56,1583783486546,MAZORE,MAZORE.1,1>1=0,2>1=0
//
//    from pulser.ts:
//                      var pulseMessage="0,"+me.geo+","+pulseGroup+","+seq+","+now()+","+me.mint+","+;  //MAZORE:MAZJAP.1
//
server.on('message', function(message, remote) {
  console.log("HANDLEPULSE: received pulse from "+remote.address + ':' + remote.port +' - ' + message);
  var ary=message.toString().split(",");
  //try {
  var pulseTimestamp=ary[4];                  //1583783486546
  var pulseLabel=ary[1]+":"+ary[2];

  var owls=new Array();
  for (var i=6; i<ary.length; i++)
    owls[i-6]=ary[i];

  redisClient.hmget(pulseLabel,"inOctets","inMsgs", function(err,inOctets,inMsgs) {

    var pulse={
      geo : ary[1],
      group : ary[2],
      seq : ary[3],
      pulseTimestamp : pulseTimestamp,
      srcMint : ary[5],
      owls : owls,
      owl : now()-pulseTimestamp,
      msg : message,
      inOctets : inOctets+message.length,
      inMsgs : ++inMsgs
    };
    console.log("HANDLEPULSE pulse="+dump(pulse));
    redisClient.hmset(pulseLabel,pulse);

  });
});

//} catch(err) {
//  console.log("ERROR - BAD PULSE from "+remote.address + ':' + remote.port +' - ' + message);
//  return;
  //process.exit(127);
//}
//console.log("HANDLEPULSE pulseType="+pulseType+" seqNum="+seqNum+" pulseTimestamp "+pulseTimestamp+" remote.port="+remote.port);
//console.log("HANDLEPULSE pulseLabel="+pulseLabel+" OWL="+OWL+" ms from "+incomingIP+" owls="+owls);
//console.log("HANDLEPULSE pulseGroup="+pulseGroup+" pulseGroupOwner="+pulseGroupOwner+" receiveTimestamp= "+receiveTimestamp+" owls="+owls);
/*******
  redisClient.exists(pulseLabel, function(err, reply) {
    if (reply === 1) {
      console.log('HANDLEPULSE this pulsing node exists');
      //redisClient.hmset(pulseLabel, newNode );
      //update stats
    } else {   //create node
      console.log("HANDLEPULSE: ADDING NODE: "+pulseLabel);
    }

  var newNode={
    "geo" : pulseSource,
    "group": pulseGroup,      //add all nodes to gebnesis group
    "pulseTimestamp": ""+pulseTimestamp, //last pulseTimestamp we sent
    "lastSeq" : ""+seqNum,
    "owl": ""+OWL,          //my calculated owl fpor this node
    "ipaddr" : incomingIP,   //set by genesis node on connection
    "bootTime" : ""+now(),   //boot time is when joined the group
    "pulseGroups" : pulseGroup,  //list of groups I will pulse
    "inOctets": "0",        //all stats start at 0
    "outOctets": "0",
    "inMsgs": "0",
    "outMsgs": "0",
    "pktDrops": "0",
    "remoteState": message.toString()    //store literal owls
  };
  redisClient.hmset(pulseLabel, newNode)
  console.log("HANDLEPULSE: ADDED NEW NODE: "+pulseLabel+dump(newNode));

});

    // for each mint table entry, if match - set this data
//var ary=owls; //.split(",");
for (var i=0; i<owls.length; i++) {
  var key=owls[i].split("=")[0];
  var owl=owls[i].split("=")[1];

  console.log("HANDLEPULSE key="+key+" owl="+owl);
  //store the OWLs in redis
  redisClient.hset(pulseGroup,key,owl);   // store OWL

  }

});
**/

/***
redisClient.hgetall("me", function (err,me) {
    if (err) {
      console.log("hgetall me failed");
    } else {
      console.log("me="+dump(me));
      server.bind(me.port, me.ipaddr);
    }
});
***/