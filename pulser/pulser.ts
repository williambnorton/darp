import { dump, getGenesis } from "../lib/lib";

//
//  pulse - send my owl measurements to my pulseGroups
//
//var HOST='127.0.0.1';
var genesisSR=getGenesis();
var HOST="104.42.192.234";

var PORT=65013;
var dgram = require('dgram');
var message = new Buffer('message pulseGoesHere');
var networkClient = dgram.createSocket('udp4');

const pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client

// get the genesis node
//redisClient.hgetall("me", function (err, identity) {
  //if (err) {
    //HOST=getGenesisIP();
    //console.log("HOST="+HOST);
  //} else {
    //console.log("me="+dump(me));
   //HOST=me.ipaddr; //+":"+me.port;
  //} 
  //console.log("Now that we have the genesisIP "+HOST+" - fetch the codenconfig");
  
//});


function pulse() {
  // pulse list of pulseGroups
  redisClient.hgetall('pulseGroups', function(err, pulseGroups) {
    if (err) {
        // do something like callback(err) or whatever
    } else {
      // do something with results
      console.log("pulseGroups="+JSON.stringify(pulseGroups,null,2));

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
      }
  }
  });
  setTimeout(pulse,3000); //pulse again in 3 seconds
}


//we will fetch this from groupOwner
// the system requires this data to dtart
var me={
  geo:"HOME",  //passed in on startup
  mint:2,       //assigned by genesis node delegated to groupOwner
  noiawallet:"3BjDVN35cZdsRzyo4Q9VY3LFy1RteNBxPz",   //passed to genesis on startup
  genesis:"104.42.192.234:65013:", 
  group:"HOME.1",
  ipaddr:" 71.202.2.184",  //genesis node returns this
  port:"65013",             //port
  publickey:"lvcLDqpzCmTdAxR9YCOeyubP8DAO8dh9svfRdiV8JEE",  //my public kee - generated before connection request
  noialen:77855,
}

redisClient.hmset("me",me);

redisClient.hgetall("me", function(err, myRecord) {
  if (typeof myRecord == "undefined") return console.log("redis has no me ");
  if (typeof myRecord.mint == "undefined") return console.log("redis has no me.mint ");

  me.mint=parseInt(myRecord.mint);
  me.geo=myRecord.geo;
  console.log("me="+dump(me));
});

pulse();

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

