//
// testport.ts - 
//          use:      node porttest MY_IP MY_PORT GENESIS ... GENESIS
//
//  testport - test my and port connectivity to all gneesis nodes
//  should be:
//  in: 
//          GENESISNODELIST as environmental variable
//
//  out: 
//          stdout  latency for responding genesis nodes excluding self
//          eventually this module could test the port to self to verify port forwarding works
//
//console.log(`# testport MY_IP=${process.env.MY_IP} MY_PORT=${process.env.MY_PORT} MY_SWVERSION=${process.env.MY_SWVERSION} MY_GEO=${process.env.MY_GEO}`);

if ( process.env.MY_IP == "" || process.env.MY_PORT == "" || process.env.GENESISNODELIST == "" || process.env.MY_SWVERSION == ""|| process.env.MY_GEO == "") {
    console.log(`missing environmental variable. try  echo $MY_IP $MY_PORT $MY_SWVERSION $GENESISNODELIST $MY_GEO`);
    process.exit(86);
}
var numberPings=1;
var numberResponses=0;

//var GENESISNODELIST=process.env.MY_IP+","+process.env.MY_PORT+","+process.env.MY_GEO+" "+process.env.GENESISNODELIST

var GENESISNODELIST = process.env.GENESISNODELIST || "";
if (GENESISNODELIST=="") {
    console.log(`testport.ts something really wrong - no GENESISNODE LIST - EXITTING`);
    process.exit(86);  //something really wrong - no GENESINODE LIST - EXIT
}
GENESISNODELIST=GENESISNODELIST.replace(/\n/g," ")
var startTime=new Date();

var dgram = require('dgram');
var client = dgram.createSocket('udp4');

client.on('listening', function () {
    var address = client.address();
//    console.log('# testport.ts : UDP Server listening on ' + address.address + ":" + address.port);
});


client.bind(process.env.MY_PORT);  //server listening 0.0.0.0:65013

//
//  GENESISNODELIST = IP,PORT,GEO,ROLE,LATENCY
//  ROLE=GENESIS or MEMBER
//
var surplus=new Array();
function darpPing() {
    startTime=new Date();  //reset start timestamp
    //console.log(`myList=${myList}`);
    //console.log(`====myList.trim()=${myList.trim()}`);
    //console.log(`**** ary=${JSON.stringify(ary,null,2)}`); 
    var ary=GENESISNODELIST.split(" ")
    for (var genesisNode in ary) {
        //console.log(`genesisNode=${ary[genesisNode]}`);
        let IP=ary[genesisNode].split(",")[0];
        let Port=parseInt(ary[genesisNode].split(",")[1]);
        let Name=ary[genesisNode].split(",")[2];
        let role=ary[genesisNode].split(",")[3];
        var message=`${startTime.getTime()},11,${process.env.MY_SWVERSION},${process.env.MY_IP},${process.env.MY_PORT},${process.env.MY_GEO},${IP},${Port},${Name},${process.env.MY_IP},${process.env.MY_PORT},${process.env.MY_GEO}`; //specify GENESIS Node directly
        if ( IP == process.env.MY_IP ) message=message+",SELF"

	    if ( typeof Name != "undefined" ) {
        	//console.log(`# Here we send DARP Ping to ${role} ${Name} ${IP}:${Port} message=${message}`);

        	client.send(message, 0, message.length, Port, IP, function(err, bytes) {
            		if (err) throw err;
                    //console.log('# sent ' + Name + " " + IP +':'+ Port+" "+message);
            });
            surplus[IP+","+Port+","+Name+","+role]="99999";
	    }
    }
    setTimeout(darpPing,1000);
}
//setTimeout(finish,numberPings*1000);

//
//      handle DARP PING Reponses
//
//var responses=[];
client.on('message', function (message, remote) {
    //console.log(`# GOT A DARP PING REPLY : ${message}`);

    var timeNow=new Date(); 
    var inmsg=message.toString();
    const pongFields=inmsg.split(",")
    var sendTime=pongFields[0];
    var msgType=pongFields[1];
    var swversion=pongFields[2];
    //TO:
    var genesisip=pongFields[3];
    var genesisport=pongFields[4];
    var genesisgeo=pongFields[5];
    //FROM:
    var srcip=pongFields[6];
    var srcport=pongFields[7];
    var srcgeo=pongFields[8];
    
    if ( remote.address==process.env.MY_IP && msgType==11 ) {  //respond to my own ping
        var msg=`${timeNow.getTime()},12,${process.env.MY_SWVERSION},${process.env.MY_IP},${process.env.MY_PORT},${process.env.MY_GEO}`; //specify GENESIS Node directly
        //console.log(`# Sending PONG (12) response to my own ping to publicIP: ${remote.address}:${process.env.MY_PORT} message=${msg}`);
        client.send(msg, genesisport, remote.address);
        return;
    } else {
//        console.log(`# pong message received remote.address=${remote.address} msgType=${msgType} genesisgeo=${genesisgeo} genesisip=${genesisip} genesisport=${genesisport} swversion=${swversion}`);
//        console.log('# '+remote.address + ' responded ' + (timeNow.getTime()-startTime.getTime()) +" ms with : "+ inmsg);
//        console.log(`# ${(timeNow.getTime()-startTime.getTime())},${genesisip},${genesisport},${genesisgeo}`);
        
        //if (remote.address==process.env.MY_IP) {
        //    console.log(`${(timeNow.getTime()-startTime.getTime())},${genesisip},${genesisport},${genesisgeo},${message},,,,SELF`);
        //} else {
            //console.log(`message=${message}`); 
            var pongMsg=message.toString().split(",");
            var DarpPong={};
            DarpPong.ts = pongMsg[0];
            DarpPong.msgType = pongMsg[1];   //12 is PONG
            DarpPong.version = pongMsg[2];
            DarpPong.IP = pongMsg[3];
            DarpPong.port = pongMsg[4];
            DarpPong.geo = pongMsg[5];
            DarpPong.bootTimestamp = pongMsg[6];
            DarpPong.publicKey = pongMsg[7];
            DarpPong.From = pongMsg[8];
            DarpPong.MYIP = pongMsg[9];
            DarpPong.MYPORT = pongMsg[10];
            //console.log(`DARPPongMsg=${JSON.stringify(DarpPong,null,2)}`);
            console.log(`${genesisip},${genesisport},${genesisgeo},${(timeNow.getTime()-startTime.getTime())},${DarpPong.MYIP}`);

            delete surplus[DarpPong.IP+","+DarpPong.port+","+DarpPong.geo+",GENESIS"];
            delete surplus[DarpPong.IP+","+DarpPong.port+","+DarpPong.geo+",MEMBER"];

            numberResponses++;
        //}
    }
    //    var response={ latency:(timeNow.getTime()-startTimestamp), srcIP:remote.address, url:inmsg };
    
    ///    responses.push(response);  //store the 
    
});

//
//      finish on timeout
//
function finish() {
    for (var s in surplus) {
        console.log(`FINISHED WITH ${s}`);
        //console.log(`${genesisip},${genesisport},${genesisgeo},${(timeNow.getTime()-startTime.getTime())},${DarpPong.MYIP}`);

    }
    process.exit(numberResponses);
}

//console.log(`testport.ts  bind... IF THIS FAILS, something (maybe docker) is using this UDP Port ${MY_PORT}...`);
setTimeout(finish,numberPings*1000)
//console.log(`# ${process.env}`);
darpPing();

