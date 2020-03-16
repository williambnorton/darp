//
// express.ts - set up the "me" and connect to the network by getting config from the genesis node
//
//import { me } from '../config/config';
import { dump, now, me } from '../lib/lib';
//import { gME } from '../config/config';
var rKeys = require('../rKeys/rKeys.js'),
rk = rKeys.rk;
console.log("rk="+dump(rk));

const expressRedis = require('redis');
var expressRedisClient = expressRedis.createClient(); //creates a new client

var express = require('express');
var app = express();

app.get('/me', function (req, res) {
   //res.send('express root dir');
   res.setHeader('Content-Type', 'application/json');
   res.setHeader("Access-Control-Allow-Origin", "*");
   expressRedisClient.hgetall("me", function (err,me){
      res.end(JSON.stringify(me, null, 3));
   });
   return;
})

//
// forEachPulseGroupMint() iterator
//
function forEachPulseGroupMint(callback) {
   expressRedisClient.hgetall("me", function (err,me){
      var results=new Array();
      var myPulseGroups=me.pulseGroups.split(" ");
      for (var pulseGroup in myPulseGroups) {
         var entry=myPulseGroups[pulseGroup];
         expressRedisClient.hgetall(entry, function (err, mintTableEntry) {
            
            for (var mint in mintTableEntry) {
               var mintEntry=pulseGroup[mint];
               var srcMint=parseInt(mint.split(">")[0]);
               var dstMint=parseInt(mint.split(">")[1]);

               expressRedisClient.hgetall("mint:"+srcMint, function (err, mintTableEntry) {
                  if (err) {console.log("forEachPulseGroupMint(): ERROR")}
                  if (mintTableEntry.length==myPulseGroups.length) {
                     console.log("returning results="+dump(results));
                     callback(results);  
                  } else { 
                     results.push(mintTableEntry);
                  }
               });
            }  
         });   
      }   
   });
}

/** 
function fetch( callback ) {
   var results = new Array();
   client.smembers( "users", function(err,users) {
      if ( users.length == 0 )
         return callback( results );
      users.forEach( function(id) {
         client.hgetall(id, function(err,items) {
            var obj = {};
            obj[id] = items; # here id can be accessed since it is part of the closure
            results.push(obj);
            if ( results.length == users.length ) {
               callback( results );
            }
         });
      });
   });
}

fetch( function(results) {
   console.log(JSON.stringify(results));
});
**/

//
//    htmlPulseGroups() - 
//
function htmlPulseGroups(res) {
   console.log("htmlPulseGroups(): ");
   var str="";
   forEachPulseGroupMint(function (pulseGroup, mintTableEntry){
      console.log("htmlPulseGroups(): pulseGroup="+pulseGroup+" mintTableEntry="+dump(mintTableEntry));
      str+=mintTableEntry.geo+":"+mintTableEntry.ipaddr+":"+mintTableEntry.port+":"+mintTableEntry.publickey+":"+mintTableEntry.wallet;
      //console.log("str="+str);
      return str;
   });
   console.log("Exitting htmlPulseGroups() str="+str);
   return str;
}

app.get('/', function (req, res) {
   //res.send('express root dir');
   res.setHeader('Content-Type', 'application/json');
   res.setHeader("Access-Control-Allow-Origin", "*");
   htmlPulseGroups(res);
   res.end("{}");
   //
    return;

});

//
// Configuration for node - allocate a mint
//
app.get('/nodefactory', function (req, res) {
   console.log('****EXPRESS; config requested with params: '+dump(req.query));

   console.log("EXPRESS geo="+req.query.geo+" publickey="+req.query.publickey+" query="+JSON.stringify(req.query,null,2)+" port="+req.query.port+" wallet="+req.query.wallet);
   var geo=req.query.geo;
   var publickey=req.query.publickey;
   var port=req.query.port||65013;
   var wallet=req.query.wallet||"";
   var incomingTimestamp=req.query.ts||now();
   var OWL=Math.round(now()-incomingTimestamp);
   // store incoming public key, ipaddr, port, geo, etc.
   var incomingIP=req.headers['x-forwarded-for'] || req.connection.remoteAddress;
   //console.log("****EXPRESS  geo="+geo+" publickey="+publickey+" port="+port+" wallet="+wallet+" incomingIP="+incomingIP);

//
//    Admission control goies here - test wallet, stop accepting nodeFactory requests
//

   if ( (typeof geo == "undefined") ||
        (typeof publickey == "undefined") )
        res.end("express.js : missing geo and/or publickey ");
        // send hmset me command
   else {
      expressRedisClient.incr("mintStack", (err, newMint) => {
         if (err) {
            console.log("mintStack alloocation err="+err);
         } else {
               expressRedisClient.hgetall("genesis",function (err,genesis){   //get GENESIS data
                  if (err) {
                      console.log("Cant find Genesis node in redis - maybe I am Genesis Node?");
                  }
                  //console.log("******** EXPRESS redis genesis="+dump(genesis));
                  //console.log("express(): err="+err+" port="+port);
                  expressRedisClient.hgetall("me",function (err,me){          //get ME data
                     if (err) {
                         console.log("Cant find Genesis node in redis - maybe I am Genesis Node?");
                     }
                     var nodeEntry=geo+":"+me.group;
                     //console.log("******** EXPRESS redis me="+dump(me));
                        //console.log("nodeEntry="+JSON.stringify())
                     var newNode={
                           "geo" : geo,
                           "group": me.group,      //add all nodes to gebnesis group
                           "port" : ""+port,
                           "ipaddr" : incomingIP,   //set by genesis node on connection
                           "publickey" : publickey,
                           "mint" : ""+newMint,      //set by genesis node
                           "bootTime" : ""+now(),   //boot time is when joined the group
                           "pulseGroups" : me.group,  //list of groups I will pulse
                           //genesis connection info
                           "genesisIP" : me.genesisIP,
                           "genesisPort" : me.genesisPort,
                           "genesisPublickey" : me.genesisPublickey||publickey,
                           "wallet" : wallet,
                           //statistics
                           "lastSeq": "0",      //lastSeq I sent out
                           "pulseTimestamp": ""+now(), //last pulseTimestamp we sent
                           "inOctets": "0",
                           "outOctets": "0",
                           "inMsgs": "0",
                           "outMsgs": "0",
                           "owl": ""+OWL,
                           "pktDrops": "0",
                           "remoteState": "0"   //and there are mints : owls for received pulses 
                     };
                     //make any adjustmenets here for genesis vs non genesis nodes
                     expressRedisClient.hmset(nodeEntry, newNode);
                     if ( newMint == 1 ) {
                        expressRedisClient.hset("me","mint",1);  //I am genesis - set me.mint=1
                        expressRedisClient.hset(me.group, "1"+">"+"1", 0 );  
                     } else {
                        //console.log("nodeEntry="+nodeEntry+" publickey=" +publickey+" pulseGroups" + newNode.pulseGroups + " me.group="+me.group);
                        expressRedisClient.hset(me.group, newMint+">"+me.mint, 0 );
                     //expressRedisClient.hset(me.geo+":"+me.group, newMint, 0);
                     }
                     //Assigned MINT TABLE - needed info to connect to remote
                     expressRedisClient.hmset("mint:"+newMint, {   
                        "mint" : newNode.mint,
                        "geo" : newNode.geo,
                        "ipaddr" : newNode.ipaddr,
                        "port" : ""+newNode.port,
                        "publickey" : ""+newNode.publickey,
                        "wallet" : ""+newNode.wallet
                     });
                     //
                     // whether genesis node or not, set a MAZORE:MAZORE.1 entry
                     //
                     expressRedisClient.hgetall(nodeEntry, function(err,json) {
                        if (err) console.log("hgetall nodeEntry="+nodeEntry+" failed");
                        else {
                           console.log("EXPRESS nodeFactory about to send json="+dump(json));
                           res.setHeader('Content-Type', 'application/json');   
                           res.end(JSON.stringify(json));
                           console.log("EXPRESS: Node connection established - now rebuild new configuration for witreguard configuration file to allow genesis to sendus stuff");

                           console.log("EXPRESS nodeFactory done");
                        }
                     });
                     
               });
            });
         }
      });

   }
})

function popMint() {
var mint=0;
   expressRedisClient.incr("mintStack", (err, newMint) => {
      if (err) {
       console.log("err="+err);
      } else {
       //debug('Generated incremental id: %s.', newId);
       mint=newMint;;
      }
     });
}

//
// bind the TCP port for externalizing 
//
expressRedisClient.hget("me","port",function (err,port){
   if (!port) port=65013;
      var server = app.listen(port,'0.0.0.0', function () {
      var host = server.address().address
      var port = server.address().port  
      console.log("Express app listening at http://%s:%s", host, port)
   })

});