"use strict";
exports.__esModule = true;
var expressRedis = require('redis');
var expressRedisClient = expressRedis.createClient(); //creates a new client
var express = require('express');
var app = express();
app.get('/', function (req, res) {
    res.send('Hello World');
});
//
// Configuration for node - allocate a mint
//
app.get('/config', function (req, res) {
    console.log('config goes here');
    console.log("geo=" + req.query.geo + " publickey=" + req.query.publickey + " query=" + JSON.stringify(req.query, null, 2) + " port=" + req.query.port + " wallet=" + req.query.wallet);
    var geo = req.query.geo;
    var publickey = req.query.publickey;
    var port = req.query.port || 65013;
    var wallet = req.query.wallet || "";
    // store incoming public key, ipaddr, port, geo, etc.
    var incomingIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log("geo=" + geo + " publickey=" + publickey + " port=" + port + " wallet=" + wallet + " incomingIP=" + incomingIP);
    if ((typeof geo == "undefined") ||
        (typeof publickey == "undefined"))
        res.end("express.js : missing geo and/or publickey ");
    // send hmset me command
    else {
        console.log("good call ");
        expressRedisClient.incr("mintStack", function (err, newMint) {
            if (err) {
                console.log("err=" + err);
            }
            else {
                var me = {
                    "geo": geo,
                    "port": port,
                    "ipaddr": incomingIP,
                    "publickey": publickey,
                    "mint": newMint,
                    "bootTime": "0",
                    "group": me.group,
                    "pulseGroups": me.group,
                    "genesis": me.genesis,
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
                expressRedisClient.hmset("me", me);
                console.log("returning record=" + JSON.stringify(me, null, 2));
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(me, null, 2));
            }
        });
    }
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
expressRedisClient.hget("me", "port", function (err, port) {
    //console.log("express(): err="+err+" port="+port);
    if (!port)
        port = 65013;
    var server = app.listen(port, '0.0.0.0', function () {
        var host = server.address().address;
        var port = server.address().port;
        console.log("Example app listening at http://%s:%s", host, port);
    });
});
