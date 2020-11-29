//
// testport.ts - node porttest [MYIP] [MYPORT]
//
//	$1 is MYIP curl'd from public utility - what if not on public internet?
//	$2 is optional port specified DEFAULT=65013
//
var myArgs = process.argv.slice(2);
if (myArgs.length < 4) {
    console.log("usage(): " + myArgs[0] + " MYIP MYPORT GENESISIP GENESISPORT [IP PORT ... IP PORT]");
    console.log("Example: " + myArgs[0] + " `curl ifconfig.io` 65013 52.52.1.32 65013 ");
    process.exit(1);
}
var MYIP = myArgs[0];
var MYPORT = myArgs[1];
var GENESISIP = myArgs[2];
var GENESISPORT = myArgs[3];
var numberPings = 3;
var first = {};
console.log("GENESISIP=" + GENESISIP + " GENESISPORT=" + GENESISPORT + " MYIP=" + MYIP + " MYPORT=" + MYPORT);
var dgram = require('dgram');
var client = dgram.createSocket('udp4');
var done = false;
client.on('listening', function () {
    var address = client.address();
    console.log('UDP Server listening on ' + address.address + ":" + address.port);
});
var startTimestamp = 0;
var responses = [];
client.on('message', function (message, remote) {
    var timeNow = new Date();
    console.log(remote.address + ':' + remote.port + ' - ' + (timeNow.getTime() - startTimestamp) + " ms " + message);
    var response = { ipaddr: remote.address, port: remote.port, latency: (timeNow.getTime() - startTimestamp), message: message };
    if (first == {})
        first = response;
    //this proves the port works both directions
    //here we might callback or somehow use the retrieved GENESISPUBLICKEY to prove it works
    done = true;
});
function finish() {
    console.log("FirstURL=" + first);
    process.exit(0);
}
function DARPping() {
    var timeNow = new Date();
    var message = timeNow.getTime() + ",11,?,PUBLICKEY,11,11,11,11,11,11,couldSendHost";
    if (--numberPings == 0) {
        console.log("FAILED");
        finish();
    }
    if (done) {
        finish();
    }
    startTimestamp = timeNow.getTime();
    var _loop_1 = function () {
        var IP = myArgs[i];
        var Port = myArgs[i + 1];
        client.send(message, 0, message.length, Port, IP, function (err, bytes) {
            if (err)
                throw err;
            console.log('UDP message sent to ' + IP + ':' + Port);
        });
    };
    for (var i = 2; i < myArgs.length; i = i + 2) {
        _loop_1();
    }
    setTimeout(DARPping, 1000);
}
client.bind(MYPORT); //server listening 0.0.0.0:65013
DARPping();
