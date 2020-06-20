//
//  pulselayer - send "pulse" UDP message to all nodes
//
import {   dump,   now,      ts } from '../lib/lib';
import {   sendMsg, recvMsg, messagelayer_stats } from './messagelayer';

const TEST=true; // launch with TEST=1 to get automatic pulser and catcher
var h=process.env.HOSTNAME||require("os").hostname().split(".")[0];
const HOSTNAME=h.toUpperCase();
const VERSION = require('fs').readFileSync('../SWVersion', {encoding:'utf8', flag:'r'}).trim();
var seq=1;

function buildPulseMessage() {
    var pulseMessage="0,"+VERSION+","+HOSTNAME+",DEVOPS.1,"+seq+",0,1592590923743,1,2,1,";
    seq++;
    console.log("buildPulseMessage() : pulseMessage="+pulseMessage);
    return pulseMessage;
}






if (TEST) {
    process.argv.shift();  //ignore rid of node
    process.argv.shift();  //ignore rid of path to mthis code

    function pulseAll() {    //sample test app 
        sendMsg(buildPulseMessage() , process.argv);
        setTimeout(pulseAll,1000);  //do it again in a few seconds
    }
    pulseAll();  //bench test - uncomment to run a test
}

export function recvPulses(port,callback) {
    recvMsg(""+port,function(incomingMessage:string) {  //one-time set up of message handler callback
        console.log(`pulselayer(): recvMsg callback incomingMessage ------> ${incomingMessage}`);
          var ary=incomingMessage.split(",");
          const incomingTimestamp=parseInt(ary[0]);
          const outgoingTimestamp=parseInt(ary[1]);
          const OWL=incomingTimestamp-outgoingTimestamp;
          ary.shift();ary.shift();
          const pulse=ary.join(",");
          console.log("Message Layer Statistics: :"+dump(messagelayer_stats));
          console.log("WOULD CALL HANDLEPULSE MESSAGE HERE: OWL="+OWL+" message="+pulse);
          callback(OWL,pulse);
    });
};


export function sendPulses(msg,nodelist) {   //nodelist may be null, which means same pulsegourp sent
    sendMsg(buildPulseMessage() , process.argv);
}