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
    //onsole.log('****EXPRESS; config requested with params: '+dump(req.query));
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
    //console.log("EXPRESS /nodefactory clientIncomingIP="+clientIncomingIP+" geo="+geo+" publickey="+publickey+" port="+port+" wallet="+wallet+" incomingIP="+incomingIP+" version="+version);
    //console.log("req="+dump(req.connection));
    //
    //    Admission control goies here - test wallet, stop accepting nodeFactory requests
    //
    /********** GENESIS NODE **********/
    expressRedisClient.incr("mintStack", function (err, newMint) {
        if (newMint == 1) { //I AM GENESIS NODE - set my records
            console.log("* * * * * * * I AM GENESIS NODE * * * * * *");
            var mint0 = {
                "mint": "0",
                "geo": geo,
                "group": geo + ".1",
                // wireguard configuration details
                "port": "" + port,
                "ipaddr": incomingIP,
                "publickey": publickey,
                //
                "bootTime": "" + lib_1.now(),
                "version": version,
                "wallet": wallet
            };
            expressRedisClient.hmset("mint:0", mint0);
            mint0.mint = "1";
            expressRedisClient.hmset("mint:1", mint0);
            var newSegmentEntry = {
                "geo": geo,
                "group": geo + ".1",
                "seq": "0",
                "pulseTimestamp": "0",
                "srcMint": "1",
                // =
                "owls": "1",
                //"owls" : getOWLs(me.group),  //owls other guy is reporting
                //node statistics - we measure these ourselves
                //"owl": ""+OWL,   //how long it took this node's last record to reach me
                "inOctets": "0",
                "outOctets": "0",
                "inMsgs": "0",
                "outMsgs": "0",
                "pktDrops": "0",
                "remoteState": "0" //and there are mints : owls for received pulses 
            };
            var entryLabel = geo + ":" + geo + ".1";
            expressRedisClient.hmset(entryLabel, newSegmentEntry);
            expressRedisClient.hmset("gSRlist", entryLabel, "1");
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ "node": "GENESIS" }));
            console.log("* * * * * * * * * * * * * * GENESIS CONFIGURATION COMPLETE * * * * * * * * * * *");
            return;
        }
        /* ---------------------NON-GENESIS NODE - this config is sent to remote node ------------*/
        // Genesis Node as mint:1
        expressRedisClient.hgetall("mint:1", function (err, genesis) {
            console.log("--------------- Non-GENESIS CONFIGURATION COMPLETE ------------------");
            expressRedisClient.hmset("mint:1", "owls", genesis.owls + "," + newMint + "=" + OWL);
            console.log("working on genesis.geo");
            // Use the genesis node info to create the config
            var mint0 = {
                "mint": "" + newMint,
                "geo": geo,
                "group": genesis.group,
                // wireguard configuration details
                "port": "" + port,
                "ipaddr": incomingIP,
                "publickey": publickey,
                //
                "bootTime": "" + lib_1.now(),
                "version": version,
                "wallet": wallet
            };
            var mint1 = {
                "mint": "1",
                "geo": genesis.geo,
                "group": genesis.group,
                // wireguard configuration details
                "port": "" + genesis.port,
                "ipaddr": genesis.ipaddr,
                "publickey": genesis.publickey,
                //
                "bootTime": "" + lib_1.now(),
                "version": genesis.version,
                "wallet": genesis.wallet
            };
            var newMintRecord = {
                "mint": "" + newMint,
                "geo": geo,
                "group": genesis.group,
                // wireguard configuration details
                "port": "" + port,
                "ipaddr": incomingIP,
                "publickey": publickey,
                //
                "bootTime": "" + lib_1.now(),
                "version": version,
                "wallet": wallet
            };
            console.log("newMintRecord=" + lib_1.dump(newMintRecord) + " mint0=" + lib_1.dump(mint0) + " mint1=" + lib_1.dump(mint1));
            //expressRedisClient.hmset("mint:"+newMint,newMintRecord);
            // Now for a record of this newNode in the Genesis group
            //get group owner (genesis group) OWLS
            lib_1.mintList(expressRedisClient, genesis.group, function (err, owls) {
                var genesisGroupEntry = {
                    "geo": genesis.geo,
                    "group": genesis.group,
                    "seq": "0",
                    "pulseTimestamp": "0",
                    "srcMint": "1",
                    // =
                    "owls": owls + "," + newMint + "=" + OWL,
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
                var newSegmentEntry = {
                    "geo": geo,
                    "group": genesis.group,
                    "seq": "0",
                    "pulseTimestamp": "0",
                    "srcMint": "" + newMint,
                    // =
                    "owls": "",
                    //"owls" : getOWLs(me.group),  //owls other guy is reporting
                    //node statistics - we measure these ourselves
                    //"owl": ""+OWL,   //how long it took this node's last record to reach me
                    "inOctets": "0",
                    "outOctets": "0",
                    "inMsgs": "0",
                    "outMsgs": "0",
                    "pktDrops": "0",
                    "remoteState": "0" //and there are mints : owls for received pulses 
                };
                lib_1.SRList(expressRedisClient, function (err, mygSRlist, myOwlList) {
                    console.log("EXPRESS: ********** SRList callback - mygSRlist=" + mygSRlist + " myOwlList=" + myOwlList);
                    expressRedisClient.hmset("gSRlist", geo + ":" + genesis.group, "" + newMint);
                    var gSRlist = "";
                    expressRedisClient.hscan("gSRlist", 0, "MATCH", "*:" + genesis.group, function (err, mygSRlist, myowls) {
                        gSRlist = mygSRlist;
                        var gSRlistOwls = myowls;
                        console.log("EXPRESS: gSRlist=" + gSRlist + " gSRlistOwls=" + gSRlistOwls);
                    });
                    //expressRedisClient.hmset( "gSRlist", genesis.geo+":"+genesis.group, "1" );
                    var node = {
                        mint0: newMintRecord,
                        mint1: genesis,
                        newNodeMint: newMintRecord,
                        genesisGroupEntry: genesisGroupEntry,
                        newSegmentEntry: newSegmentEntry,
                        gSRlist: gSRlist
                    };
                    //console.log("EXPRESS nodeFactory about to send json="+dump(node));
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(node));
                    //console.log("EXPRESS: Node connection established - now rebuild new configuration for witreguard configuration file to allow genesis to sendus stuff");
                    console.log("EXPRESS nodeFactory done");
                });
            }); //mintList
        });
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
