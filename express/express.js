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
app.get('/', function (req, res) {
    console.log("fetching '/' state");
    getConfig(function (config) {
        console.log("app.get('/' callback config=" + lib_1.dump(config));
        res.end(JSON.stringify(config, null, 2));
    });
    return;
});
app.get('/state', function (req, res) {
    console.log("fetching '/state' state");
    getConfig(function (config) {
        console.log("app.get('/state' callback config=" + lib_1.dump(config));
        res.setHeader('Content-Type', 'application/json');
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.end(JSON.stringify(config, null, 2));
    });
    return;
});
//
//
//
function getConfig(callback) {
    console.log("getConfig() ");
    expressRedisClient.hgetall("mint:0", function (err, me) {
        expressRedisClient.hgetall("gSRlist", function (err, gSRlist) {
            //console.log("gSRlist="+dump(gSRlist));
            fetchConfig(gSRlist, null, function (config) {
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
    if (typeof config == "undefined" || config == null) {
        console.log(lib_1.ts() + "fetchConfig(): STARTING ECHO: gSRlist=" + lib_1.dump(gSRlist) + " config=" + lib_1.dump(config) + " ");
        config = {
            gSRlist: gSRlist,
            mintTable: {},
            pulses: {},
            entryStack: new Array()
        };
        for (var index in gSRlist) {
            //console.log("pushing "+index);
            config.entryStack.push({ entryLabel: index, mint: gSRlist[index] });
        }
        //onsole.log("entryStack="+dump(config.entryStack));
    }
    //Whether first call or susequent, pop entries until pop fails
    var entry = config.entryStack.pop();
    //console.log("EXPRESS() popped entry="+dump(entry));
    if (entry) {
        var mint = entry.mint;
        var entryLabel = entry.entryLabel;
        expressRedisClient.hgetall("mint:" + mint, function (err, mintEntry) {
            if (err)
                console.log("ERROR: mintEntry=" + mintEntry);
            if (mintEntry)
                config.mintTable["mint:" + mint] = mintEntry; //set the pulseEntries
            //console.log("EXPRESS() mint="+mint+" mintEntry="+dump(mintEntry)+" config="+dump(config)+" entryLabel="+entryLabel);
            //                       MAZORE:DEVOPS.1
            expressRedisClient.hgetall(entryLabel, function (err, pulseEntry) {
                config.pulses[entryLabel] = pulseEntry; //set the corresponding mintTable
                //console.log("EXPRESS() RECURSING entryLabel="+entryLabel+" pulseEntry="+dump(pulseEntry)+" config="+dump(config));
                fetchConfig(gSRlist, config, callback); //recurse until we hit bottom
            });
        });
    }
    else {
        delete config.entryStack;
        callback(config); //send the config atructure back
    }
}
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
            var genesisGroupEntry = {
                "geo": geo,
                "group": geo + ".1",
                "seq": "0",
                "pulseTimestamp": "" + lib_1.now(),
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
                "pktDrops": "0" //as detected by missed seq#
                //"remoteState": "0"   //and there are mints : owls for received pulses 
            };
            var genesisGroupLabel = geo + ":" + geo + ".1";
            expressRedisClient.hmset(genesisGroupLabel, genesisGroupEntry);
            expressRedisClient.hmset("gSRlist", (_a = {},
                _a[genesisGroupLabel] = "1",
                _a));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ "node": "GENESIS" }));
            getConfig(function (err, config) {
                console.log("Genesis config=" + JSON.stringify(config, null, 2));
            });
            console.log("* * * * * * * * * * * * * * GENESIS CONFIGURATION COMPLETE * * * * * * * * * * *");
            return;
        }
        /* ---------------------NON-GENESIS NODE - this config is sent to remote node ------------*/
        // Genesis Node as mint:1
        expressRedisClient.hgetall("mint:1", function (err, genesis) {
            console.log("--------------- EXPRESS() Non-GENESIS CONFIGURATION  ------------------");
            var genesisGroupLabel = genesis.geo + ":" + genesis.group;
            expressRedisClient.hgetall(genesisGroupLabel, function (err, genesisGroup) {
                console.log(lib_1.ts() + "genesis.owls=" + genesisGroup.owls);
                expressRedisClient.hmset(genesisGroupLabel, "owls", genesisGroup.owls + "," + newMint + "=" + OWL);
                console.log("working on NON-GENESIS Config");
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
                /*** **/
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
                /*(******/
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
                expressRedisClient.hmset("mint:" + newMint, newMintRecord);
                //expressRedisClient.hmset("mint:"+newMint,newMintRecord);
                // Now for a record of this newNode in the Genesis group
                //get group owner (genesis group) OWLS
                //mintList(expressRedisClient, genesis.group, function(err,owls){
                //expressRedisClient.hgetall(genesisGroupLabel, function(err,genesisGroup))   
                //var genesisGroup=genesis.geo+":"+genesis.group;
                var newOwlList = genesisGroup.owls + "," + newMint + "=" + OWL;
                console.log(lib_1.ts() + "Genesis.group=" + lib_1.dump(genesisGroup) + " newOwlList=" + newOwlList);
                expressRedisClient.hset(genesisGroupLabel, "owls", newOwlList, function (err, reply) {
                    var justMints = lib_1.getMints(genesisGroup);
                    console.log(lib_1.ts() + "err=" + err + " justMints=" + justMints + " genesisGroup=" + lib_1.dump(genesisGroup));
                    var genesisGroupEntry = {
                        "geo": genesis.geo,
                        "group": genesis.group,
                        "seq": "0",
                        "pulseTimestamp": "0",
                        "srcMint": "1",
                        // =
                        "owls": newOwlList,
                        //"owls" : getOWLs(me.group),  //owls other guy is reporting
                        //node statistics - we measure these ourselves
                        "owl": "" + OWL,
                        "inOctets": "0",
                        "outOctets": "0",
                        "inMsgs": "0",
                        "outMsgs": "0",
                        "pktDrops": "0" //as detected by missed seq#
                        //"remoteState": "0"   //and there are mints : owls for received pulses 
                    };
                    console.log(lib_1.ts() + "EXPRESS: non-genesis config genesisGroupEntry.owls=" + genesisGroupEntry.owls);
                    var newSegmentEntry = {
                        "geo": geo,
                        "group": genesis.group,
                        "seq": "0",
                        "pulseTimestamp": "0",
                        "srcMint": "" + newMint,
                        // =
                        "owls": justMints,
                        //"owls" : getOWLs(me.group),  //owls other guy is reporting
                        //node statistics - we measure these ourselves
                        //"owl": ""+OWL,   //how long it took this node's last record to reach me
                        "inOctets": "0",
                        "outOctets": "0",
                        "inMsgs": "0",
                        "outMsgs": "0",
                        "pktDrops": "0" //as detected by missed seq#
                        //"remoteState": "0"   //and there are mints : owls for received pulses 
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
                        getConfig(function (config) {
                            //console.log("EXPRESS nodeFactory about to send json="+dump(node));
                            config.mintTable["mint:0"] = mint0; //tell remote their config
                            console.log("EXPRESS(): sending new node its config=" + lib_1.dump(config));
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify(config));
                            //console.log("EXPRESS: Node connection established - now rebuild new configuration for witreguard configuration file to allow genesis to sendus stuff");
                            console.log("EXPRESS nodeFactory done");
                        });
                        console.log("EXPRESS(): Non-Genesis config: newMintRecord=" + lib_1.dump(newMintRecord) + " mint0=" + lib_1.dump(mint0) + " mint1=" + lib_1.dump(mint1) + " genesisGroupEntry=" + lib_1.dump(genesisGroupEntry) + " newSegmentEntry=" + lib_1.dump(newSegmentEntry));
                    });
                });
            });
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
