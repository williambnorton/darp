//
// testport.ts - 
//          use:      node porttest MY_IP MY_PORT GENESIS ... GENESIS
//
//  testport - test my and port connectivity to all gneesis nodes
//  should be:
//  in: 
//          GENESISNODELIST as environmental variable
//
//  out: 
//          stdout  latency for responding genesis nodes excluding self
//          eventually this module could test the port to self to verify port forwarding works
//
console.log("# testport MY_IP=" + process.env.MY_IP + " MY_PORT=" + process.env.MY_PORT + " MY_SWVERSION=" + process.env.MY_SWVERSION + " MY_GEO=" + process.env.MY_GEO);
if (process.env.MY_IP == "" || process.env.MY_PORT == "" || process.env.GENESISNODELIST == "" || process.env.MY_SWVERSION == "" || process.env.MY_GEO == "") {
    console.log("missing environmental variable. try  echo $MY_IP $MY_PORT $MY_SWVERSION $GENESISNODELIST $MY_GEO");
    process.exit(86);
}
var numberPings = 1;
//var GENESISNODELIST=process.env.MY_IP+","+process.env.MY_PORT+","+process.env.MY_GEO+" "+process.env.GENESISNODELIST
var GENESISNODELIST = process.env.GENESISNODELIST || "";
if (GENESISNODELIST == "") {
    console.log("testport.ts something really wrong - no GENESISNODE LIST - EXITTING");
    process.exit(86); //something really wrong - no GENESINODE LIST - EXIT
}
GENESISNODELIST = GENESISNODELIST.replace(/\n/g, " ");
var startTime = new Date();
var dgram = require('dgram');
var client = dgram.createSocket('udp4');
client.on('listening', function () {
    var address = client.address();
    //    console.log('# testport.ts : UDP Server listening on ' + address.address + ":" + address.port);
});
client.bind(process.env.MY_PORT); //server listening 0.0.0.0:65013
function darpPing() {
    startTime = new Date(); //reset start timestamp
    //console.log(`myList=${myList}`);
    //console.log(`====myList.trim()=${myList.trim()}`);
    //console.log(`**** ary=${JSON.stringify(ary,null,2)}`); 
    var ary = GENESISNODELIST.split(" ");
    for (var genesisNode in ary) {
        //console.log(`genesisNode=${ary[genesisNode]}`);
        var IP = ary[genesisNode].split(",")[0];
        var Port = parseInt(ary[genesisNode].split(",")[1]);
        var Name = ary[genesisNode].split(",")[2];
        var role = ary[genesisNode].split(",")[3];
        var message = startTime.getTime() + ",11," + process.env.MY_SWVERSION + "," + process.env.MY_IP + "," + process.env.MY_PORT + "," + process.env.MY_GEO + "," + IP + "," + Port + "," + Name + "," + process.env.MY_IP + "," + process.env.MY_PORT + "," + process.env.MY_GEO; //specify GENESIS Node directly
        if (IP == process.env.MY_IP)
            message = message + ",SELF";
        if (typeof Name != "undefined") {
            //console.log(`# Here we send DARP Ping to ${role} ${Name} ${IP}:${Port} message=${message}`);
            client.send(message, 0, message.length, Port, IP, function (err, bytes) {
                if (err)
                    throw err;
                //console.log('# sent ' + Name + " " + IP +':'+ Port+" "+message);
            });
        }
    }
    setTimeout(darpPing, 1000);
}
//setTimeout(finish,numberPings*1000);
//
//      handle DARP PING Reponses
//
//var responses=[];
client.on('message', function (message, remote) {
    //console.log(`# GOT A DARP PING REPLY : ${message}`);
    var timeNow = new Date();
    var inmsg = message.toString();
    var pongFields = inmsg.split(",");
    var sendTime = pongFields[0];
    var msgType = pongFields[1];
    var swversion = pongFields[2];
    //TO:
    var genesisip = pongFields[3];
    var genesisport = pongFields[4];
    var genesisgeo = pongFields[5];
    //FROM:
    var srcip = pongFields[6];
    var srcport = pongFields[7];
    var srcgeo = pongFields[8];
    if (remote.address == process.env.MY_IP && msgType == 11) { //respond to my own ping
        var msg = timeNow.getTime() + ",12," + process.env.MY_SWVERSION + "," + process.env.MY_IP + "," + process.env.MY_PORT + "," + process.env.MY_GEO; //specify GENESIS Node directly
        //console.log(`# Sending PONG (12) response to my own ping to publicIP: ${remote.address}:${process.env.MY_PORT} message=${msg}`);
        client.send(msg, genesisport, remote.address);
        return;
    }
    else {
        //        console.log(`# pong message received remote.address=${remote.address} msgType=${msgType} genesisgeo=${genesisgeo} genesisip=${genesisip} genesisport=${genesisport} swversion=${swversion}`);
        //        console.log('# '+remote.address + ' responded ' + (timeNow.getTime()-startTime.getTime()) +" ms with : "+ inmsg);
        //        console.log(`# ${(timeNow.getTime()-startTime.getTime())},${genesisip},${genesisport},${genesisgeo}`);
        if (remote.address == process.env.MY_IP) {
            console.log((timeNow.getTime() - startTime.getTime()) + "," + genesisip + "," + genesisport + "," + genesisgeo + "," + message + ",,,,SELF");
        }
        else {
            console.log((timeNow.getTime() - startTime.getTime()) + "," + genesisip + "," + genesisport + "," + genesisgeo + "," + message);
        }
    }
    //    var response={ latency:(timeNow.getTime()-startTimestamp), srcIP:remote.address, url:inmsg };
    ///    responses.push(response);  //store the 
});
//
//      finish on timeout
//
function finish() {
    //   console.log(`#  testport complete finish`);
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
//console.log(`testport.ts  bind... IF THIS FAILS, something (maybe docker) is using this UDP Port ${MY_PORT}...`);
setTimeout(finish, numberPings * 1000);
//console.log(`# ${process.env}`);
darpPing();
