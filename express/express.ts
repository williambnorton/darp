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
                     var obj={
                           "geo" : geo,
                           "port" : ""+port,
                           "ipaddr" : incomingIP,   //set by genesis node on connection
                           "publickey" : publickey,
                           "mint" : ""+newMint,      //set by genesis node
                           "bootTime" : ""+now(),   //boot time is when joined the group
                           "group": geo+".1",
                           "pulseGroups" : me.group,  //list of groups I will pulse
                           //genesis connection info
                           "genesisIP" : me.genesisIP,
                           "genesisPort" : me.genesisPort,
                           "genesisPublickey" : me.genesisPublickey||publickey,
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
                     };
                     expressRedisClient.hmset(nodeEntry, obj);

                     //console.log("**************");
                     if (newMint==1) {
                        console.log("* * * * * * * I am the Genesis Node * * * * * * *");
                        console.log("nodeEntry="+nodeEntry+" genesisPublickey=" +me.publickey+" pulseGroups" + me.pulseGroups + " me.group="+me.group);
                        expressRedisClient.hmset(nodeEntry, {
                           "genesisPublickey" : me.publickey,
                           "pulseGroups" : me.group
                        });
                        console.log("updated genesis node entry");

                        // create the pulseGroup as well - the MAZORE.1 as a list of mints
                        expressRedisClient.lpush(me.group, newMint);   //I am the first in the list of mints
                        console.log("push genesis first mint - me mint="+newMint+" geo="+me.geo+" ipaddr"+incomingIP+" port="+me.port+" publickey="+me.publickey+" wallet="+me.wallet);

                        expressRedisClient.hmset("mint:"+newMint, {   //Assigned MINT TABLE - needed info to connect to remote
                           "mint" : ""+newMint,
                           "geo" : me.geo,
                           "ipaddr" : incomingIP,
                           "port" : ""+me.port,
                           "publickey" : ""+me.publickey,
                           "wallet" : ""+me.wallet
                        });
                        console.log("pushed genesis first mint - me");

                        //here we would coninually update expiuration date
                     } else {
                        console.log("* * * * * * * Node mint #"+newMint+" * * * * * * *");

                        //put my pulseGroup into entry
                        expressRedisClient.hmset(nodeEntry, {
                           "genesisPublickey" : me.publickey
                        });
                     }
                     //
                     // whether genesis node or not, set a MAZORE:MAZORE.1 entry
                     //
                     expressRedisClient.hgetall(nodeEntry, function(err,json) {
                        if (err) console.log("hgetall nodeEntry="+nodeEntry+" failed");
                        else {
                           console.log("EXPRESS nodeFactory about to send json="+dump(json));
                           res.setHeader('Content-Type', 'application/json');   
                           res.end(JSON.stringify(json));
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