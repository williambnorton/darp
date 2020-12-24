//
// testport.ts - 
//          use:      node porttest MYIP MYPORT GENESIS ... GENESIS
//
//  testport - test my and port connectivity to all gneesis nodes
//  should be:
//  in: GENESISNODELIST as environmental variable
//  out: 
//          stdout  latency for responding genesis nodes excluding self
//          eventually this module could test the port to self to verify port forwarding works
//
console.log(`# testport MYIP=${process.env.MYIP} MYPORT=${process.env.MYPORT} GENESISNODELIST=${process.env.GENESISNODELIST}`);
var numberPings=3;
const GENESISNODELIST=process.env.GENESISNODELIST||""
const G=GENESISNODELIST.split(" ")
var startTimestamp=0;

var dgram = require('dgram');
var client = dgram.createSocket('udp4');

client.on('listening', function () {
    var address = client.address();
    console.log('# testport.ts : UDP Server listening on ' + address.address + ":" + address.port);
});

function darpPing() {
    for (var genesisNode in G ) {
        const genesisNodeEntry=G[genesisNode];
        console.log(`# Here we send DARP Ping to ${genesisNodeEntry}`);
        let IP=genesisNodeEntry.split(",")[0]
        let Port=genesisNodeEntry.split(",")[1]
        let Name=genesisNodeEntry.split(",")[2]
        var timeNow=new Date();
        var message=`${timeNow.getTime()},11,${process.env.VERSION},${process.env.MYIP},${process.env.MYPORT},${process.env.GEO},${timeNow.getTime()},${process.env.PUBLICKEY}`; //specify GENESIS Node directly
        client.send(message, 0, message.length, Port, IP, function(err, bytes) {
            if (err) throw err;
            console.log('# sent ' + Name + " " + IP +':'+ Port+" "+message);
        });
    }
    setTimeout(darpPing,1000);
}
//setTimeout(finish,numberPings*1000);

//
//      handle DARP PING Reponses
//
//var responses=[];
client.on('message', function (message, remote) {
    var timeNow=new Date(); 
    var inmsg=message.toString();
    
    const pongFields=inmsg.split[","]
    var src=remote.address
    var sendTime=pongFields[0];
    var msgType=pongFields[1];
    var swversion=pongFields[2];
    var genesisip=pongFields[3];
    var genesisport=pongFields[4];
    var genesisgeo=pongFields[5];
    var genesisboottimestamp=pongFields[6];
    var genesispublickey=pongFields[7];
    console.log(`# ping message src=${src} msgType=${msgType} genesisgeo=${genesisgeo} genesisip=${genesisip} genesisport=${genesisport} swversion=${swversion}`);
    console.log('# '+remote.address + ' responded ' + (timeNow.getTime()-startTimestamp) +" ms with : "+ inmsg);
    console.log(`${(timeNow.getTime()-startTimestamp)},${remote.address}`);
//    var response={ latency:(timeNow.getTime()-startTimestamp), srcIP:remote.address, url:inmsg };

    if ( remote.address==process.env.MYIP && msgType==11 ) {  //respond to my own ping
        var msg=`${timeNow.toTimeString()},12,${process.env.VERSION},${process.env.MYIP},${process.env.MYPORT},${process.env.GEO},${timeNow.getTime()},${process.env.PUBLICKEY}`; //specify GENESIS Node directly
        console.log(`# Sending PONG (12) to ${remote.address}:${process.env.MYPORT} message=${msg}`);
        client.send(msg, 65013, remote.address);
        return;
    }

///    responses.push(response);  //store the 

});

//
//
//
function finish() {
    console.log(`#  finish responses=${responses}`);
    for (var g in responses) {
        //
        //
        //
        console.log(`${responses[g].latency},${responses[g].srcIP},${responses[g].url},`);
        //                34                    52.53.222.151       
        //
        //
    }
    if (responses.length==0) {
        console.log(`# testport.bash  No Responses`);
    }
    //var selectURL=responses.pop();
    //console.log(`${selectURL.url}`);  //pick one in the middle
    //console.log(`${JSON.stringify(selectURL,null,2)}`);  //pick one in the middle
    //console.log(`auto=${JSON.stringify(responses[ Math.floor(responses.length/2) ].url,null,2)}`);  //pick one in the middle
    process.exit(responses.length);
}

//console.log(`testport.ts  bind... IF THIS FAILS, something (maybe docker) is using this UDP Port ${MYPORT}...`);
client.bind(process.env.MYPORT);  //server listening 0.0.0.0:65013


