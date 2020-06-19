//
//  -create the UDP message bus for communication with all nodes
// all others only have to deal with message, we timestamp and queue it here
var PORT="65013"

//
const dgram = require('dgram');
const server = dgram.createSocket('udp4');

//misc. routines
function ts() {
  return new Date().toLocaleTimeString() + " ";
}
function now() {
  var d = new Date();
  return d.getTime();
}



//  RECEIVER CODE
server.on('error', (err) => {
  console.log(`server error:\n${err.stack}`);
  server.close();
});

server.on('message', (msg, rinfo) => {
  var incomingTimestamp=now();
  console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
  var incomingMessage=`${incomingTimestamp},${msg}` //prepend our timeStamp
});

server.on('listening', () => {
  const address = server.address();
  console.log(`server listening ${address.address}:${address.port}`);
});

server.bind(PORT);
// Prints: server listening 0.0.0.0:41234
//--------------------------------------------------------------------
//    SENDER CODE

//pulseMsg sample: 0,Build.200619.1110,DEVOPS,DEVOPS.1,194,1592591506442,1592590923743,1,2,1, from 71.202.2.184:64339
const client = dgram.createSocket('udp4');

//
//   send(): 
//
function send(rawmsg:string,nodelist:string[]) {
  nodelist.forEach(function (node:string) {
    const ipaddr=node.split(":")[0];
    const port=node.split(":")[1]||"65013";
    const message = Buffer.from(now()+","+rawmsg);
    console.log(ts()+"sending "+message+" to "+ipaddr+":"+port);
    client.send(message, 0, message.length, port, ipaddr, (err:string) => {
      if (err) {console.log(`sendMessage(): ERROR`);client.close();}
    });
  });
}

var pulseMessage="incomingTimestamp="+now()+",0,Build.200619.1110,DEVOPS,DEVOPS.1,194,1592591506442,1592590923743,1,2,1,";



/************************/
// launch with TEST=1 to get automatic pulser and catcher
process.argv.shift();  //ignore rid of node
process.argv.shift();  //ignore rid of path to mthis code

function test_app_pulser() {
  //process.argv.forEach(function (val) {
    //const ipaddr=val.split(":")[0];
    //const port=val.split(":")[1]||"65013";
    //const message = Buffer.from(pulseMessage);
    send(pulseMessage,process.argv);
  //});
  setTimeout(test_app_pulser,1000);
}
test_app_pulser();  //bench test - uncomment to run a test