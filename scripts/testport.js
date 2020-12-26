//
// testport.ts - 
//          use:      node porttest MYIP MYPORT GENESIS ... GENESIS
//
//  testport - test my and port connectivity to all gneesis nodes
//  should be:
//  in: 
//          GENESIS - overrides closest Genesis Node discovery logic
//          GENESISNODELIST as environmental variable
//
//  out: 
//          stdout  latency for responding genesis nodes excluding self
//          eventually this module could test the port to self to verify port forwarding works
//
console.log("# testport MY_IP=" + process.env.MY_IP + " MY_PORT=" + process.env.MY_PORT + " GENESISNODELIST=" + process.env.GENESISNODELIST + " MY_SWVERSION=" + process.env.MY_SWVERSION + " GEO=" + process.env.GEO);
if (process.env.MY_IP == "" || process.env.MY_PORT == "" || process.env.GENESISNODELIST == "" || process.env.MY_SWVERSION == "" || process.env.MY_GEO == "" || process.env.PUBLICKEY == "") {
    console.log("missing environmental variable. try  echo $MY_GEO $MY_IP $MY_PORT  $MY_SWVERSION $PUBLICKEY $GENESISNODELIST");
    process.exit(86);
}
var numberPings = 2;
var GENESISNODELIST = process.env.MY_IP + "," + process.env.MY_PORT + "," + process.env.MY_GEO + " " + process.env.GENESISNODELIST;
if (GENESISNODELIST == "") {
    console.log("testport.ts something really wrong - no GENESINODE LIST - EXITTING");
    process.exit(86); //something really wrong - no GENESINODE LIST - EXIT
}
var G = GENESISNODELIST.split(" ");
var startTimestamp = 0;
var dgram = require('dgram');
var client = dgram.createSocket('udp4');
client.on('listening', function () {
    var address = client.address();
    console.log('# testport.ts : UDP Server listening on ' + address.address + ":" + address.port);
});
client.bind(process.env.MYPORT); //server listening 0.0.0.0:65013
function darpPing() {
    var _loop_1 = function () {
        var genesisNodeEntry = G[genesisNode];
        console.log("# Here we send DARP Ping to " + genesisNodeEntry);
        var IP = genesisNodeEntry.split(",")[0];
        var Port = genesisNodeEntry.split(",")[1];
        var Name = genesisNodeEntry.split(",")[2];
        timeNow = new Date();
        message = timeNow.getTime() + ",11," + process.env.MY_SWVERSION + "," + process.env.MYIP + "," + process.env.MYPORT + "," + process.env.GEO + "," + timeNow.getTime() + "," + process.env.PUBLICKEY; //specify GENESIS Node directly
        client.send(message, 0, message.length, Port, IP, function (err, bytes) {
            if (err)
                throw err;
            console.log('# sent ' + Name + " " + IP + ':' + Port + " " + message);
        });
    };
    var timeNow, message;
    for (var genesisNode in G) {
        _loop_1();
    }
    setTimeout(darpPing, 1000);
}
//setTimeout(finish,numberPings*1000);
//
//      handle DARP PING Reponses
//
//var responses=[];
client.on('message', function (message, remote) {
    console.log("# GOT A DARP PING REPLY : " + message);
    var timeNow = new Date();
    var inmsg = message.toString();
    var pongFields = inmsg.split[","];
    var src = remote.address;
    var sendTime = pongFields[0];
    var msgType = pongFields[1];
    var swversion = pongFields[2];
    var genesisip = pongFields[3];
    var genesisport = pongFields[4];
    var genesisgeo = pongFields[5];
    var genesisboottimestamp = pongFields[6];
    var genesispublickey = pongFields[7];
    console.log("# ping message src=" + src + " msgType=" + msgType + " genesisgeo=" + genesisgeo + " genesisip=" + genesisip + " genesisport=" + genesisport + " swversion=" + swversion);
    console.log('# ' + remote.address + ' responded ' + (timeNow.getTime() - startTimestamp) + " ms with : " + inmsg);
    console.log((timeNow.getTime() - startTimestamp) + "," + remote.address);
    //    var response={ latency:(timeNow.getTime()-startTimestamp), srcIP:remote.address, url:inmsg };
    if (remote.address == process.env.MYIP && msgType == 11) { //respond to my own ping
        var msg = timeNow.toTimeString() + ",12," + process.env.MY_SWVERSION + "," + process.env.MYIP + "," + process.env.MYPORT + "," + process.env.GEO + "," + timeNow.getTime() + "," + process.env.PUBLICKEY; //specify GENESIS Node directly
        console.log("# Sending PONG (12) to " + remote.address + ":" + process.env.MYPORT + " message=" + msg);
        client.send(msg, 65013, remote.address);
        return;
    }
    ///    responses.push(response);  //store the 
});
//
//      finish on timeout
//
function finish() {
    console.log("#  testport complete finish");
    //  for (var g in responses) {
    //
    //
    //
    //    console.log(`${responses[g].latency},${responses[g].srcIP},${responses[g].url},`);
    //                34                    52.53.222.151       
    //
    //
    //}
    //if (responses.length==0) {
    //  console.log(`# testport.bash  No Responses`);
    // }
    //var selectURL=responses.pop();
    //console.log(`${selectURL.url}`);  //pick one in the middle
    //console.log(`${JSON.stringify(selectURL,null,2)}`);  //pick one in the middle
    //console.log(`auto=${JSON.stringify(responses[ Math.floor(responses.length/2) ].url,null,2)}`);  //pick one in the middle
    process.exit(0);
}
//console.log(`testport.ts  bind... IF THIS FAILS, something (maybe docker) is using this UDP Port ${MYPORT}...`);
setTimeout(finish, numberPings * 1000);
console.log("# " + process.env);
darpPing();
