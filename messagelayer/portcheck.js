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
//--------------------------------------------------------------------
//    SENDER CODE
process.argv.shift(); //ignore rid of node
process.argv.shift(); //ignore rid of path to mthis code
function getMessage() {
    var pulseMessage = "msg" + now() + ",0,Build.200619.1110,DEVOPS,DEVOPS.1,194,1592591506442,1592590923743,1,2,1,";
    return pulseMessage;
}
//server got: 0,Build.200619.1110,DEVOPS,DEVOPS.1,194,1592591506442,1592590923743,1,2,1, from 71.202.2.184:64339
function pulser() {
    process.argv.forEach(function (val) {
        var ipaddr = val.split(":")[0];
        var port = val.split(":")[1] || "65013";
        var message = Buffer.from(getMessage());
        console.log(ts() + "sending " + message + " to " + ipaddr + ":" + port);
        var client = dgram.createSocket('udp4');
        client.send(message, port, ipaddr, function (err) {
            client.close();
        });
    });
    setTimeout(pulser, 1000);
}
pulser();
function ts() {
    return new Date().toLocaleTimeString() + " ";
}
