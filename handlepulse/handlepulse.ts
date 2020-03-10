//
//  handlePulse - receive incoming pulses and store in redis
//
import { now, ts ,dump } from '../lib/lib.js';

const pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client

var dgram = require('dgram');
var server = dgram.createSocket('udp4');

redisClient.hgetall("me", function (err,me) {
  if (err) {
    console.log("hgetall me failed");
  } else {
    if (me==null) {
      console.log("handlePulse() - can't find me entry...exitting");
      process.exit(127);
    }
    console.log("me="+dump(me));
    //server.bind(me.port, "0.0.0.0");

    server.bind(me.port, '0.0.0.0');
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
//  message format: 0,56,1583783486546,MAZORE:MAZORE.1,1>1=0,2>1=0
//
server.on('message', function(message, remote) {
console.log("HANDLEPULSE: received pulse from "+remote.address + ':' + remote.port +' - ' + message);
var ary=message.toString().split(",");
try {
  var incomingIP=remote.address;
  var pulseType=ary[0];
  var seqNum=ary[1];                            //56
  var pulseTimestamp=ary[2];                    //1583783486546
  var pulseLabel=ary[3];  //MAZORE:MAZORE.1     //MAZORE:MAZORE.1
  var pulseSource=ary[3].split(":")[0];         //MAZORE
  var pulseGroup=ary[3].split(":")[1];          //MAZORE.1
  var pulseGroupOwner=pulseGroup.split(".")[0];  //MAZORE
  var receiveTimestamp=now();
  var OWL=receiveTimestamp-pulseTimestamp;
  ary.unshift();
  ary.unshift();
  ary.unshift();
  var owls=ary;
} catch(err) {
  console.log("ERROR - BAD PULSE from "+remote.address + ':' + remote.port +' - ' + message);
  process.exit(127);
}
console.log("HANDLEPULSE pulseType="+pulseType+" seqNum="+seqNum+" ms pulseTimestamp "+pulseTimestamp+" remote.port="+remote.port);
console.log("HANDLEPULSE pulseLabel="+pulseLabel+" OWL="+OWL+" ms from "+incomingIP+" owls="+owls);
console.log("HANDLEPULSE pulseGroup="+pulseGroup+" pulseGroupOwner="+pulseGroupOwner+" ms receiveTimestamp= "+receiveTimestamp+" owls="+owls);


redisClient.exists(pulseLabel, function(err, reply) {
  if (reply === 1) {
      console.log('HANDLEPULSE this pulsing node exists');
      //update stats
  } else {   //create node
    console.log("HANDLEPULSE: ADDING NODE: "+pulseLabel);
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
      "remoteState": owls    //store literal owls
    };
    redisClient.hmset(pulseLabel, newNode)
    console.log("HANDLEPULSE: ADDED NEW NODE: "+pulseLabel+dump(newNode));

  }
});

    // for each mint table entry, if match - set this data
var ary=owls.split(",");
for (var i=0; i<ary.length; i++) {
  console.log("HANDLEPULSE ary["+i+"]="+ary[i]);

  /*  redisClient.hmgetall(pulseLabel, "mint:"+mint) { 
    //"port" : ""+port,
      //"publickey" : publickey,
      //"mint" : ""+newMint,      //set by genesis node
      //genesis connection info
      //"genesisIP" : me.genesisIP,
      //"genesisPort" : me.genesisPort,
      //"genesisPublickey" : me.genesisPublickey||publickey,
      //"wallet" : wallet,
    });
  */
}

});
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