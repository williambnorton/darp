//
// testport.ts - node porttest [MYIP] [MYPORT]
//
//	$1 is MYIP curl'd from public utility - what if not on public internet?
//	$2 is optional port specified DEFAULT=65013
//
var myArgs=process.argv.slice(2);
if (myArgs.length<4) {
	console.log("usage(): "+myArgs[0]+" MYIP MYPORT GENESISIP GENESISPORT [IP PORT ... IP PORT]");
	console.log("Example: "+myArgs[0]+" `curl ifconfig.io` 65013 52.52.1.32 65013 ");
	process.exit(1);
}
const MYIP=myArgs[0];
const MYPORT=myArgs[1];
const GENESISIP=myArgs[2];
const GENESISPORT=myArgs[3];
var numberPings=3;
console.log("GENESISIP="+GENESISIP+" GENESISPORT="+GENESISPORT+" MYIP="+MYIP+" MYPORT="+MYPORT );

var dgram = require('dgram');
var client = dgram.createSocket('udp4');
var done=false;

client.on('listening', function () {
    var address = client.address();
    console.log('UDP Server listening on ' + address.address + ":" + address.port);
});

client.on('message', function (message, remote) {
    console.log(remote.address + ':' + remote.port +' - ' + message);
    console.log(`PORTS WORK`);
    //this proves the port works both directions
    //here we might callback or somehow use the retrieved GENESISPUBLICKEY to prove it works
    done=true;
});

function DARPping() {
    var timeNow=new Date();
    var message=timeNow.getTime()+",11,?,PUBLICKEY,11,11,11,11,11,11,couldSendHost"
 
    for (var i=2;i<myArgs.length; i=i+2) {
        let IP=myArgs[i];
        let Port=myArgs[i+1];
        client.send(message, 0, message.length, Port, IP, function(err, bytes) {
           if (err) throw err;
            console.log('UDP message sent to ' + IP +':'+ Port);
        });
    }
   if (--numberPings==0) {
        console.log(`FAILED`);
      process.exit(1);
   }
   if (done) process.exit(0);
   else setTimeout(DARPping,1000);
}
client.bind(MYPORT);  //server listening 0.0.0.0:65013

DARPping();

