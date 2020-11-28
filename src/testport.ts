const MYPORT=65013

const GENESISPORT=65013
const GENESISIP="52.53.222.151"
var dgram = require('dgram');

var client = dgram.createSocket('udp4');

client.on('listening', function () {
    var address = client.address();
    console.log('UDP Server listening on ' + address.address + ":" + MYPORT);
});

client.on('message', function (message, remote) {
    console.log(remote.address + ':' + remote.port +' - ' + message);
});

function DARPping() {
var message="11,11,11,11,11,11,11,11,11,11,11"
    client.send(message, 0, message.length, GENESISPORT, GENESISIP, function(err, bytes) {
       if (err) throw err;
       console.log('UDP message sent to ' + GENESISIP +':'+ GENESISPORT);
   });
   setTimeout(DARPping,1000);
}
DARPping();

