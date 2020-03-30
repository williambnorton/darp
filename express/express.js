"use strict";
exports.__esModule = true;
//
// express.ts - set up the "me" and connect to the network by getting config from the genesis node
//
var lib_1 = require("../lib/lib");
//import { listenerCount } from 'cluster';
var expressRedis = require('redis');
var expressRedisClient = expressRedis.createClient(); //creates a new client
var express = require('express');
var app = express();
app.get('/me', function (req, res) {
    //res.send('express root dir');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    expressRedisClient.hgetall("me", function (err, me) {
        res.end(JSON.stringify(me, null, 3));
    });
    return;
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
    expressRedisClient.hgetall("me", function (err, me) {
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
    //console.log('****EXPRESS; config requested with params: '+dump(req.query));
    //console.log("EXPRESS geo="+req.query.geo+" publickey="+req.query.publickey+" query="+JSON.stringify(req.query,null,2)+" port="+req.query.port+" wallet="+req.query.wallet+" version="+req.query.version);
    var geo = req.query.geo;
    var publickey = req.query.publickey;
    var port = req.query.port || 65013;
    var wallet = req.query.wallet || "";
    var incomingTimestamp = req.query.ts || lib_1.now();
    var OWL = Math.round(lib_1.now() - incomingTimestamp);
    // store incoming public key, ipaddr, port, geo, etc.
    //   var incomingIP=req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    //   var incomingIP=req.connection.remoteAddress;
    var incomingIP = req.query.myip; /// for now we believe the node's IP
    //console.log("req="+dump(req));
    var version = req.query.version;
    console.log("EXPRESS /nodefactory geo=" + geo + " publickey=" + publickey + " port=" + port + " wallet=" + wallet + " incomingIP=" + incomingIP + " version=" + version);
    //console.log("req="+dump(req.connection));
    //
    //    Admission control goies here - test wallet, stop accepting nodeFactory requests
    //
    if ((typeof geo == "undefined") ||
        (typeof publickey == "undefined"))
        res.end("express.js : missing geo and/or publickey ");
    // send hmset me command
    else {
        expressRedisClient.incr("mintStack", function (err, newMint) {
            if (err) {
                console.log("mintStack allocation err=" + err);
            }
            else {
                var node = {
                    me: {},
                    mintTable: {},
                    gSRlist: {}
                };
                //generate the me config records that the new node will adopt
                expressRedisClient.hgetall("me", function (err, me) {
                    if (err) {
                        console.log("Cant find Genesis node in redis - maybe I am Genesis Node?");
                    }
                    //console.log("******** EXPRESS redis me="+dump(me));
                    //console.log("nodeEntry="+JSON.stringify())
                    // I am Genesis node
                    if (newMint == 1) {
                        console.log("* * * * * * * I AM GENESIS NODE * * * * * *");
                        me.genesisGeo = geo;
                        //me.genesisPort
                        incomingIP = me.genesisIP;
                        port = me.genesisPort;
                        publickey = me.genesisPublickey || publickey;
                    }
                    console.log("incomingIP=" + incomingIP + " port=" + port + " publickey=" + publickey);
                    node.me = {
                        "geo": geo,
                        "group": me.group,
                        "port": "" + port,
                        "ipaddr": incomingIP,
                        "publickey": publickey,
                        "mint": "" + newMint,
                        "bootTime": "" + lib_1.now(),
                        //"pulseGroups" : me.group,  //list of groups I will pulse - now derivd from gSRlist
                        //genesis connection info
                        "genesisGeo": me.genesisGeo,
                        "genesisIP": me.genesisIP,
                        "genesisPort": me.genesisPort,
                        "genesisPublickey": me.genesisPublickey || publickey,
                        "version": version,
                        "wallet": wallet,
                        //statistics
                        "lastSeq": "0",
                        "pulseTimestamp": "" + lib_1.now(),
                        "inOctets": "0",
                        "outOctets": "0",
                        "inMsgs": "0",
                        "outMsgs": "0",
                        "owl": "" + OWL,
                        "pktDrops": "0",
                        "remoteState": "0" //and there are mints : owls for received pulses 
                    };
                    var nodeEntry = geo + ":" + me.group;
                    var mintEntry = "mint:" + newMint;
                    node.mintTable = {
                        mintEntry: node.me
                    };
                    node.gSRlist = {
                        nodeEntry: "owls=1,2,3,4,5,6,7,8,9"
                    };
                    //console.log("EXPRESS nodeFactory about to send json="+dump(json));
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(node));
                    //console.log("EXPRESS: Node connection established - now rebuild new configuration for witreguard configuration file to allow genesis to sendus stuff");
                    console.log("EXPRESS nodeFactory done");
                    //console.log("-----");
                });
            }
            ;
        });
    }
});
/*
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
            // I am Genesis node
            if (newMint==1) {
               console.log("* * * * * * * I AM GENESIS NODE * * * * * * ")
               incomingIP=me.genesisIP;
               port=me.genesisPort;
               publickey=me.genesisPublickey||publickey;
            }
            console.log("incomingIP="+incomingIP+" port="+port+" publickey="+publickey);

            var newMintRecord={
                  "geo" : geo,
                  "group": me.group,      //add all nodes to genesis group
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
                  "version" : version,
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
            //expressRedisClient.hmset(nodeEntry, newNode);
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
                  //console.log("EXPRESS nodeFactory about to send json="+dump(json));
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(json));
                  //console.log("EXPRESS: Node connection established - now rebuild new configuration for witreguard configuration file to allow genesis to sendus stuff");

                  console.log("EXPRESS nodeFactory done");
                  //console.log("-----");
               }
            });
            
         });
      });
   });
});

}
})
*/
function popMint() {
    var mint = 0;
    expressRedisClient.incr("mintStack", function (err, newMint) {
        if (err) {
            console.log("err=" + err);
        }
        else {
            //debug('Generated incremental id: %s.', newId);
            mint = newMint;
            ;
        }
    });
}
//
// bind the TCP port for externalizing 
//
expressRedisClient.hget("me", "port", function (err, port) {
    if (!port)
        port = 65013;
    var server = app.listen(port, '0.0.0.0', function () {
        var host = server.address().address;
        var port = server.address().port;
        console.log("Express app listening at http://%s:%s", host, port);
    });
});
