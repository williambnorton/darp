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

import { dump, now, mintList, SRList, ts, getMints, getOwls } from '../lib/lib';
const expressRedis = require('redis');
var expressRedisClient = expressRedis.createClient(); //creates a new client
var express = require('express');
var app = express();

//
//
//
app.get('/', function (req, res) {
   console.log("fetching '/' state");
   getConfig(function(config) {
      console.log("app.get('/' callback config="+dump(config));
      res.end(JSON.stringify(config, null, 2));
   })
   return
});

app.get('/state', function (req, res) {
   console.log("EXPRess fetching '/state' state");
   getConfig(function(config) {
      //console.log("app.get('/state' callback config="+dump(config));
      res.setHeader('Content-Type', 'application/json');
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.end(JSON.stringify(config, null, 2));
   })
   return;
});
//
//
//
function getConfig(callback) {
   console.log("getConfig() ");

   expressRedisClient.hgetall("mint:0", function(err, me) {
      expressRedisClient.hgetall("gSRlist", function(err,gSRlist) {
         //console.log("gSRlist="+dump(gSRlist));
         fetchConfig(gSRlist, null, function(config) {
            //console.log("getConfig(): callback config="+dump(config));
            callback(config); //call sender
         });
      });
   });
}

//
//
//
function fetchConfig(gSRlist, config, callback) {
   if (typeof config == "undefined" || config==null) {
      console.log(ts()+"fetchConfig(): STARTING ECHO: gSRlist="+dump(gSRlist)+" config="+dump(config)+" ");
      config={
         gSRlist : gSRlist,
         mintTable : {},
         pulses : {},
         entryStack : new Array()             
      }
      for (var index in gSRlist) {
         //console.log("pushing "+index);
         config.entryStack.push({ entryLabel:index, mint:gSRlist[index]})
      }
      //onsole.log("entryStack="+dump(config.entryStack));
   }
   //Whether first call or susequent, pop entries until pop fails
   var entry=config.entryStack.pop();
   //console.log("EXPRESS() popped entry="+dump(entry));
   if (entry) {
      var mint=entry.mint;
      var entryLabel=entry.entryLabel;
      expressRedisClient.hgetall("mint:"+mint, function (err,mintEntry) {   
         if (err) console.log("ERROR: mintEntry="+mintEntry)                     
         if (mintEntry) config.mintTable["mint:"+mint] = mintEntry;  //set the pulseEntries
         //console.log("EXPRESS() mint="+mint+" mintEntry="+dump(mintEntry)+" config="+dump(config)+" entryLabel="+entryLabel);
         //                       MAZORE:DEVOPS.1
         expressRedisClient.hgetall(entryLabel, function (err,pulseEntry) {
            config.pulses[entryLabel] = pulseEntry;  //set the corresponding mintTable
            //console.log("EXPRESS() RECURSING entryLabel="+entryLabel+" pulseEntry="+dump(pulseEntry)+" config="+dump(config));
            fetchConfig(gSRlist,config,callback);  //recurse until we hit bottom
         });
      });
   } else {
      delete config.entryStack;
      callback(config);  //send the config atructure back
   }
}




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
//
//
app.get('/pause', function (req, res) {
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
            "state" : "RUNNING",
            "bootTime" : ""+now(),   //So we can detect reboots
            "version" : version,  //software version
            "wallet" : wallet,
            "owl": ""   //
         }
         expressRedisClient.hmset("mint:0",mint0); 
         mint0.mint="1";
         expressRedisClient.hmset("mint:1",mint0);
         var genesisGroupEntry={  //one record per pulse - index = <geo>:<group>
            "geo" : geo,            //record index (key) is <geo>:<genesisGroup>
            "group": geo+".1",      //DEVPOS:DEVOP.1 for genesis node start
            "seq" : "0",         //last sequence number heard
            "pulseTimestamp": ""+now(), //last pulseTimestamp received from this node
            "srcMint" : "1",      //Genesis node would send this 
            // =
            "owls" : "1",        //Startup - I am the only one here
            //"owls" : getOWLs(me.group),  //owls other guy is reporting
            //node statistics - we measure these ourselves
            //"owl": ""+OWL,   //how long it took this node's last record to reach me
            "inOctets": "0",
            "outOctets": "0",
            "inMsgs": "0",
            "outMsgs": "0",
            "pktDrops": "0"     //as detected by missed seq#
            //"remoteState": "0"   //and there are mints : owls for received pulses 
         };
         var genesisGroupLabel=geo+":"+geo+".1";
         expressRedisClient.hmset(genesisGroupLabel, genesisGroupEntry); 
         expressRedisClient.hmset("gSRlist", {
            [genesisGroupLabel] : "1"
         }); 
         res.setHeader('Content-Type', 'application/json');   
         res.end(JSON.stringify( { "node" : "GENESIS" } ));

         getConfig(function(err,config) {
            console.log("Genesis config="+JSON.stringify(config, null, 2));
         })
         console.log("* * * * * * * * * * * * * * GENESIS CONFIGURATION COMPLETE * * * * * * * * * * *");

         return;
      } 


      /* ---------------------NON-GENESIS NODE - this config is sent to remote node ------------*/
      // Genesis Node as mint:1
      expressRedisClient.hgetall("mint:1", function (err,genesis) {  //get GENESIS mint entry
         console.log("--------------- EXPRESS() Non-GENESIS CONFIGURATION  ------------------");
         var genesisGroupLabel=genesis.geo+":"+genesis.group;
         expressRedisClient.hgetall(genesisGroupLabel, function (err,genesisGroup) {  //get 

            console.log(ts()+"genesis.owls="+genesisGroup.owls);
            expressRedisClient.hmset(genesisGroupLabel, "owls", genesisGroup.owls+","+newMint+"="+OWL); 
            console.log("working on NON-GENESIS Config");

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
            "state" : "UP",
            "bootTime" : ""+now(),   //So we can detect reboots
            "version" : version,  //software version
            "wallet" : wallet,
            "owl" : ""          //we will get measures from genesis node
            }
            /*** **/
            var mint1={          //mine:1 is GENESIS NODE
            "mint" : "1",      //overwrite initial mint0 record - we are genesis
            "geo" : genesis.geo,
            "group" : genesis.group,  //assigning nodes in this group now
            // wireguard configuration details
            "port" : ""+genesis.port,
            "ipaddr" : genesis.ipaddr,   //set by genesis node on connection
            "publickey" : genesis.publickey,
            //
            "state" : "RUNNING",
            "bootTime" : ""+now(),   //So we can detect reboots
            "version" : genesis.version,  //software version
            "wallet" : genesis.wallet,
            "owl" : "" //we will get measures from genesis node
            }
            /*(******/
            var newMintRecord={        //my mint entry
            "mint" : ""+newMint,      //set by genesis node
            "geo" : geo,
            "group" : genesis.group,
            // wireguard configuration details
            "port" : ""+port,
            "ipaddr" : incomingIP,   //set by genesis node on connection
            "publickey" : publickey,
            //
            "state" : "RUNNING",
            "bootTime" : ""+now(),   //So we can detect reboots
            "version" : version,  //software version
            "wallet" : wallet,
            "owl" : ""   //do not measure OWL to self - maybe delete this field to catch err?
            };

            expressRedisClient.hmset("mint:"+newMint,newMintRecord);
            //expressRedisClient.hmset("mint:"+newMint,newMintRecord);

            // Now for a record of this newNode in the Genesis group
            //get group owner (genesis group) OWLS
            //mintList(expressRedisClient, genesis.group, function(err,owls){
            //expressRedisClient.hgetall(genesisGroupLabel, function(err,genesisGroup))   
               //var genesisGroup=genesis.geo+":"+genesis.group;
               var newOwlList=genesisGroup.owls+","+newMint+"="+OWL;

               console.log(ts()+"Genesis.group="+dump(genesisGroup)+" newOwlList="+newOwlList);

               expressRedisClient.hset(genesisGroupLabel, "owls", newOwlList, function (err,reply){
                 var justMints=getMints(genesisGroup);
                 console.log(ts()+"err="+err+" justMints="+justMints+" genesisGroup="+dump(genesisGroup));

               var genesisGroupEntry={  //one record per pulse - index = <genesis.geo>:<genesis.group>
                  "geo" : genesis.geo,            //record index (key) is <geo>:<genesisGroup>
                  "group": genesis.group,      //assigning nodes in this group now
                  "seq" : "0",         //last sequence number heard
                  "pulseTimestamp": "0", //last pulseTimestamp received from this node
                  "srcMint" : "1",      //claimed mint # for this node
                 // =
                  "owls" : newOwlList,  //owls other guy is reporting
                  //"owls" : getOWLs(me.group),  //owls other guy is reporting
                  //node statistics - we measure these ourselves
                  "owl": "",   //NO OWL MEASUREMENT HERE (YET)
                     "inOctets": "0",
                     "outOctets": "0",
                     "inMsgs": "0",
                     "outMsgs": "0",
                     "pktDrops": "0"     //as detected by missed seq#
                     //"remoteState": "0"   //and there are mints : owls for received pulses 
               };

               //console.log(ts()+"EXPRESS: non-genesis config genesisGroupEntry.owls="+genesisGroupEntry.owls);
               var newSegmentEntry={  //one record per pulse - index = <geo>:<group>
                  "geo" : geo,            //record index (key) is <geo>:<genesisGroup>
                  "group": genesis.group,      //add all nodes to genesis group
                     "seq" : "0",         //last sequence number heard
                     "pulseTimestamp": "0", //last pulseTimestamp received from this node
                     "srcMint" : ""+newMint,      //claimed mint # for this node
                     // =
                     "owls" : justMints,  //owls other guy (this is ME so 0!) is reporting
                     //"owls" : getOWLs(me.group),  //owls other guy is reporting
                     //node statistics - we measure these ourselves
                     //"owl": ""+OWL,   //how long it took this node's last record to reach me
                     "inOctets": "0",
                     "outOctets": "0",
                     "inMsgs": "0",
                     "outMsgs": "0",
                     "pktDrops": "0"     //as detected by missed seq#
                     //"remoteState": "0"   //and there are mints : owls for received pulses 
               };
               //console.log(ts()+"newSegmentEntry="+dump(newSegmentEntry));
               expressRedisClient.hmset( geo+":"+genesis.group, newSegmentEntry );  

               SRList(expressRedisClient, function (err, mygSRlist, myOwlList) {
                  console.log("EXPRESS: ********** SRList callback - mygSRlist="+mygSRlist+" myOwlList="+myOwlList)+" newMint="+newMint+" geo="+geo+" genesis.group="+genesis.group;
                  //we now have updated gSRlist and updated owls   
                  var entryLabel=""+geo+":"+genesis.group;
                  expressRedisClient.hmset( "gSRlist", {
                     [ entryLabel ] : ""+newMint 
                  });  //add node:grp to gSRlist
                  // install owls into genesisGroup
                  getConfig(function(config) {
                     //console.log("EXPRESS nodeFactory about to send json="+dump(node));
                     config.mintTable["mint:0"]=mint0;   //tell remote their config
                     console.log("EXPRESS(): sending new node its config="+dump(config));
                     res.setHeader('Content-Type', 'application/json');   
                     res.end(JSON.stringify(config));
                     //console.log("EXPRESS: Node connection established - now rebuild new configuration for witreguard configuration file to allow genesis to sendus stuff");
                     console.log("EXPRESS nodeFactory done");
                  });

                  console.log("EXPRESS(): Non-Genesis config: newMintRecord="+dump(newMintRecord)+" mint0="+dump(mint0)+" mint1="+dump(mint1)+" genesisGroupEntry="+dump(genesisGroupEntry)+" newSegmentEntry="+dump(newSegmentEntry));

               });
            });   
         });
      });
   });
});

function getMintTable(mint,callback) {
   expressRedisClient.hgetall("mint:"+mint, function(err,mintEntry) {
      callback(err,mintEntry);    
   });
}

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