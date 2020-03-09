//
// express.ts - set up the "me" and connect to the network by getting config from the genesis node
//
//import { me } from '../config/config';
import { dump, now, me } from '../lib/lib';
//import { gME } from '../config/config';

const expressRedis = require('redis');
var expressRedisClient = expressRedis.createClient(); //creates a new client

var express = require('express');
var app = express();

app.get('/', function (req, res) {
   res.send('express root dir');
})
//
// Configuration for node - allocate a mint
//
app.get('/nodefactory', function (req, res) {
   //console.log('****EXPRESS; config requested with params: '+dump(req.query));

   //console.log("EXPRESS geo="+req.query.geo+" publickey="+req.query.publickey+" query="+JSON.stringify(req.query,null,2)+" port="+req.query.port+" wallet="+req.query.wallet);
   var geo=req.query.geo;
   var publickey=req.query.publickey;
   var port=req.query.port||65013;
   var wallet=req.query.wallet||"";
   // store incoming public key, ipaddr, port, geo, etc.
   var incomingIP=req.headers['x-forwarded-for'] || req.connection.remoteAddress;
   //console.log("****EXPRESS  geo="+geo+" publickey="+publickey+" port="+port+" wallet="+wallet+" incomingIP="+incomingIP);

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
                  console.log("******** EXPRESS redis genesis="+dump(genesis));
                  //console.log("express(): err="+err+" port="+port);
                  expressRedisClient.hgetall("me",function (err,me){          //get ME data
                     if (err) {
                         console.log("Cant find Genesis node in redis - maybe I am Genesis Node?");
                     }
                     var nodeEntry=geo+":"+me.group;
                     console.log("******** EXPRESS redis me="+dump(me));
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
                           "pulseTimestamp": "0", //last pulseTimestamp
                           "inOctets": "0",
                           "outOctets": "0",
                           "inMsgs": "0",
                           "outMsgs": "0",
                           "owl": "0",
                           "pktDrops": "0",
                           "remoteState": "0"   //and there are mints : owls for received pulses 
                     };
                     //make any adjustmenets here for gebnesis vs non genesis nodes
                     expressRedisClient.hmset(nodeEntry, newNode);

                     console.log("nodeEntry="+nodeEntry+" publickey=" +publickey+" pulseGroups" + newNode.pulseGroups + " me.group="+me.group);
                     expressRedisClient.hset(me.group, newMint+">"+me.mint, 0 );
                     //expressRedisClient.hset(me.geo+":"+me.group, newMint, 0);

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
                           console.log("Node connection established - now rebuild new configuration for witreguard configuration file to allow genesis to sendus stuff");

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

expressRedisClient.hget("me","port",function (err,port){
if (!port) port=65013;
var server = app.listen(port,'0.0.0.0', function () {
   var host = server.address().address
   var port = server.address().port  
   console.log("Express app listening at http://%s:%s", host, port)
})

});