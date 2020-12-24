//
// testport.ts - 
//          use:      node porttest MYIP MYPORT GENESIS ... GENESIS

if (process.argv) {
    var myArgs=process.argv.slice(2);

    if (myArgs.length<3) {
        console.log("usage(): "+"testport.ts"+" MYIP MYPORT GENESISIP [ ... GENESISIP ] ");
        console.log("Example: "+"testport.ts"+" `curl ifconfig.io` 65013 52.52.1.32 52.53.1.45 ");
        process.exit(1);
    }
} else {
    //console.log(`process.argv DOES NOT EXIST - ERROR process=${JSON.stringify(process,null,2) }`);
    process.exit(0);
}
const MYIP=myArgs[0];
const MYPORT=myArgs[1];
const GENESISIP=myArgs[2];
const GENESISPORT=65013;
var numberPings=5;
setTimeout(finish,numberPings*1000);

var first={};
console.log("# testport.ts GENESISIP="+GENESISIP+" GENESISPORT="+GENESISPORT+" MYIP="+MYIP+" MYPORT="+MYPORT +" myArgs="+myArgs);

var dgram = require('dgram');
var client = dgram.createSocket('udp4');
var done=false;

client.on('listening', function () {
    var address = client.address();
    console.log('# testport.ts : UDP Server listening on ' + address.address + ":" + address.port);
});

var startTimestamp=0;
var responses=[];
client.on('message', function (message, remote) {
    var timeNow=new Date(); 
    var inmsg=message.toString();
    
    console.log('# '+remote.address + ' responded ' + (timeNow.getTime()-startTimestamp) +" ms with : "+ inmsg);
    var response={ latency:(timeNow.getTime()-startTimestamp), srcIP:remote.address, url:inmsg };
    //if (remote.address != MYIP) { //if we ignore self, the first is always the closest first responder. Later could use test port to test our own port
        if (first=={}) 
            first=response;
        responses.push(response);
        //this proves the port works both directions
        //here we might callback or somehow use the retrieved GENESISPUBLICKEY to prove it works
        //done=true;  //we will go for a couple seconds
    //}
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
        console.log(`# testport.bash  No Responses ${GENESISIP}:${GENESISPORT}`);
    }
    //var selectURL=responses.pop();
    //console.log(`${selectURL.url}`);  //pick one in the middle
    //console.log(`${JSON.stringify(selectURL,null,2)}`);  //pick one in the middle
    //console.log(`auto=${JSON.stringify(responses[ Math.floor(responses.length/2) ].url,null,2)}`);  //pick one in the middle
    process.exit(responses.length);
}

function DARPping() {
    var timeNow=new Date();
    if (--numberPings<=0) {
       finish()
    }
    if (done) {
        finish();
    }
    startTimestamp=timeNow.getTime();
    for (var i=2;i<myArgs.length; i=i+1) {
        let IP=myArgs[i].split(",")[0]
        let Port=myArgs[i].split(",")[1]
        let Name=myArgs[i].split(",")[2]

        //this should develop along side the PONG code in pulseGroup.ts
        var message=`${timeNow.getTime()},11,${process.env.VERSION},${MYIP},${MYPORT},${process.env.GEO},${timeNow.getTime()},${process.env.PUBLICKEY},${process.env.GENESISNODELIST}`; //specify GENESIS Node directly

        //var message=timeNow.getTime()+",11,?,PUBLICKEY,11,11,11,11,destinationIs,"+IP+","+Port+","+Name+",could include DOCKER and DARP SW VERSION HERE,"; //

        console.log(`# testport: DARP Ping IP=${IP} Port=${Port} Name=${Name} message=${message}`);
        if (IP!=MYIP) {  //DO NOT DARP PING YOURSELF so we can use the first to respond
            client.send(message, 0, message.length, Port, IP, function(err, bytes) {
                if (err) throw err;
                console.log('# UDP message sent to ' + IP +':'+ Port);
            });
        } else {
            console.log(`# not pinging self ${IP}`);
        }
    }
   setTimeout(DARPping,1000);
}
//console.log(`testport.ts  bind... IF THIS FAILS, something (maybe docker) is using this UDP Port ${MYPORT}...`);
client.bind(MYPORT);  //server listening 0.0.0.0:65013


DARPping();

