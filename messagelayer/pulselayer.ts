//
//  pulselayer - send "pulse" UDP message to all nodes
//
//
import {   dump,   now,      ts, nth_occurrence, MYVERSION } from '../lib/lib';
import {   sendMsg, recvMsg, messagelayer_stats } from './messagelayer';

const TEST=true; // launch with TEST=1 to get automatic pulser and catcher
var h=process.env.HOSTNAME||require("os").hostname().split(".")[0];
const HOSTNAME=h.toUpperCase();
const VERSION = MYVERSION();

//
//  recvPulses() - bind the port and send incoming pulses as structured data
//
export function recvPulses(port,callback) {
    //console.log(`recvPulses(port=${port}):`);
    recvMsg(""+port,function(incomingMessage:string) {  //one-time set up of message handler callback
        //console.log(`****** pulselayer(): recvMsg callback incomingMessage ------> ${incomingMessage}`);
          var ary=incomingMessage.split(",");
          const pulseTimestamp=parseInt(ary[0]);
          const senderTimestamp=parseInt(ary[1]);
          const OWL=pulseTimestamp-senderTimestamp;
          var owlsStart = nth_occurrence(incomingMessage, ',', 9); //owls start after the 7th comma
          var pulseOwls = incomingMessage.substring(owlsStart + 1, incomingMessage.length);
          var pulse = {
            pulseTimestamp : pulseTimestamp,
            senderTimestamp : senderTimestamp,
            msgType : ary[2],
            version: ary[3],
            geo: ary[4],
            group: ary[5],
            seq: ary[6],
            bootTimestamp: parseInt(ary[7]),   //if genesis node reboots --> all node reload SW too
            mint: ary[8],
            owls: pulseOwls,
            owl: OWL,
            lastMsg:incomingMessage
          };;
          //console.log("****** recvPulses(): message="+incomingMessage+" owlstart="+owlsStart," pulseOwls="+pulseOwls);
          //console.log("structured pulse="+dump(pulse));

          //ary.shift();ary.shift();
          //const pulse=ary.join(",");
          //console.log("Message Layer Statistics: :"+dump(messagelayer_stats));  //INSTRUMENTATION POINT
          callback(pulse);
    });
};

export function sendPulses(msg,nodelist) {   //nodelist may be null, which means same pulsegourp sent
    
    sendMsg(msg, nodelist);
}

/***************** TEST AREA **************** /
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
    pulseAll();  //bench test - uncomment to run a test

        recvPulses("65013",function(pulse) {
            console.log("pulseApp receiving pulse="+dump(pulse));
        });
}
function pulseAll() {    //sample test app 
    sendPulses(buildPulseMessage() , process.argv);
    setTimeout(pulseAll,1000);  //do it again in a few seconds
}

/***************** TEST AREA ****************/
