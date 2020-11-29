//
// testport.ts - node porttest [MYIP] [MYPORT]
//
//	$1 is MYIP curl'd from public utility - what if not on public internet?
//	$2 is optional port specified DEFAULT=65013
//
var myArgs = process.argv.slice(2);
if (myArgs.length != 4) {
    console.log("usage(): " + myArgs[0] + " GENESISIP GENESISPORT MYIP MYPORT");
    console.log("Example: " + myArgs[0] + " 52.52.1.32 65013 `curl ifconfig.io` 65013");
    process.exit(1);
}
var GENESISIP = myArgs[0];
var GENESISPORT = myArgs[1];
var MYIP = myArgs[2];
var MYPORT = myArgs[3];
console.log("GENESISIP=" + GENESISIP + " GENESISPORT=" + GENESISPORT + " MYIP=" + MYIP + " MYPORT=" + MYPORT);
var dgram = require('dgram');
var client = dgram.createSocket('udp4');
client.on('listening', function () {
    var address = client.address();
    console.log('UDP Server listening on ' + address.address + ":" + address.port);
});
client.on('message', function (message, remote) {
    console.log(remote.address + ':' + remote.port + ' - ' + message);
});
function DARPping() {
    var message = "11,11,11,11,11,11,11,11,11,11,11";
    client.send(message, 0, message.length, GENESISPORT, GENESISIP, function (err, bytes) {
        if (err)
            throw err;
        console.log('UDP message sent to ' + GENESISIP + ':' + GENESISPORT);
    });
    setTimeout(DARPping, 1000);
}
client.bind(MYPORT); //server listening 0.0.0.0:65013
DARPping();
