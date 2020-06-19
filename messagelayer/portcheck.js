var dgram = require('dgram');
var server = dgram.createSocket('udp4');
//  RECEIVER CODE
server.on('error', function (err) {
    console.log("server error:\n" + err.stack);
    server.close();
});
server.on('message', function (msg, rinfo) {
    console.log("server got: " + msg + " from " + rinfo.address + ":" + rinfo.port);
});
server.on('listening', function () {
    var address = server.address();
    console.log("server listening " + address.address + ":" + address.port);
});
server.bind(65013);
// Prints: server listening 0.0.0.0:41234
//----------
//    SENDER CODE
process.argv.shift();
process.argv.shift();
function pulser() {
    var message = "HEREISAMESSAGE";
    process.argv.forEach(function (val) {
        console.log("Sending pulse to :" + val);
        var ipaddr = val.split(":")[0];
        var port = val.split(":")[1] || "65013";
        var message = Buffer.from('Some bytes');
        console.log("sending " + message + " to " + ipaddr + ":" + port);
        var client = dgram.createSocket('udp4');
        client.send(message, 41234, 'localhost', function (err) {
            client.close();
        });
    });
    setTimeout(pulser, 1000);
}
pulser();
