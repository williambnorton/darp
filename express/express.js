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
//
//
app.get('/pause', function (req, res) {
    console.log("Flipping PAUSE state - ");
    expressRedisClient.hget("mint:0", "state", function (err, state) {
        switch (state) {
            case "PAUSE":
                expressRedisClient.hmset("mint:0", {
                    state: "RUNNING"
                });
                break;
            case "RUNNING":
                expressRedisClient.hmset("mint:0", {
                    state: "PAUSE"
                });
                console.log(lib_1.ts() + "PAUSE");
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
    expressRedisClient.hgetall("mint:0", function (err, mint0) {
        expressRedisClient.hgetall("mint:1", function (err, mint1) {
            expressRedisClient.hgetall("mint:2", function (err, mint2) {
                expressRedisClient.hgetall("mint:3", function (err, mint3) {
                    expressRedisClient.hgetall(mint1.geo + ":" + mint1.group, function (err, genesisGroupEntry) {
                        expressRedisClient.hgetall(mint0.geo + ":" + mint1.group, function (err, mint1entry) {
                            //expressRedisClient.hgetall(mint2.geo+":"+mint1.group, function (err,mint2entry){     
                            //expressRedisClient.hgetall(mint3.geo+":"+mint1.group, function (err,mint3entry){     
                            var instrumentation = {
                                genesis: {
                                    mint: mint1,
                                    genesisGroup: genesisGroupEntry
                                },
                                me: {
                                    mint: mint0,
                                    entry: mint1entry
                                },
                                gSRlist: {}
                            };
                            //Scan for all groups
                            var cursor = "0";
                            expressRedisClient.scan(cursor, 'MATCH', "*:" + mint1.group, 'COUNT', '100', function (err, pulseGroupNodes) {
                                if (err) {
                                    throw err;
                                }
                                pulseGroupNodes = pulseGroupNodes[1];
                                console.log("pulser(): myPulseGroups=" + lib_1.dump(pulseGroupNodes));
                                instrumentation.gSRlist = pulseGroupNodes;
                                pulseGroupNodes.forEach(function (key, i) {
                                    console.log("key=" + key + " i=" + i);
                                });
                                for (var node in pulseGroupNodes) {
                                    expressRedisClient.hgetall(pulseGroupNodes[node], function (err, pulseGroup) {
                                        var entry = pulseGroupNodes[node];
                                        //instrumentation.gSRlist[pulseGroupNodes[node]]=pulseGroup;
                                        console.log("EXPRESS pulseGroup=" + lib_1.dump(pulseGroup));
                                    });
                                }
                                res.end(JSON.stringify(instrumentation, null, 2));
                            });
                            //});
                            //});
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
        var _a;
        if (newMint == 1) { //I AM GENESIS NODE - set my records
            console.log("* * * * * * * I AM GENESIS NODE * * * * * *");
            var mint0 = {
                "mint": "1",
                "geo": geo,
                "group": geo + ".1",
                // wireguard configuration details
                "port": "" + port,
                "ipaddr": incomingIP,
                "publickey": publickey,
                //
                "state": "RUNNING",
                "bootTime": "" + lib_1.now(),
                "version": version,
                "wallet": wallet,
                "owl": "0" //
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
            console.log("entryLabel=" + entryLabel);
            expressRedisClient.hmset(entryLabel, newSegmentEntry);
            expressRedisClient.hmset("gSRlist", (_a = {},
                _a[entryLabel] = "1",
                _a));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ "node": "GENESIS" }));
            console.log("* * * * * * * * * * * * * * GENESIS CONFIGURATION COMPLETE * * * * * * * * * * *");
            return;
        }
        /* ---------------------NON-GENESIS NODE - this config is sent to remote node ------------*/
        // Genesis Node as mint:1
        expressRedisClient.hgetall("mint:1", function (err, genesis) {
            console.log("--------------- EXPRESS() Non-GENESIS CONFIGURATION  ------------------");
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
                "state": "UP",
                "bootTime": "" + lib_1.now(),
                "version": version,
                "wallet": wallet,
                "owl": "" + OWL //we will get measures from genesis node
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
                "state": "RUNNING",
                "bootTime": "" + lib_1.now(),
                "version": genesis.version,
                "wallet": genesis.wallet,
                "owl": "" + OWL //we will get measures from genesis node
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
                "state": "RUNNING",
                "bootTime": "" + lib_1.now(),
                "version": version,
                "wallet": wallet,
                "owl": "0" //do not measure OWL to self - maybe delete this field to catch err?
            };
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
                    "owls": "1=" + OWL + "," + newMint,
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
                expressRedisClient.hmset(geo + ":" + genesis.group, newSegmentEntry);
                lib_1.SRList(expressRedisClient, function (err, mygSRlist, myOwlList) {
                    var _a;
                    console.log("EXPRESS: ********** SRList callback - mygSRlist=" + mygSRlist + " myOwlList=" + myOwlList) + " newMint=" + newMint + " geo=" + geo + " genesis.group=" + genesis.group;
                    //we now have updated gSRlist and updated owls   
                    var entryLabel = "" + geo + ":" + genesis.group;
                    expressRedisClient.hmset("gSRlist", (_a = {},
                        _a[entryLabel] = "" + newMint,
                        _a)); //add node:grp to gSRlist
                    // install owls into genesisGroup
                    console.log("EXPRESS(): Non-Genesis config: newMintRecord=" + lib_1.dump(newMintRecord) + " mint0=" + lib_1.dump(mint0) + " mint1=" + lib_1.dump(mint1) + " genesisGroupEntry=" + lib_1.dump(genesisGroupEntry) + " newSegmentEntry=" + lib_1.dump(newSegmentEntry));
                    //var gSRlist="";
                    //expressRedisClient.hscan( "gSRlist", 0, "MATCH", "*:"+genesis.group, function( err, mygSRlist, myowls){
                    //   gSRlist=mygSRlist;
                    //   var gSRlistOwls=myowls
                    //   console.log("EXPRESS: mygSRlist="+mygSRlist);
                    //})
                    //expressRedisClient.hmset( "gSRlist", genesis.geo+":"+genesis.group, "1" );
                    expressRedisClient.hgetall("gSRlist", function (err, gSRlist) {
                        var config = {
                            gSRlist: gSRlist,
                            mintTable: [],
                            pulses: []
                            // pulses : pulseTable
                            /*
                                                 mint0 : mint0,     //YOU
                                                 mint1 : mint1,           //GENESIS NODE
                                                 newNodeMint : newMintRecord,
                                                 genesisGroupEntry : genesisGroupEntry, //your new genesis groupNode - group stats
                                                 newSegmentEntry : newSegmentEntry  //your pulseGroup entry for your participation in pulseGroup
                            */
                        };
                        console.log("gSRlist=" + lib_1.dump(gSRlist));
                        //find the last index
                        var lastIndex = "";
                        for (var index in gSRlist)
                            lastIndex = index; //get last index
                        console.log("************************************** lastIndex=" + lastIndex);
                        for (var index in gSRlist) {
                            var entryLabel = index;
                            var mint = gSRlist[index];
                            console.log("EXPRESS(): mint=" + mint + " entryLabel=" + entryLabel);
                            //                              "1"    
                            expressRedisClient.hgetall("mint:" + mint, function (err, mintEntry) {
                                config.mintTable[mint] = mintEntry; //set the pulseEntries
                                console.log("EXPRESS() mint=" + mint + " mintEntry=" + lib_1.dump(mintEntry) + " mintTable=" + lib_1.dump(config));
                                //             MAZORE:DEVOPS.1
                                expressRedisClient.hgetall(entryLabel, function (err, pulseEntry) {
                                    console.log("EXPRESS() pulseEntry=" + lib_1.dump(pulseEntry));
                                    config.pulses[pulseEntry.geo + ":" + pulseEntry.group] = pulseEntry; //set the corresponding mintTable
                                    //config.pulses is done
                                    if (entryLabel == lastIndex) {
                                        console.log("entryLabel=" + entryLabel + " lastIndex=" + lastIndex + " **************************************** config=" + lib_1.dump(config));
                                        console.log("WOULD SET CONFIG HERE");
                                    }
                                });
                            });
                        }
                        //console.log("EXPRESS nodeFactory about to send json="+dump(node));
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify(config));
                        //console.log("EXPRESS: Node connection established - now rebuild new configuration for witreguard configuration file to allow genesis to sendus stuff");
                        console.log("EXPRESS nodeFactory done");
                    });
                });
            }); //mintList
        });
    });
});
function getMintTable(mint, callback) {
    expressRedisClient.hgetall("mint:" + mint, function (err, mintEntry) {
        callback(err, mintEntry);
    });
}
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
