//
//  messagelayer - receive incoming messages and queue them in redis
//
import {  now,  ts,  dump } from '../lib/lib.js';

console.log(`Starting Message Layer`);
const pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client
var TEST=false;
var dgram = require('dgram');
var server = dgram.createSocket('udp4');

var myipaddr="";
var myport="";

//
//  send message call
//
var networkClient = dgram.createSocket('udp4');
export function send(message:string, ipaddr:string, port:string) {
    console.log("sendPulsePackets(): networkClient.send(message="+message+" to "+ipaddr+":"+port);
              
    networkClient.send(message,port,ipaddr, function(error:string){
        if (error) console.log("messagelayer: network send failed: :"+error);
    });     //***  Message sent
};
//
//  mint:0 is me and my configuration, mint:1 is the groupOwner - a Genesis node
//
redisClient.hgetall("mint:0", function(err:string, whoami:any) {
    if ((err) || (whoami==null)) {
      console.log("messagelayer: can't find mint:0 self - is redis started??? - exitting");
      process.exit(36); //reload software and try again
    }
    console.log(":"+dump(whoami));
    myipaddr=whoami.ipaddr;
    myport=whoami.port;
    console.log(ts() + "messagelayer(): Binding pulsePort on UDP port " + whoami.port);
    server.bind(whoami.port, "0.0.0.0");
    
    if (TEST) testModule(); //UNCOMMENT TO BENCH TEST MESSAGE LAYER. REDIS MUST BE RUNNING !!!


});
//
//  sample app to pull messages off the message queue and print them out
//
function testModule() {
    for (var i=0;i<5;i++) {
        send(`Test message # ${i} UDP send/receive on port ${myport}`,myipaddr, myport);
        console.log(`SENDING ${i} testing UDP send/receive on  ${myipaddr} : ${myport}`);
    }
    for (var i=0;i<5;i++) {
        //console.log("CATCHING MESSAGES FROM MSG Q:");
        redisClient.brpop('messages',2/*secs*/, function (err:string, incomingMessage:string) {
            if (err) console.log("messagelayer error popping messages "+err);
            else {
                if (incomingMessage!=null)
                    console.log(`POPPING MESSAGE: test messagelayer(): popping message from message queue: ${incomingMessage}`);
            }
        });
    }
    setTimeout(testModule,30000);
}
//
//
//  incoming message - stuff it into quque right away
//
server.on('message', function(message:string, remote:any) {
    var strMsg=message.toString();
    console.log(ts() + "messagelayer: received message: " + message + message.length + " bytes from " + remote.address + ':' + remote.port );
    console.log(ts()+"PUSHING "+now()+","+strMsg+" onto messages queue");
    redisClient.lpush( 'messages', ""+now()+","+strMsg, function (err, reply) {
        if (err) console.log("ERROR pushing message onto messages queue: "+err);
        else console.log("SUCCESSFULLY PUSHED into messaes list: "+reply);
    }  );
});

//
// listen for incoming pulses and convert into redis commands
//
server.on('listening', function() {
var address = server.address();
    console.log(ts() + "");
    console.log(ts() + ""); 
    console.log(ts() + 'UDP Server listening for pulses on ' + address.address + ':' + address.port);
    console.log(ts() + "");
    console.log(ts() + "");
});

process.on('SIGTERM', () => {
    console.info('messagelayer SIGTERM signal received.');
    process.exit(36);
});

