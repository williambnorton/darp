//
//  handlePulse - receive incoming pulses and store in redis
//

//
// listen for incoming pulses and convert into redis commands
//
var PORT = 65013;
var HOST = '127.0.0.1';
var HOST = '0.0.0.0';

var dgram = require('dgram');
var server = dgram.createSocket('udp4');

server.on('listening', function() {
  var address = server.address();
 console.log('UDP Server listening on ' + address.address + ':' + address.port);
});

server.on('message', function(message, remote) {
 console.log(" received pulse from "+remote.address + ':' + remote.port +' - ' + message);
});

server.bind(PORT, HOST);
