//
// express.ts - code to handle config route
//
var expressRedis = require('redis');
var expressRedisClient = expressRedis.createClient(); //creates a new client
var express = require('express');
var app = express();
app.get('/', function (req, res) {
    res.send('Hello World');
});
app.get('/config', function (req, res) {
    res.send('config goes here');
    console.log("geo=" + req.query.geo + " publickey=" + req.query.publickey + " query=" + JSON.stringify(req.query, null, 2) + " port=" + req.query.port + " wallet=" + req.query.wallet);
    var geo = req.query.geo;
    var publickey = req.query.publickey;
    var port = req.query.port || 65013;
    var wallet = req.query.wallet || "";
    // store incoming public key, ipaddr, port, geo, etc.
    var incomingIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if ((typeof geo == "undefined") ||
        (typeof publickey == "undefined"))
        res.end("express.js : missing geo and/or publickey ");
    // send hmset me command
    else {
        var record = {
            "ipaddr": incomingIP
        };
        console.log("returning record=" + JSON.stringify(record, null, 2));
        res.end(JSON.stringify(record, null, 2));
    }
});
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
