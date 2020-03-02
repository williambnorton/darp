//
//	portcheck.js - send a message with and ensure we get a response to demonstrate a working port 65013
//
//	maybe add a module to curl the codeNconfig?
//	make module that does tests the connectPort UDP config

import { now, ts ,dump } from '../lib/lib.js';

var PORT = 65013;
var HOST = '127.0.0.1';
var HOST = '104.42.192.234';  //MAZORE for now

var myArgs = process.argv.slice(2);
console.log(process.argv.length)
if (process.argv.length>2)
	HOST=process.argv[2];
if (process.argv.length>3)
	PORT=parseInt(process.argv[3]);	

console.log("Starting "+process.argv[0]);

var RUNFOREVER=1;
var dgram = require('dgram');
var message = new Buffer('OWL:MAZORE:MAZORE.1:1:2-1=23,3-1=46');
//var message = new Buffer('OWL:MAZORE:MAZORE.1:1:2-1=23,3-1=46');

//var message = new Buffer('PING');

var latencyStats={
	timeSent:now(),
	min: 5555,
	max: -1,
	measurements: [],
	avg: function () {
		var aggregate=0;
		for (var i=0; i<this.measurements.length; i++)
			aggregate+=this.measurements[i];
		return Math.round(aggregate/this.measurements.length);
	}
}

function poll() {
	var client = dgram.createSocket('udp4');
	latencyStats.timeSent=now();
	client.send(message, 0, message.length, PORT, HOST, function(err, bytes) {
		if (err) throw err;
  		console.log(ts()+'UDP message sent to ' + HOST +':'+ PORT);
  		client.close();
	});
	if (RUNFOREVER) setTimeout(poll,2000);
	else setTimeout(timeout,2000);
}

function timeout() {
	console.log("No response from "+HOST+":"+PORT );
	process.exit(127);
}

poll();

//
//	Server - receive port
//
var dgram = require('dgram');
var server = dgram.createSocket('udp4');
server.bind(PORT, '0.0.0.0');

server.on('listening', function() {
  var address = server.address();
 console.log('UDP Server listening on ' + address.address + ':' + address.port);
});

server.on('message', function(message, remote) {
	var latency=now()-latencyStats.timeSent;
	if (latency<latencyStats.min) latencyStats.min=latency;
	if (latency>latencyStats.max) latencyStats.max=latency;
	latencyStats.measurements.push(latency);

 console.log(ts()+" UDP pkt received. Sent by "+remote.address + ':' + remote.port +' - ' + message+" latency="+latency+" ms"+ " (min/max/avg="+latencyStats.min+"/"+latencyStats.max+"/"+latencyStats.avg()+")");
	if (!RUNFOREVER) process.exit(0);
});


