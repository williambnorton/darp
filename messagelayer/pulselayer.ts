//
//  pulselayer - use the underlying message object to send the same UDP message to multiple nodes
//
import {   dump,   now,      ts } from '../lib/lib';
import {   sendMsg, recvMsg, messagelayer_stats } from './messagelayer';

// launch with TEST=1 to get automatic pulser and catcher
var hostname=process.env.HOSTNAME;
if (typeof process.env.HOSTNAME == "undefined") process.env.HOSTNAME=require("os").hostname().split(".")[0];
const version = require('fs').readFileSync('../SWVersion', {encoding:'utf8', flag:'r'});
console.log("version="+dump(version));
var pulseMessage=",0,"+version+","+hostname+",DEVOPS.1,194,1592591506442,1592590923743,1,2,1,";
console.log("pulseMessage="+pulseMessage);
process.argv.shift();  //ignore rid of node
process.argv.shift();  //ignore rid of path to mthis code

recvMsg("65013",function(incomingMessage:string) {  //one-time set up of message handler callback
  console.log(`test_app_pulser(): recvMsg callback incomingMessage ------> ${incomingMessage}`);
  console.log("Statistics: :"+dump(messagelayer_stats));
});

function test_app_pulser() {    //sample test app 
  sendMsg(pulseMessage, process.argv);
  setTimeout(test_app_pulser,1000);  //do it again in a few seconds
}

test_app_pulser();  //bench test - uncomment to run a test
