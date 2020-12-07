//
// testport.ts - 
//          use:      node porttest MYIP MYPORT GENESIS ... GENESIS
//
// standlone utility
//	$1 is MYIP curl'd from public utility - what if not on public internet?
//	$2 is optional port specified DEFAULT=65013
// example: node testport `curl ifconfig.io` 65013

//import { argv } from "process";

//
var myArgs=process.argv.slice(2);
if (myArgs.length<3) {
	console.log("usage(): "+"testport.ts"+" MYIP MYPORT GENESISIP [ ... GENESISIP ] ");
	console.log("Example: "+"testport.ts"+" `curl ifconfig.io` 65013 52.52.1.32 52.53.1.45 ");
	process.exit(1);
}
const MYIP=myArgs[0];
const MYPORT=myArgs[1];
const GENESISIP=myArgs[2];
const GENESISPORT=65013;
var numberPings=3;
var first={};
console.log("testport.ts GENESISIP="+GENESISIP+" GENESISPORT="+GENESISPORT+" MYIP="+MYIP+" MYPORT="+MYPORT );



var dgram = require('dgram');
var client = dgram.createSocket('udp4');
var done=false;

client.on('listening', function () {
    var address = client.address();
    console.log('testport.ts : UDP Server listening on ' + address.address + ":" + address.port);
});

var startTimestamp=0;
var responses=[];
client.on('message', function (message, remote) {
    var timeNow=new Date(); 
    var inmsg=message.toString();
    
    //console.log(remote.address + ' ' + (timeNow.getTime()-startTimestamp) +" ms "+ inmsg);
    var response={ srcIP:remote.address, latency:(timeNow.getTime()-startTimestamp), url:inmsg };
    if (first=={}) 
        first=response;
    responses.push(response);
    //this proves the port works both directions
    //here we might callback or somehow use the retrieved GENESISPUBLICKEY to prove it works
    done=true;
});

function finish() {
    //console.log(`FirstURL=${JSON.stringify(first,null,2)}`);
    for (var g in responses) {
        console.log(`testport.ts  ${responses[g].latency}:${responses[g].url}:GenesisNode:${responses[g].srcIP}:`);
    }
    if (responses.length==0) {
        console.log(`ERROR: NO CLEAR PATHS TO UDP ${GENESISPORT} ${JSON.stringify(argv)}`);
    }
    //var selectURL=responses.pop();
    //console.log(`${selectURL.url}`);  //pick one in the middle
    //console.log(`${JSON.stringify(selectURL,null,2)}`);  //pick one in the middle
    //console.log(`auto=${JSON.stringify(responses[ Math.floor(responses.length/2) ].url,null,2)}`);  //pick one in the middle
    process.exit(responses.length);
}

function DARPping() {
    var timeNow=new Date();
    var message=timeNow.getTime()+",11,?,PUBLICKEY,11,11,11,11,11,11,couldSendHost,could,send,MYIP,MYPORT,MYPUBLICKEY,,,"
    if (--numberPings==0) {
       finish()
    }
    if (done) {
        finish();
    }
    startTimestamp=timeNow.getTime();
    for (var i=2;i<myArgs.length; i=i+1) {
        let IP=myArgs[i];
        let Port=65013;
        if (IP!=MYIP) {  //DO NOT DARP PING YOURSELF - IT CAN DO NO GOOD
            client.send(message, 0, message.length, Port, IP, function(err, bytes) {
                if (err) throw err;
            //console.log('UDP message sent to ' + IP +':'+ Port);
            });
        }
    }
   setTimeout(DARPping,1000);
}
//console.log(`testport.ts  bind... IF THIS FAILS, something (maybe docker) is using this UDP Port ${MYPORT}...`);
client.bind(MYPORT);  //server listening 0.0.0.0:65013


DARPping();

