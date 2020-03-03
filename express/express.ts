//
// express.ts - code to handle config route
//

const expressRedis = require('redis');
var expressRedisClient = expressRedis.createClient(); //creates a new client

var express = require('express');
var app = express();

app.get('/', function (req, res) {
   res.send('Hello World');
})

app.get('/config', function (req, res) {
   res.send('config goes here');
})

expressRedisClient.hget("me","port",function (err,port){
//console.log("express(): err="+err+" port="+port);
if (!port) port=65013;
var server = app.listen(port,'0.0.0.0', function () {
   var host = server.address().address
   var port = server.address().port
   
   console.log("Example app listening at http://%s:%s", host, port)
})

});