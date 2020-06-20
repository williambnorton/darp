//
//  pulselayer - use the underlying message object to send the same UDP message to multiple nodes
//
import {   dump,   now,      ts } from '../lib/lib';
import {   sendMsg, recvMsg, messagelayer_stats } from './messagelayer';

// launch with TEST=1 to get automatic pulser and catcher
var h=process.env.HOSTNAME||require("os").hostname().split(".")[0];
const hostname=h.toUpperCase();
console.log("hostname="+hostname);
var seq=1;
const version = require('fs').readFileSync('../SWVersion', {encoding:'utf8', flag:'r'}).trim();

function buildPulseMessage() {
    var pulseMessage="0,"+version+","+hostname+",DEVOPS.1,"+seq+",0,1592590923743,1,2,1,";
    seq++;
    console.log("buildPulseMessage() : pulseMessage="+pulseMessage);
    return pulseMessage;
}

process.argv.shift();  //ignore rid of node
process.argv.shift();  //ignore rid of path to mthis code

recvMsg("65013",function(incomingMessage:string) {  //one-time set up of message handler callback
  console.log(`pulselayer(): recvMsg callback incomingMessage ------> ${incomingMessage}`);
    var ary=incomingMessage.split(",");
    const incomingTimestamp=parseInt(ary[0]);
    const outgoingTimestamp=parseInt(ary[1]);
    const OWL=incomingTimestamp-outgoingTimestamp;
    ary.shift();ary.shift();
    console.log("Message Layer Statistics: :"+dump(messagelayer_stats));
    console.log("WOULD CALL HANDLEPULSE MESSAGE HERE:");
});

function pulseAll() {    //sample test app 
  sendMsg(buildPulseMessage() , process.argv);
  setTimeout(pulseAll,1000);  //do it again in a few seconds
}
pulseAll();  //bench test - uncomment to run a test


function sendPulse(msg,nodelist) {   //nodelist may be null, which means same pulsegourp sent

}