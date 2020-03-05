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
app.get('/config', function (req, res) {
   console.log('EXPRESS; config requested with params: '+dump(req.query));

   console.log("EXPRESS geo="+req.query.geo+" publickey="+req.query.publickey+" query="+JSON.stringify(req.query,null,2)+" port="+req.query.port+" wallet="+req.query.wallet);
   var geo=req.query.geo;
   var publickey=req.query.publickey;
   var port=req.query.port||65013;
   var wallet=req.query.wallet||"";
   // store incoming public key, ipaddr, port, geo, etc.
   var incomingIP=req.headers['x-forwarded-for'] || req.connection.remoteAddress;
   console.log("EXPRESS  geo="+geo+" publickey="+publickey+" port="+port+" wallet="+wallet+" incomingIP="+incomingIP);

   if ( (typeof geo == "undefined") ||
        (typeof publickey == "undefined") )
        res.end("express.js : missing geo and/or publickey ");
   // send hmset me command
   else {
      console.log("allocating a new mint ");
      expressRedisClient.incr("mintStack", (err, newMint) => {
         if (err) {
            console.log("err="+err);
         } else {
               expressRedisClient.hgetall("genesis",function (err,genesis){
                  if (err) {
                      console.log("Cant find Genesis node - maybe I am Genesis Node?")
                     
                  }
                  //console.log("EXPRESS  gME="+dump(gME));
               //console.log("express(): err="+err+" port="+port);
               
               var newNode={
                  "geo" : geo,
                  "port" : ""+port,
                  "ipaddr" : incomingIP,   //set by genesis node on connection
                  "publickey" : publickey,
                  "mint" : ""+newMint,      //set by genesis node
                  "bootTime" : ""+now(),   //boot time is when joined the group
                  "group": geo+".1",
                  "pulseGroups" : geo+".1",  //list of groups I will pulse
                  //genesis connection info
                  "genesisIP" : genesis.genesisIP,
                  "genesisPort" : ""+genesis.genesisPort,
                  "genesisPublickey" : genesis.genesisPublickey,
                  //statistics
                  "lastSeq": "0",
                  "pulseTimestamp": "0",
                  "inOctets": "0",
                  "outOctets": "0",
                  "inMsgs": "0",
                  "outMsgs": "0",
                  "owl": "0",
                  "pktDrops": "0",
                  "remoteState": "0"
               }
               if (newMint==1) {
                  //I am Genesis Node
                  var genesisEntry=geo+":"+geo+".1";
                  console.log("EXPRESS  GENSIS NODE SETTING "+genesisEntry);
                  expressRedisClient.hmset(genesis,newNode);
               } else {
                  //attached to genesis node
                  var entry=geo+":"+newNode.group+".1"
                  console.log("EXPRESS  Storing newNode as geo:mypulsegroup "+entry)
                  expressRedisClient.hmset(entry,newNode); 

                  console.log("EXPRESS returning config for new node="+JSON.stringify(newNode,null,2));
                  res.setHeader('Content-Type', 'application/json');   
                  res.end(JSON.stringify(newNode,null,2));
               }
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