"use strict";
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
exports.__esModule = true;
var lib_1 = require("../lib/lib");
var expressRedis = require('redis');
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
    expressRedisClient.hgetall("mint:0", function (err, me) {
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
    expressRedisClient.hgetall("mint:0", function (err, me) {
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
    console.log('****EXPRESS; config requested with params: ' + lib_1.dump(req.query));
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
    var clientIncomingIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    //console.log("req="+dump(req));
    var version = req.query.version;
    console.log("EXPRESS /nodefactory clientIncomingIP=" + clientIncomingIP + " geo=" + geo + " publickey=" + publickey + " port=" + port + " wallet=" + wallet + " incomingIP=" + incomingIP + " version=" + version);
    //console.log("req="+dump(req.connection));
    //
    //    Admission control goies here - test wallet, stop accepting nodeFactory requests
    //
    expressRedisClient.incr("mintStack", function (err, newMint) {
        if (newMint == 1) { //I AM GENESIS NODE - set my records
            console.log("* * * * * * * I AM GENESIS NODE * * * * * *");
            var mint0 = {
                "mint": "0",
                "geo": geo,
                // wireguard configuration details
                "port": "" + port,
                "ipaddr": clientIncomingIP,
                "publickey": publickey,
                //
                "bootTime": "" + lib_1.now(),
                //genesis connection info
                //"genesisGeo" : geo,
                //"genesisIP" : clientIncomingIP,
                //"genesisPort" : port,
                //"genesisPublickey" : publickey,
                "version": version,
                "wallet": wallet,
                "owl": "" + OWL //how long it took this node's last record to reach me
            };
            expressRedisClient.hmset("mint:0", mint0);
            mint0.mint = "1";
            expressRedisClient.hmset("mint:1", mint0);
        }
        else {
            // CONFIG for NON-GENESIS NODE
            var newMintRecord = {};
            expressRedisClient.hgetall("mint:1", function (err, me) {
                // Create the config that the new node will adopt
                var newMintRecord = {
                    "mint": "" + newMint,
                    "geo": geo,
                    // wireguard configuration details
                    "port": "" + port,
                    "ipaddr": clientIncomingIP,
                    "publickey": publickey,
                    //
                    "bootTime": "" + lib_1.now(),
                    //genesis connection info
                    //"genesisGeo" : me.genesisGeo,
                    //"genesisIP" : me.genesisIP,
                    //"genesisPort" : me.genesisPort,
                    //"genesisPublickey" : me.genesisPublickey,
                    "version": version,
                    "wallet": wallet,
                    "owl": "" + OWL //how long it took this node's last record to reach me
                };
                expressRedisClient.hmset("mint:" + newMint, newMintRecord);
                //hscan for all members of this genesis group
                //   for each pulsegroup member
                //      add to mint table to send
                //      push recent owl onto mintsStack
                //    ship
                var newSegmentRecord = {
                    "seq": "0",
                    "pulseTimestamp": "0",
                    "srcMint": "" + newMint,
                    "geo": geo,
                    "group": me.group,
                    // =
                    "owls": "" + newMint + "=" + OWL,
                    //"owls" : getOWLs(me.group),  //owls other guy is reporting
                    //node statistics - we measure these ourselves
                    "owl": "" + OWL,
                    "inOctets": "0",
                    "outOctets": "0",
                    "inMsgs": "0",
                    "outMsgs": "0",
                    "pktDrops": "0",
                    "remoteState": "0" //and there are mints : owls for received pulses 
                };
                var nodeConfig = {
                    me: newMintRecord,
                    gSRlist: "DEVOPS:DEVOP.1",
                    //mint0 : mint0,  //this is the new nodes 'me'
                    //mint1 : mint1,
                    "DEVOPS:DEVOPS.1": newSegmentRecord
                };
                console.log("EXPRESS nodeFactory about to send json=" + lib_1.dump(nodeConfig));
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(nodeConfig));
                //console.log("EXPRESS: Node connection established - now rebuild new configuration for witreguard configuration file to allow genesis to sendus stuff");
                console.log("EXPRESS nodeFactory done");
                //console.log("-----");
            });
        }
    });
});
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
