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

import { dump, now, mintList, SRList, ts } from '../lib/lib';
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

app.get('/pulse', function (req, res) {
   console.log("Flipping PAUSE state - ");
   expressRedisClient.hget( "mint:0", "state", function (err,state) {
      switch (state) {
         case "PAUSE": 
            expressRedisClient.hmset( "mint:0", {
               state : "RUNNING"
            });
            break;
         case "RUNNING":
            expressRedisClient.hmset( "mint:0", {
               state : "PAUSE"
            });
            console.log(ts()+"PAUSE");
            break;
         default:
            console.log("bad state in redis");
            break;
      }

   });

});
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
   expressRedisClient.hgetall("mint:0", function (err,mint0){
      expressRedisClient.hgetall("mint:1", function (err,mint1){
         expressRedisClient.hgetall("mint:2", function (err,mint2){
            expressRedisClient.hgetall("mint:3", function (err,mint3){
               expressRedisClient.hgetall(mint1.geo+":"+mint1.group, function (err,genesisGroupEntry){     
                  expressRedisClient.hgetall(mint0.geo+":"+mint1.group, function (err,mySRentry){     
                     var intrumentation={   
                        mintTable : {
                           me : mint0,
                           genesis : mint1,
                           mint2 : mint2,
                           mint3 : mint3
                        },
                        gSRlist : {
                           genesisGroup : genesisGroupEntry,
                           mySRentry : mySRentry
                        }
                     }
                     res.end(JSON.stringify(intrumentation, null, 2));
                  });
               });
            });
         });
      });
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
                  /********** GENESIS NODE **********/
   expressRedisClient.incr("mintStack", (err, newMint) => {   //me and genesis node objects
      if (newMint==1) {    //I AM GENESIS NODE - set my records
         console.log("* * * * * * * I AM GENESIS NODE * * * * * *")
         var mint0={
            "mint" : "1",      //overwrite initial mint0 record - we are genesis
            "geo" : geo,
            "group" : geo+".1",  //assigning nodes in this group now
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
         expressRedisClient.hmset("mint:1",mint0);
         var newSegmentEntry={  //one record per pulse - index = <geo>:<group>
            "geo" : geo,            //record index (key) is <geo>:<genesisGroup>
            "group": geo+".1",      //DEVPOS:DEVOP.1 for genesis node start
            "seq" : "0",         //last sequence number heard
            "pulseTimestamp": "0", //last pulseTimestamp received from this node
            "srcMint" : "1",      //Genesis node would send this 
            // =
            "owls" : "1",  //owls other guy is reporting
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
         var entryLabel=geo+":"+geo+".1";
         expressRedisClient.hmset(entryLabel, newSegmentEntry); 
         expressRedisClient.hmset("gSRlist", entryLabel, "1"); 
         res.setHeader('Content-Type', 'application/json');   
         res.end(JSON.stringify( { "node" : "GENESIS" } ));

         console.log("* * * * * * * * * * * * * * GENESIS CONFIGURATION COMPLETE * * * * * * * * * * *");

         return;
      } 


      /* ---------------------NON-GENESIS NODE - this config is sent to remote node ------------*/
      // Genesis Node as mint:1
      expressRedisClient.hgetall("mint:1", function (err,genesis) {  //get GENESIS mint entry
         console.log("--------------- EXPRESS() Non-GENESIS CONFIGURATION  ------------------");
         expressRedisClient.hmset("mint:1", "owls", genesis.owls+","+newMint+"="+OWL); 
         console.log("working on genesis.geo");

         // Use the genesis node info to create the config
         var mint0={                //mint:0 is me - who (remote Node) has as 'me'
            "mint" : ""+newMint,      //overwrite initial mint0 record - we are genesis
            "geo" : geo,
            "group" : genesis.group,  //assigning nodes in this group now
            // wireguard configuration details
            "port" : ""+port,
            "ipaddr" : incomingIP,   //set by genesis node on connection
            "publickey" : publickey,
            //
            "bootTime" : ""+now(),   //So we can detect reboots
            "version" : version,  //software version
            "wallet" : wallet,
            "owl" : ""+OWL          //we will get measures from genesis node
         }
         var mint1={          //mine:1 is GENESIS NODE
            "mint" : "1",      //overwrite initial mint0 record - we are genesis
            "geo" : genesis.geo,
            "group" : genesis.group,  //assigning nodes in this group now
            // wireguard configuration details
            "port" : ""+genesis.port,
            "ipaddr" : genesis.ipaddr,   //set by genesis node on connection
            "publickey" : genesis.publickey,
            //
            "bootTime" : ""+now(),   //So we can detect reboots
            "version" : genesis.version,  //software version
            "wallet" : genesis.wallet,
            "owl" : ""+OWL          //we will get measures from genesis node
         }
         var newMintRecord={        //my mint entry
            "mint" : ""+newMint,      //set by genesis node
            "geo" : geo,
            "group" : genesis.group,
            // wireguard configuration details
            "port" : ""+port,
            "ipaddr" : incomingIP,   //set by genesis node on connection
            "publickey" : publickey,
            //
            "bootTime" : ""+now(),   //So we can detect reboots
            "version" : version,  //software version
            "wallet" : wallet,
            "owl" : "0"   //do not measure OWL to self - maybe delete this field to catch err?
         };
         //expressRedisClient.hmset("mint:"+newMint,newMintRecord);

         // Now for a record of this newNode in the Genesis group
         //get group owner (genesis group) OWLS
         mintList(expressRedisClient, genesis.group, function(err,owls){
            
            var genesisGroupEntry={  //one record per pulse - index = <genesis.geo>:<genesis.group>
               "geo" : genesis.geo,            //record index (key) is <geo>:<genesisGroup>
               "group": genesis.group,      //assigning nodes in this group now
                  "seq" : "0",         //last sequence number heard
                  "pulseTimestamp": "0", //last pulseTimestamp received from this node
                  "srcMint" : "1",      //claimed mint # for this node
                 // =
                  "owls" : "1="+OWL+","+newMint,  //owls other guy is reporting
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

            var newSegmentEntry={  //one record per pulse - index = <geo>:<group>
               "geo" : geo,            //record index (key) is <geo>:<genesisGroup>
               "group": genesis.group,      //add all nodes to genesis group
                  "seq" : "0",         //last sequence number heard
                  "pulseTimestamp": "0", //last pulseTimestamp received from this node
                  "srcMint" : ""+newMint,      //claimed mint # for this node
                  // =
                  "owls" : "",  //owls other guy (this is ME so 0!) is reporting
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

            SRList(expressRedisClient, function (err,mygSRlist,myOwlList) {
               console.log("EXPRESS: ********** SRList callback - mygSRlist="+mygSRlist+" myOwlList="+myOwlList)+" newMint="+newMint+" geo="+geo+" genesis.group="+genesis.group;
               //we now have updated gSRlist and updated owls               
               expressRedisClient.hmset( "gSRlist", geo+":"+genesis.group, ""+newMint );  //add node:grp to gSRlist
               // install owls into genesisGroup

               console.log("EXPRESS(): Non-Genesis config: newMintRecord="+dump(newMintRecord)+" mint0="+dump(mint0)+" mint1="+dump(mint1)+" genesisGroupEntry="+dump(genesisGroupEntry)+" newSegmentEntry="+dump(newSegmentEntry));
               //var gSRlist="";
               //expressRedisClient.hscan( "gSRlist", 0, "MATCH", "*:"+genesis.group, function( err, mygSRlist, myowls){
               //   gSRlist=mygSRlist;
               //   var gSRlistOwls=myowls
               //   console.log("EXPRESS: mygSRlist="+mygSRlist);
               //})

               //expressRedisClient.hmset( "gSRlist", genesis.geo+":"+genesis.group, "1" );
               expressRedisClient.hgetall("gSRlist", function (err,gSRlist) {  //get GENESIS mint entry
                  console.log("gSRlist="+dump(gSRlist));
                  var node={
                     mint0 : mint0,     //YOU
                     mint1 : mint1,           //GENESIS NODE
                     newNodeMint : newMintRecord,
                     genesisGroupEntry : genesisGroupEntry, //your new genesis groupNode - group stats
                     newSegmentEntry : newSegmentEntry,  //your pulseGroup entry for your participation in pulseGroup
                     gSRlist : gSRlist
                  }

                  //console.log("EXPRESS nodeFactory about to send json="+dump(node));
                  res.setHeader('Content-Type', 'application/json');   
                  res.end(JSON.stringify(node));
                  //console.log("EXPRESS: Node connection established - now rebuild new configuration for witreguard configuration file to allow genesis to sendus stuff");

                  console.log("EXPRESS nodeFactory done");
               });

            });
         });   //mintList
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