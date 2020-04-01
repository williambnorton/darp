//
// express.ts - set up the "me" and connect to the network by getting config from the genesis node
//
// incoming environmental variables:
//    GENESIS - IP of Genesis node
//    MYIP - my measured IP address
//    DARPDIR - where the code and config reside
//    VERSION - of software running
//    HOSTNAME - human readable text name - we use this for "geo"
//    PUBLICKEY - Public key 
//

import { dump, now } from '../lib/lib';
const expressRedis = require('redis');
var expressRedisClient = expressRedis.createClient(); //creates a new client
var express = require('express');
var app = express();

//
// 
//
app.get('/me', function (req, res) {
   //res.send('express root dir');
   res.setHeader('Content-Type', 'application/json');
   res.setHeader("Access-Control-Allow-Origin", "*");
   expressRedisClient.hgetall("mint:0", function (err,me){
      res.end(JSON.stringify(me, null, 3));
   });
   return;
})

//
//    htmlPulseGroups() - 
//
function htmlPulseGroups() {
   console.log("htmlPulseGroups(): ");
   //forEachPulseGroupMint(function (pulseGroup, mintTable){
     // console.log("htmlPulseGroups(): pulseGroup="+pulseGroup+" mintTable="+dump(mintTable));
      //console.log("str="+str);
   //});
}

app.get('/', function (req, res) {
   console.log("fetching '/' state");
   //list(req,res);
   //return;
   //res.send('express root dir');
   res.setHeader('Content-Type', 'text/json');
   res.setHeader("Access-Control-Allow-Origin", "*");
   expressRedisClient.hgetall("mint:0", function (err,me){
      res.end(JSON.stringify(me, null, 2));
   });
   //var html=htmlPulseGroups();
   //res.end(html);
   //
    return;

});

//
// nodeFactory
//       Configuration for node - allocate a mint
//
app.get('/nodefactory', function (req, res) {
   //onsole.log('****EXPRESS; config requested with params: '+dump(req.query));

   //console.log("EXPRESS geo="+req.query.geo+" publickey="+req.query.publickey+" query="+JSON.stringify(req.query,null,2)+" port="+req.query.port+" wallet="+req.query.wallet+" version="+req.query.version);
   var geo=req.query.geo;
   var publickey=req.query.publickey;
   var port=req.query.port||65013;
   var wallet=req.query.wallet||"";
   var incomingTimestamp=req.query.ts||now();
   var OWL=Math.round(now()-incomingTimestamp);
   // store incoming public key, ipaddr, port, geo, etc.
//   var incomingIP=req.headers['x-forwarded-for'] || req.connection.remoteAddress;
//   var incomingIP=req.connection.remoteAddress;
   var incomingIP=req.query.myip;  /// for now we believe the node's IP
   var clientIncomingIP=req.headers['x-forwarded-for'] || req.connection.remoteAddress;
   //console.log("req="+dump(req));
   var version=req.query.version;
   //console.log("EXPRESS /nodefactory clientIncomingIP="+clientIncomingIP+" geo="+geo+" publickey="+publickey+" port="+port+" wallet="+wallet+" incomingIP="+incomingIP+" version="+version);
   //console.log("req="+dump(req.connection));
//
//    Admission control goies here - test wallet, stop accepting nodeFactory requests
//

   expressRedisClient.incr("mintStack", (err, newMint) => {   //me and genesis node objects
      if (newMint==1) {    //I AM GENESIS NODE - set my records
         console.log("* * * * * * * I AM GENESIS NODE * * * * * *")
         var mint0={
            "mint" : "0",      //overwrite initial mint0 record - we are genesis
            "geo" : geo,
            // wireguard configuration details
            "port" : ""+port,
            "ipaddr" : incomingIP,   //set by genesis node on connection
            "publickey" : publickey,
            //
            "bootTime" : ""+now(),   //So we can detect reboots
            "version" : version,  //software version
            "wallet" : wallet,
            "owl": "0"   //
         }
         expressRedisClient.hmset("mint:0",mint0); 
         mint0.mint="1";
         mint0.owl="0"
         expressRedisClient.hmset("mint:1",mint0); 
      } 
      // CONFIG for NODE
      var newMintRecord={};
      expressRedisClient.hgetall("mint:1", function (err,genesis) {  //get GENESIS mint entry
         // Use the genesis node info to create the config
         var newMintRecord={
            "mint" : ""+newMint,      //set by genesis node
            "geo" : geo,
            // wireguard configuration details
            "port" : ""+port,
            "ipaddr" : incomingIP,   //set by genesis node on connection
            "publickey" : publickey,
            //
            "bootTime" : ""+now(),   //So we can detect reboots
            "version" : version,  //software version
            "wallet" : wallet,
            "owl" : ""+OWL   //how long it took this node's last record to reach me
         };
         expressRedisClient.hmset("mint:"+newMint,newMintRecord);

         // Now for a record of this newNode in the Genesis group
         //get group owner (genesis group) OWLS
         
         var genesisGroupEntry={  //one record per pulse - index = <geo>:<group>
            "geo" : genesis.geo,            //record index (key) is <geo>:<genesisGroup>
            "group": genesis.geo+".1",      //add all nodes to genesis group
               "seq" : "0",         //last sequence number heard
               "pulseTimestamp": "0", //last pulseTimestamp received from this node
               "srcMint" : "1",      //claimed mint # for this node
              // =
               "owls" : genesis.owls,  //owls other guy is reporting
               //"owls" : getOWLs(me.group),  //owls other guy is reporting
               //node statistics - we measure these ourselves
               "owl": ""+OWL,   //how long it took this node's last record to reach me
               "inOctets": "0",
               "outOctets": "0",
               "inMsgs": "0",
               "outMsgs": "0",
               "pktDrops": "0",     //as detected by missed seq#
               "remoteState": "0"   //and there are mints : owls for received pulses 
         };
         var newSegmentEntry={}, gSRlist="";
         if ( newMint != 1 ) {
            newSegmentEntry={  //one record per pulse - index = <geo>:<group>
            "geo" : geo,            //record index (key) is <geo>:<genesisGroup>
            "group": genesis.geo+".1",      //add all nodes to genesis group
               "seq" : "0",         //last sequence number heard
               "pulseTimestamp": "0", //last pulseTimestamp received from this node
               "srcMint" : ""+newMint,      //claimed mint # for this node
               // =
               "owls" : "1,"+newMint+"="+OWL,  //owls other guy is reporting
               //"owls" : getOWLs(me.group),  //owls other guy is reporting
               //node statistics - we measure these ourselves
               //"owl": ""+OWL,   //how long it took this node's last record to reach me
               "inOctets": "0",
               "outOctets": "0",
               "inMsgs": "0",
               "outMsgs": "0",
               "pktDrops": "0",     //as detected by missed seq#
               "remoteState": "0"   //and there are mints : owls for received pulses 
            };
            gSRlist=","+geo+":"+genesis.geo+".1";
         }
         expressRedisClient.hmset( "gSRlist", ""+newMint, geo+":"+genesis.geo+".1" );
         expressRedisClient.hmset( "gSRlist", "1", genesis.geo+":"+genesis.geo+".1" );

         var node={
            mint0 : newMintRecord,     //YOU
            mint1 : genesis,           //GENESIS NODE
            genesisGroupEntry : genesisGroupEntry, //your new genesis groupNode - group stats
            newSegmentEntry : newSegmentEntry,  //your pulseGroup entry for your participation in pulseGroup
            gSRlist : genesis.geo+":"+genesis.geo+".1"+gSRlist
         }

         //console.log("EXPRESS nodeFactory about to send json="+dump(node));
         res.setHeader('Content-Type', 'application/json');   
         res.end(JSON.stringify(node));
         //console.log("EXPRESS: Node connection established - now rebuild new configuration for witreguard configuration file to allow genesis to sendus stuff");

         //console.log("EXPRESS nodeFactory done");
      });


   });
});


function popMint() {
var mint=0;
   expressRedisClient.incr("mintStack", (err, newMint) => {
      if (err) {
       console.log("err="+err);
      } else {
         //debug('Generated incremental id: %s.', newId);
         mint=newMint;
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