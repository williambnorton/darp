//
//  handlePulse - receive incoming pulses and store in redis
//
import { now, ts ,dump } from '../lib/lib.js';

const pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client

var dgram = require('dgram');
var server = dgram.createSocket('udp4');

var MYBUILD="";

redisClient.hgetall("mint:0", function (err,me) {
  if (err) {
    console.log("hgetall me failed");
  } else {
    if (me==null) {
      console.log("handlePulse() - can't find me entry...exitting");
      process.exit(127);
    }
    console.log("handlePulse(): me="+dump(me));
    MYBUILD=me.version;
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
  redisClient.hgetall(pulseLabel, function(err, oldPulse) {
    //console.log("oldPulse.inMsgs="+oldPulse.inMsgs+" oldPulse.inOctets"+oldPulse.inOctets);
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
      msg : msg,
      inOctets : ""+(parseInt(oldPulse.inOctets)+message.length),
      inMsgs : ""+(parseInt(oldPulse.inMsgs)+1)
    };
    redisClient.hmset(pulseLabel,pulse, function (err,reply) {
      redisClient.hgetall(pulseLabel, function (err,pulseRecord) {
        console.log("HANDLEPULSE Final pulseRecord="+dump(pulseRecord));
      });

      console.log(ts()+" HANDLEPULSE(): Checking version "+pulse.version+" vs. "+MYBUILD);
      if (pulse.version!=MYBUILD) {
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
