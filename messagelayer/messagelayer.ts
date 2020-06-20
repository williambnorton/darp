//
//  -create the UDP message bus for communication with all nodes
// all others only have to deal with message, we timestamp and queue it here
const PORT=process.env.PORT||"65013"
const TEST=true;
//
const dgram = require('dgram');
const server = dgram.createSocket('udp4');

export var messagelayer_stats={
  port: "",
  inMsgs : 0,
  outMsgs : 0,
  lastInTimestamp: 0,
  lastOutTimestamp :0,
  lastInMsg :"",
  lastOutMsg :""
};


//  RECEIVER CODE
server.on('error', (err) => {
  console.log(`server error:\n${err.stack}`);
  server.close();
});

server.on('listening', () => {
  const address = server.address();
  console.log(`server listening ${address.address}:${address.port}`);
});

export function recvMsg(port:string,callback:any) {   //API routine
  messagelayer_stats.port=port;
  server.bind(port);
  // Prints: server listening 0.0.0.0:41234
  server.on('message', (msg, rinfo) => {
    var incomingTimestamp=messagelayer_stats.lastInTimestamp=now();
    messagelayer_stats.inMsgs++;
    console.log(`Server received: ${msg} from ${rinfo.address}:${rinfo.port}`);
    var incomingMessage=`${incomingTimestamp},${msg}` //prepend our timeStamp
    messagelayer_stats.lastInMsg=incomingMessage;
    callback(incomingMessage);
  });
}
//--------------------------------------------------------------------
//    SENDER CODE

//pulseMsg sample: 0,Build.200619.1110,DEVOPS,DEVOPS.1,194,1592591506442,1592590923743,1,2,1, from 71.202.2.184:64339
const client = dgram.createSocket('udp4');

//
//   sendMsg(): Send same message to all nodes in nodelist 
//
export function sendMsg(outgoingMessage:string,nodelist:string[]) {  //API routine

  nodelist.forEach(function (node:string) {
    const ipaddr=node.split(":")[0];
    const port=node.split(":")[1]||"65013";
    const timestampedMsg=""+now()+","+outgoingMessage;
    const message = Buffer.from(timestampedMsg);
    messagelayer_stats.outMsgs++;
    messagelayer_stats.lastOutTimestamp=now();
    messagelayer_stats.lastOutMsg=timestampedMsg;
    console.log(ts()+"messagelayer.sendMsg() sending "+timestampedMsg+" to "+ipaddr+":"+port);
    client.send(message, 0, message.length, port, ipaddr, (err:string) => {
      if (err) { console.log(`sendMessage(): ERROR`); client.close(); }
    });
  });
}


/************ TEST AREA ************
// launch with TEST=1 to get automatic pulser and catcher
var hostname=process.env.HOSTNAME;
if (typeof process.env.HOSTNAME == "undefined") process.env.HOSTNAME=require("os").hostname().split(".")[0];
var pulseMessage="incomingTimestamp="+now()+",0,Build.200619.1110,"+process.env.HOSTNAME+",DEVOPS.1,194,1592591506442,1592590923743,1,2,1,";
console.log("pulseMessage="+pulseMessage);
process.argv.shift();  //ignore rid of node
process.argv.shift();  //ignore rid of path to mthis code

recvMsg("65013",function(incomingMessage:string) {  //one-time set up of message handler callback
  console.log(`test_app_pulser(): recvMsg callback incomingMessage ------> ${incomingMessage}`);
});

function test_app_pulser() {    //sample test app 
  sendMsg(pulseMessage, process.argv);
  setTimeout(test_app_pulser,1000);  //do it again in a few seconds
}
if (TEST) test_app_pulser();  //bench test - uncomment to run a test
/*************  TEST AREA **********/


//==============
//misc. routines
function ts() {
  return new Date().toLocaleTimeString() + " ";
}
function now() {
  var d = new Date();
  return d.getTime();
}