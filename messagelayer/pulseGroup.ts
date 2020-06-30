//
//  nodefactory.ts - Creatre Configuration for joining our  pulseGroup object
//
//
import {   dump, now, ts, MYIP, nth_occurrence, MYVERSION } from '../lib/lib';
import {   sendPulses, recvPulses } from './pulselayer';

const CHECK_SW_VERSION_CYCLE_TIME=15;//CHECK SW updates every 15 seconds
const NO_OWL=-99999;
const TEST=true;
const DEFAULT_SHOWPULSES = "0"

//const DEFAULT_START_STATE="SINGLESTEP";  //for single stepping through network protocol code
//const DEFAULT_START_STATE = "QUARENTINE"; //for single stepping through network protocol code
const DEFAULT_START_STATE="RUNNING"; console.log(ts()+"pulsegroup.ts(): ALL NODES START IN RUNNING Mode");
//const DEFAULT_START_STATE="SINGLESTEP"; console.log(ts()+"EXPRESS: ALL NODES START IN SINGLESTEP (no pulsing) Mode");
/****  NODE SITE CONFIGURATION  ****/

//      Environment is way for environment to control the code
if (!process.env.DARPDIR) {
   console.log("No DARPDIR enviropnmental variable specified ");
   process.env.DARPDIR = process.env.HOME + "/darp"
   console.log(`DARPDIR defaulted to " + ${process.env.DARPDIR}`);
}

if (!process.env.HOSTNAME) {
   process.env.HOSTNAME = require('os').hostname().split(".")[0].toUpperCase();
   console.log(`No HOSTNAME enviropnmental variable specified + ${process.env.HOSTNAME}`);
}

if (!process.env.PORT) {
    process.env.PORT = "65013"
    console.log(`No PORT enviropnmental variable specified - setting my DEFAULT PORT ${process.env.PORT}`);
 }
 var PORT = parseInt(process.env.PORT) || 65013; //passed into docker


if (!process.env.GENESIS) {
   process.env.GENESIS = "71.202.2.184"
   console.log(`No GENESIS enviropnmental variable specified - setting DEFAULT GENESIS and PORT to ${process.env.GENESIS}:${process.env.PORT}`);
}
const GENESIS=process.env.GENESIS;

if (!process.env.VERSION) {
   process.env.VERSION = require('fs').readFileSync('../SWVersion', {encoding:'utf8', flag:'r'}).trim();
   console.log(`No VERSION enviropnmental variable specified - setting to ${process.env.VERSION}`);
}
var VERSION=process.env.VERSION||"NoVersion";


if (!process.env.MYIP) {
   console.log("No MYIP enviropnmental variable specified - ERROR - but I will try and find an IP myself frmom incoming message");
   process.env.MYIP = process.env.GENESIS
//   MYIP();
} else process.env.MYIP = process.env.MYIP.replace(/['"]+/g, ''); //\trim string
var IP=process.env.MYIP

var PUBLICKEY = process.env.PUBLICKEY||"noPublicKey";
if (!PUBLICKEY)
   try {
       PUBLICKEY = require('fs').readFileSync('../wireguard/publickey', 'utf8');
       PUBLICKEY = PUBLICKEY.replace(/^\n|\n$/g, '');
       console.log("pulled PUBLICKEY from publickey file: >" + PUBLICKEY + "<");
   } catch (err) {
       console.log("PUBLICKEY lookup failed");
       PUBLICKEY = "deadbeef00deadbeef00deadbeef0013";
   }

var GEO = process.env.HOSTNAME||"noHostName"; //passed into docker
GEO = GEO.toUpperCase().split(".")[0].split(":")[0].split(",")[0].split("+")[0];
var WALLET = process.env.WALLET || "584e560b06717ae0d76b8067d68a2ffd34d7a390f2b2888f83bc9d15462c04b2";

//------------------------ Environmentals loaded -----------------------

//             start config/instrumentation web server
var express = require('express');
var app = express();
var server = app.listen(PORT, '0.0.0.0', function() {
    //TODO: add error handling here
    var host = server.address().address
    var port = server.address().port
    console.log("Express app listening at http://%s:%s", host, port)
}) //.on('error', console.log);
//
//
//  Making of my own pulseGroup for members to connect to
//
//

const me:MintEntry=makeMintEntry(1, GEO, PORT, IP, PUBLICKEY, VERSION, WALLET);   //All nodes can count on 'me' always being present
        //All nodes also start out ready to be a genesis node for others
const genesis:MintEntry=makeMintEntry(1, GEO, PORT, IP, PUBLICKEY, VERSION, WALLET); 
var pulse=makePulseEntry(1, GEO, GEO+".1", IP, PORT, VERSION);    //makePulseEntry(mint, geo, group, ipaddr, port, version) 

interface PulseGroup {
    groupName: string;
    groupOwner: string;
    me: MintEntry;
    genesis:MintEntry;
    mintTable:MintEntry[];
    pulses:PulseEntry[];
    rc:string;
    ts:string;
    nodeCount:number;
    nextMint:number;
    cycleTime:number;
} 

var pulseGroup = {                 //my pulseGroup Configuration
//    var pulseGroup:PulseGroup = {                 //my pulseGroup Configuration
        groupName : me.geo+".1",
    groupOwner : me.geo,
    me : me,
    genesis: genesis,
    mintTable: [
       me
    ],           
    pulses: {               //store statistics for this network segment
        [genesis.geo + ":" + genesis.geo+".1"]: pulse
    },
    rc: "",
    ts: now(), 
    nodeCount : 1,      //how many nodes in this pulsegroup
    nextMint : 2,      //assign IP. Allocate IP out of 10.10.0.<mint>
    cycleTime : 1,      //pulseGroup-wide setting: number of seconds between pulses

};
pulseGroup.me=me;
pulseGroup.genesis=genesis;
var pulseGroups={[me.geo+".1"] : pulseGroup};
pulseGroups={}; //[me.geo+".1"] : pulseGroup};
//TO ADD a PULSE: pulseGroup.pulses["newnode" + ":" + genesis.geo+".1"] = pulse;
//TO ADD A MINT: pulseGroup.mintTable[36]=me;
//pulseGroup.mintTable=genesis;

//console.log("--------------------------Starting with my own pulseGroup="+dump(pulseGroup));
//pulseGroup.addNode("MAZORE",GEO+".1","104.42.192.234",65013,PUBLICKEY,VERSION,WALLET);
//console.log("-********************** AFTER pulseGroup="+dump(pulseGroup));

//process.exit(36);
//instrument the pulseGroup
function instrumentation() {    //this should get its own file
    var txt = '<!DOCTYPE html><meta http-equiv="refresh" content="' + 30 + '">'; //TODO: dynamic refresh based on new node adds
    txt += '<head title="DARP">';

    txt += '<script> function startTime() { var today = new Date(); var h = today.getHours(); var m = today.getMinutes(); var s = today.getSeconds(); m = checkTime(m); s = checkTime(s); document.getElementById(\'txt\').innerHTML = h + ":" + m + ":" + s; var t = setTimeout(startTime, 500); } function checkTime(i) { if (i < 10) {i = "0" + i};  return i; } </script>';
    txt += '<link rel = "stylesheet" type = "text/css" href = "http://drpeering.com/noia.css" /> '
    txt += '<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js"></script>'
    txt += "<script>"
    
    txt += 'var nodeCountLastTime=0;'
    
    txt += 'function fetchState() {'
    
    txt += 'var url="http://'+me.ipaddr+":"+me.port+'/pulseGroups";';
    //txt += 'console.log("url="+url);';
   txt += 'var nodeCountLastTime=0;'
    txt += '   $.getJSON(url, function(config) {'
   txt += '         var nodeCountNow=config.nodeCount;'
   //txt += '         for (var n in config) { console.log("pulseGroup="+JSON.stringify(config[n],null,2)); console.log("pulseGroup.pulses.length="+pulseGroup.pulses.length);}'
   txt += '         console.log("config="+JSON.stringify(config,null,2)+" nodeCountNow="+nodeCountNow+" nodeCountLastTime="+nodeCountLastTime+" find nodeCount somewhere delivered config in: "+JSON.stringify(config,null,2) );'
   //txt += '         console.log("**count="+config.pulses.length+" nodeCountNow="+nodeCountNow+" nodeCountLastTime="+nodeCountLastTime+" find nodeCount somewhere delivered config in: "+JSON.stringify(config,null,2) );'
   txt += '      if ( nodeCountLastTime > 1 ) {'
   txt += '         if (nodeCountLastTime!=nodeCountNow) {'
   txt += '             console.log("NEW NODE: HERE I LOCATION RELOAD(): nodeCountNow="+nodeCountNow+" nodeCountLastTime="+nodeCountLastTime );';
   txt += '             location.reload();' ;
   txt += '         }'
   txt += '      '
   txt += '      }'
   txt += '      nodeCountLastTime=nodeCountNow;';

    //update the dateTime so people know the updates re coming in
    txt += "      var d = new Date(parseInt(config.ts)); var now=d.getTime();var timeStr=d.toString().split(' ')[4];"
    //       txt += "      var d = new Date(); var now=d.getTime();var timeStr=d.toString().split(' ')[4];"
    txt += '      $("#dateTime").html( "<div class=\'fade-out\'><h1>*Updated: " + timeStr + "</h1></div>" );' //we show this epoch


   txt += '   });';


    txt += "    setTimeout(fetchState,1000);";  
    txt += "}";
    txt += 'setTimeout(fetchState,1000);';  

    txt += '</script>';
    txt += '</head>';
    txt += '<body>';
    txt += '<h1>DARP Node '+me.geo+' @ '+me.ipaddr+":"+me.port+'</h1>';
    txt += '<p id="dateTime">Updated: '+ new Date() +' </p>'

    for (var p in pulseGroups) {
        var pulseGroup=pulseGroups[p];
            //
        //  Externalize pulse structures 
        //
        txt += '<br><h2>' + pulseGroup.groupName + ' pulseGroup' + '</h2><table>';
        txt += "<tr>";
        txt += "<th>geo</th>";
        txt += "<th>group</th>";
        txt += "<th>ipaddr</th>";
        txt += "<th>port</th>";
        txt += "<th>seq</th>";
        txt += "<th>pulseTimestamp</th>";
        txt += "<th>mint</th>";
        txt += "<th>owl</th>";
        //txt += "<th>median</th>"
        //txt+="<th>owls</th>"
        //txt += "<th>inOctets</th>";
        //txt += "<th>outOctets</th>";
        txt += "<th>inPulses</th>";
        txt += "<th>outPulses</th>";
        txt += "<th>pktDrops</th>";
        txt += "<th>pulseSz</th>";
        txt += "<th>owls</th>";
        txt += "<th>bootTimestamp</th>";
        txt += "<th>version</th>";
        txt += "<th>Wallet Balance</th>";
        txt += "</tr>";
        var total = 0; //Add up total balance of all pulses
        //console.log(ts()+"                            pulses="+dump(pulses));
        for (var a in pulseGroup.pulses) {
            var pulseEntry = pulseGroup.pulses[a];
            var mint = pulseEntry.mint;
            //console.log(ts()+"a="+a+" pulseTable[pulseEntry]"+dump(pulseEntry));
            //console.log("pulseEntry="+dump(pulseEntry));
            txt += "<tr>";
            //            txt+="<td>"+'<a href="http://' + mintEntry.ipaddr + ':' + mintEntry.port + '/" >'+mintEntry.geo+"</a></td>"
            txt += '<td class="' + pulseEntry.geo + ' ' + pulseEntry.mint + '">' + '<a href="http://' + pulseEntry.ipaddr + ':' + pulseEntry.port + '/" >' + pulseEntry.geo + '</a>' + "</td>";
            //txt+="<td>"+pulseEntry.geo+"</td>"
            txt += "<td >" + pulseEntry.group + "</td>";
            txt += "<td> " + '<a target="_blank" href="http://' + pulseEntry.ipaddr + ':' + pulseEntry.port + '/me" >' + pulseEntry.ipaddr + "</a></td>";
            txt += "<td>" + '<a target="_blank" href="http://' + pulseEntry.ipaddr + ':' + pulseEntry.port + '/state" >' + pulseEntry.port + "</a></td>";
            txt += '<td class="' + pulseEntry.geo + '_seq"' + '>' + pulseEntry.seq + "</td>";
            var deltaSeconds = Math.round((now() - pulseEntry.pulseTimestamp) / 1000) + " secs ago";
            if (pulseEntry.pulseTimestamp == 0)
                deltaSeconds = "0";
            //txt += "<td>" + now()+" "+entry.pulseTimestamp+ "</td>";
            txt += '<td class="' + pulseEntry.geo + '_pulseTimestamp"' + '>' + deltaSeconds + "</td>";
            //txt+="<td>"+pulseEntry.pulseTimestamp+"</td>"
            txt += "<td>" + pulseEntry.mint + "</td>";
            // OWL
            txt += '<td class="' + pulseEntry.geo + '_owl fade-out"' + '>' + '<a  target="_blank" href="http://' + me.ipaddr + ':' + me.port + '/graph?src=' + pulseEntry.geo + '&dst=' + me.geo + "&group=" + pulseEntry.group + '" >' + pulseEntry.owl + "</a> ms</td>";
            //txt += '<td class="'+pulseEntry.geo+'_median"'+'>' + pulseEntry.median + "</td>"
            //txt+="<td>"+pulseEntry.owls+"</td>"
            //txt += '<td class="' + pulseEntry.geo + '_inOctets"' + '>' + pulseEntry.inOctets + "</td>";
            //txt += '<td class="' + pulseEntry.geo + '_outOctets"' + '>' + pulseEntry.outOctets + "</td>";
            txt += '<td class="' + pulseEntry.geo + '_inPulses"' + '>' + pulseEntry.inPulses + "</td>";
            txt += '<td class="' + pulseEntry.geo + '_outPulses"' + '>' + pulseEntry.outPulses + "</td>";
            //var pktLoss=parseInt(pulseEntry.seq)-parseInt(pulseEntry.inMsgs);
            //console.log("pktloss=:"+pktLoss);
            if (pulseEntry.pktDrops > 1)
                txt += '<td class="' + pulseEntry.geo + '_pktDrops WARNING"' + '>' + pulseEntry.pktDrops + "</td>";
            else
                txt += '<td class="' + pulseEntry.geo + '_pktDrops "' + '>' + pulseEntry.pktDrops + "</td>";
            if (pulseEntry.lastMsg) {
                txt += "<td>" + pulseEntry.lastMsg.length + "</td>"; //pulse size
                txt += '<td class="' + pulseEntry.geo + '_owls"' + '>' + pulseEntry.owls.substring(0, 20) + "</td>";
                //txt += "<td>" + pulseEntry.lastMsg.substring(0,50) + "</td>"
            }
            else {
                txt += "<td>" + "" + "</td>";
                txt += "<td>" + "" + "</td>";
            }
            var deltaSeconds2 = Math.round((now() - pulseEntry.bootTimestamp) / 1000) + " secs ago";
            if (pulseEntry.bootTimestamp == 0)
                deltaSeconds2 = "0";
            //txt += "<td>" + now()+" "+entry.pulseTimestamp+ "</td>";
            txt += '<td class="' + pulseEntry.geo + '_bootTimestamp"' + '>' + deltaSeconds2 + "</td>";
            txt += '<td class="' + pulseEntry.geo + '_version"' + '>' + pulseEntry.version + "</td>";
            var balance = (Math.min(pulseEntry.inPulses, pulseEntry.outPulses) / (1000000 * 1000)) * .5; //GB=1000 MB @ 50 cents per
            total = total + balance;
            txt += '<td class="' + pulseEntry.geo + '_balance"' + '> $' + balance.toFixed(6) + "</td>";
            //txt+="<td>"+pulseEntry.lastMsg+"</td>"
            txt += "</tr>";
        }
        txt += '<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td>Node Total Earnings $' + total.toFixed(6) + '</td></tr>';
        txt += "</table>";
    }



    for (var p in pulseGroups) {
        var pulseGroup=pulseGroups[p];
        //
        //  Externalize mintTable 
        //
        //console.log(ts()+"config.mintTable="+dump(config.mintTable));
        txt += '<br><h2>mintTable</h2><table>';
        txt += "<tr>";
        txt += "<th>mint</th>";
        txt += "<th>geo</th>";
        txt += "<th>port</th>";
        txt += "<th>ipaddr</th>";
        txt += "<th>publickey</th>";
        txt += "<th>state</th>";
        txt += "<th>lastPulseTimestamp</th>";
        txt += "<th>lastOWL</th>";
        txt += "<th>version</th>";
        txt += "<th>wallet</th>";

        //txt+="<th>G</th>"
        //<th>rtt</th>"
        txt += "<th>CONTROLS</th>";
        txt += "<th>adminControl</th>";
        txt += "<th>bootTimestamp</th>";
        txt += "</tr>";
        //console.log(ts()+"                            mintTable="+dump(mintTable));
        for (var a in pulseGroup.mintTable) {
            var mintEntry = pulseGroup.mintTable[a];
            //console.log(ts()+"a="+a+" mintEntry"+dump(mintEntry));
            txt += "<tr>";
            //txt+="<td>"+mintEntry+"</td>"
            txt += "<td>" + mintEntry.mint + "</td>";
            txt += '<td class="' + mintEntry.state + '">' + '<a target="_blank" href="http://' + mintEntry.ipaddr + ':' + mintEntry.port + '/" >' + mintEntry.geo + "</a></td>";
            txt += "<td>" + mintEntry.port + "</td>";
            txt += "<td>" + '<a target="_blank" href="http://' + mintEntry.ipaddr + ':' + mintEntry.port + '/me" >' + mintEntry.ipaddr + "</a></td>";
            txt += "<td>" + mintEntry.publickey.substring(0, 3) + "..." + mintEntry.publickey.substring(40, mintEntry.publickey.length) + "</td>";
            txt += '<td class="' + mintEntry.geo + '_state' + ' ' + mintEntry.state + '">' + '<a target="_blank" href="http://' + mintEntry.ipaddr + ':' + mintEntry.port + '/state" >' + mintEntry.state + '</a>' + "</td>";
            //                   txt += "<td>" + '<a href="http://' + mintEntry.ipaddr + ':' + mintEntry.port + '/config" >' + mintEntry.state + '</a>' + "</td>"
            //var deltaT = Math.round((now() - mintEntry.pulseTimestamp) / 1000) + " secs ago";
            //if (mintEntry.pulseTimestamp == 0) deltaT = "0";
            //txt += '<td class="'+mintEntry.geo+'_pulseTimestamp"'+'">' + deltaT + "</td>";
            var deltaSeconds = Math.round((now() - mintEntry.lastPulseTimestamp) / 1000) + " secs ago";
            if (mintEntry.lastPulseTimestamp == 0)
                deltaSeconds = "0";
            //txt += "<td>" + now()+" "+entry.pulseTimestamp+ "</td>";
            txt += '<td class="' + mintEntry.geo + '_pulseTimestamp"' + '>' + deltaSeconds + "</td>";
            txt += '<td class="' + mintEntry.geo + '_owl fade-out"' + '>' + '<a target="_blank" href="http://' + me.ipaddr + ':' + me.port + '/graph?src=' + mintEntry.geo + '&dst=' + me.geo + "&group=" + pulseGroup.groupName + '" >' + mintEntry.lastOWL + "</a> ms</td>";
            //txt+="<td>"+mintEntry.bootTimestamp+"</td>"
            txt += "<td>" + '<a target="_blank" href="http://' + mintEntry.ipaddr + ':' + mintEntry.port + '/version" >' + mintEntry.version + "</a></td>";
            txt += "<td>" + mintEntry.wallet.substring(0, 3) + "..." + mintEntry.wallet.substring(40, mintEntry.wallet.length) + "</td>";
            //txt+="<td>"+mintEntry.SHOWPULSES+"</td>"
            //txt += "<td>" + mintEntry.owl + " ms</td>"
            //txt+="<td>"+mintEntry.isGenesisNode+"</td>"
            //            txt+="<td>"+mintEntry.rtt+"</td>"
            var stopButtonURL = "http://" + mintEntry.ipaddr + ":" + mintEntry.port + "/stop";
            var rebootButtonURL = "http://" + mintEntry.ipaddr + ":" + mintEntry.port + "/reboot";
            var reloadButtonURL = "http://" + mintEntry.ipaddr + ":" + mintEntry.port + "/reload";
            var SINGLESTEPButtonURL = "http://" + mintEntry.ipaddr + ":" + mintEntry.port + "/SINGLESTEP";
            var pulseMsgButtonURL = "http://" + mintEntry.ipaddr + ":" + mintEntry.port + "/pulseMsg";
            txt += "<td>" + '<FORM>';
            txt += '<INPUT Type="BUTTON" Value="PULSE1" Onclick="window.location.href=\'' + pulseMsgButtonURL + "'" + '">';
            txt += '<INPUT Type="BUTTON" Value="RELOAD" Onclick="window.location.href=\'' + reloadButtonURL + "'" + '">';
            txt += '<INPUT Type="BUTTON" Value="SINGLESTEP" Onclick="window.location.href=\'' + SINGLESTEPButtonURL + "'" + '">';
            txt += '<INPUT Type="BUTTON" Value="STOP" Onclick="window.location.href=\'' + stopButtonURL + "'" + '">';
            txt += '<INPUT Type="BUTTON" Value="REBOOT" Onclick="window.location.href=\'' + rebootButtonURL + "'" + '">';
            txt += '</FORM>' + "</td>";
            //if (mintEntry.adminControl)
            //    txt += "<td>" + mintEntry.adminControl + "</td>";
            //else
                txt += "<td>" + "</td>";
            //var delta = Math.round((now() - mintEntry.bootTimestamp) / 1000) + " secs ago";
            //if (pulseEntry.bootTimestamp == 0) delta = "0";
            //txt += '<td class="'+pulseEntry.geo+'_bootTimestamp"'+'">' + delta + "</td>";
            var deltaSeconds2 = Math.round((now() - mintEntry.bootTimestamp) / 1000) + " secs ago";
            if (mintEntry.bootTimestamp == 0)
                deltaSeconds2 = "0";
            //txt += "<td>" + now()+" "+entry.pulseTimestamp+ "</td>";
            txt += '<td class="' + mintEntry.geo + '_bootTimestamp"' + '>' + deltaSeconds2 + "</td>";
            txt += "</tr>";
        }
        txt += "</table>";


    }









    
    
    
    
    
    txt += ""
    txt += JSON.stringify(pulseGroups,null,2);
    
    txt += "</body>";
    txt += "</html>"
    //console.log("txt="+txt);
    return txt;
}

app.get('/', function(req, res) {

    //console.log("********************** fetching '/'");
    //handleShowState(req, res); 
    res.setHeader('Content-Type', 'text/html');
    res.setHeader("Access-Control-Allow-Origin", "*");

    res.end(instrumentation());
    return
});

app.get('/version', function(req, res) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.end(JSON.stringify(me.version));
        return;
 });
 
 app.get('/stop', function(req, res) {
    //console.log("EXPRess fetching '/state' state");
    console.log("EXITTING and Stopping the node");
    res.redirect(req.get('referer'));
    process.exit(86);
});
 
 app.get('/reboot', function(req, res) {
    //console.log("EXPRess fetching '/state' state");
    console.log("/reboot: THIS SHOULD KICK YOU OUT OF DOCKER");
    res.redirect(req.get('referer'));
    process.exit(99999) 
 });
 
 app.get('/reload', function(req, res) {
    //console.log("EXPRess fetching '/state' state");
    console.log("EXITTING to reload the system")
    res.redirect(req.get('referer'));
    process.exit(36);
 });

 app.get('/asset-manifest.json', function (req, res) {
    //console.log("EXPRess fetching '/state' state");
    //console.log("app.get('/state' callback config="+dump(config));
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(JSON.stringify({}, null, 2));
    return;
});

//
//  this API should be the heart of the project - request a pulseGroup configuration for yourself (w/paramters), 
//  or update your specific pulseGroup to the group owner's 
//
app.get('/pulseGroup/:pulsegroup', function(req, res) {
    //console.log("fetching '/pulseGroup' &pulsegroup="+req.params.pulsegroup);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");

    //
    //  pulseGroup 
    //
    if (typeof req.params.pulsegroup != "undefined") { 
        //console.log("/pulseGroup/:pulsegroup pulseGroup specified");
        for (var pulseGroup in pulseGroups) {
            //console.log("req.params.pulsegroup="+req.params.pulsegroup+" pulseGroups[pulseGroup].groupName="+pulseGroups[pulseGroup].groupName);
            if (pulseGroups[pulseGroup].groupName==req.params.pulsegroup) {
                res.end(JSON.stringify(pulseGroups[pulseGroup], null, 2));
                return; //we sent the more specific
            }
        }
        //console.log("/pulseGroup/:pulsegroup returning pulseGroup specified "+req.params.pulsegroup);
        res.end(JSON.stringify(null));
    }
    else    
        console.log("No pulseGroup specified");
        res.end(JSON.stringify(pulseGroups, null, 2));
    return
});
app.get('/pulseGroups', function(req, res) {
    //console.log("fetching '/pulseGroups' ");
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(JSON.stringify(pulseGroups, null, 2));
});

//// nodeFactory
//       Configuration for node - allocate a mint
//
app.get('/nodefactory', function(req, res) {
    //console.log(ts() + "NODEFACTORY");

    //
    //  additional nodes adding to pulseGroup
    //
    console.log('EXPRESS nodeFactory: config requested with params: ' + dump(req.query));

    //
    //  Marshall incoming parameters
    //  

    //console.log("EXPRESS geo="+req.query.geo+" publickey="+req.query.publickey+" query="+JSON.stringify(req.query,null,2)+" port="+req.query.port+" wallet="+req.query.wallet+" version="+req.query.version);
    //marshall variables
    var geo = req.query.geo;
    var publickey = req.query.publickey;
    var port = req.query.port || 65013;
    var wallet = req.query.wallet || "";
    var incomingTimestamp = req.query.ts;
    if (typeof incomingTimestamp == "undefined") {
        console.log("/nodeFactory called with no timestamp");
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            "rc": "-1 nodeFactory called with no timestamp. "
        }));
        return;
    }

    var incomingIP = req.query.myip;                // for now we believe the node's IP
    var octetCount = incomingIP.split(".").length;  //but validate as IP, not error msg
    if (octetCount != 4) incomingIP="noMYIP";

    var clientIncomingIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (incomingIP == "noMYIP") incomingIP = clientIncomingIP;
    if (typeof incomingIP == "undefined")
        return console.log(ts() + "***********************ERROR: incomingIP unavailable from geo=" + geo + " incomingIP=" + incomingIP + " clientIncomingIP=" + clientIncomingIP);;
    console.log("incomingIP="+incomingIP+" clientIncomingIP="+clientIncomingIP+" req.myip="+req.query.myip);

    function filter(incomingIP:string) {
        //here we filter (ignore) incoming IPs with global blacklist/whitelist
    }

    //console.log("req="+dump(req));
    var version = req.query.version;
    //console.log("EXPRESS /nodefactory geo="+geo+" publickey="+publickey+" port="+port+" wallet="+wallet+" incomingIP="+incomingIP+" version="+version);
    //console.log("req="+dump(req.connection));
    //var newNode=pulseGroup.addNode( geo, GEO+".1", incomingIP, port,publickey, version, wallet); //add new node and pulse entry to group
    
//
//  Handle Geneis Node case - first to start up
//

    if (me.ipaddr==incomingIP) {         //GENESIS NODE instantiating itself - don't need to add anything
        console.log("...........................GENESIS NODE CONFIGURED FINISHED configured...........");
        console.log("...........................GENESIS NODE CONFIGURED FINISHED configured...........");
        console.log("...........................GENESIS NODE CONFIGURED FINISHED configured...........");
        console.log("...........................GENESIS NODE CONFIGURED FINISHED configured...........");
        console.log("...........................GENESIS NODE CONFIGURED FINISHED configured...........");
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(pulseGroup)); 
        return;
    }

//
//  Or - Handle pulseGroup member case
//

    console.log("........................ SETTING UP NON-GENESIS PULSE NODE ...................");
    console.log("........................ SETTING UP NON-GENESIS PULSE NODE ...................");
    console.log("........................ SETTING UP NON-GENESIS PULSE NODE ...................");
    console.log("........................ SETTING UP NON-GENESIS PULSE NODE ...................");
    console.log("........................ SETTING UP NON-GENESIS PULSE NODE ...................");

    //
    //  Add pulseGroup mintEntry and pulseEntry and Clone ourselves as the new pulsegroup
    //
    var newMint=pulseGroup.nextMint++;
    console.log(geo+": mint="+newMint+" publickey="+publickey+"version="+version+"wallet="+wallet);
    pulseGroup.pulses[geo + ":" + pulseGroup.groupName] = makePulseEntry(newMint, geo, pulseGroup.groupName, incomingIP, port, VERSION);
    //console.log("Added pulse: "+geo + ":" + group+"="+dump(pulseGroup.pulses[geo + ":" + group]));
    var newNode=makeMintEntry(newMint, geo, port, incomingIP, publickey, version, wallet);
    pulseGroup.mintTable.push(newNode);  //put new node in the mint table
    console.log(`added mint# ${newMint} = ${newNode.geo}:${newNode.ipaddr}:${newNode.port}:${newMint} to ${pulseGroup.groupName}`);
    //console.log("After adding node, pulseGroup="+dump(pulseGroup));
    pulseGroup.nodeCount++;
    //TODO: check for duplicates - search for ipaddr:port that matches

    //console.log("BeforeCloning, pulseGroup="+dump(pulseGroup));

    //function makeMintEntry(mint:number, geo:string, port:number, incomingIP:string, publickey:string, version:string, wallet:string):MintEntry {
    
    //make a copy of the pulseGroup for the new node and set its passed-in startup variables
    let newNodePulseGroup = JSON.parse(JSON.stringify(pulseGroup));    //clone my pulseGroup obecjt 
    newNodePulseGroup.me=newNode;

    //newNodePulseGroup.mintTable.shift();  //get rid of groupOwner mint[0]
    //newNodePulseGroup.mintTable[0]=newNode;
    //wbnwbnwbn - Here we modify our pulseGroup to be fitted for remote.
    //  this means mintTable[0]  

    console.log("********************************* newNodePulseGroup=");
    console.log("********************************* newNodePulseGroup=");
    console.log("********************************* newNodePulseGroup=");
    console.log("********************************* newNodePulseGroup=");
    console.log("********************************* newNodePulseGroup="+dump(newNodePulseGroup));

    //
    //                              pulseNode MEMBER NODE
    //

    console.log(ts() + "nodefactory configuring new node publickey=" + publickey + " me.publickey=" + me.publickey);
    console.log(ts() + "nodefactory: Received connection from " + geo + "(" + incomingIP + ")");
    console.log(ts() + "nodeFactory sending newNodeConfig =" + dump(newNodePulseGroup));
    
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(newNodePulseGroup)); //send mint:0 mint:1 *mint:N groupEntry *entryN
    //console.log("After Cloning and delivery of member config, my genesis pulseGroup="+dump(pulseGroup));
//    pulseGroups=[pulseGroup];
    var pulseGroups={[me.geo+".1"] : pulseGroup};

});

 interface MintEntry {
    mint: number;
    geo: string;
    port: number;
    ipaddr:string;
    publickey:string;
    state:string;
    bootTimestamp:number;
    version:string;
    wallet:string;
    lastPulseTimestamp:number;
    lastOWL:number;
} 
 function makeMintEntry(mint:number, geo:string, port:number, incomingIP:string, publickey:string, version:string, wallet:string):MintEntry {
    return { //mint:0 is always "me"
        mint: mint, //mint:1 is always genesis node
        geo: geo,
        // wireguard configuration details
        port: port,
        ipaddr: incomingIP,     //set by genesis node on connection
        publickey: publickey,
        state: DEFAULT_START_STATE,
        bootTimestamp: now(), //RemoteClock on startup  ****
        version: version,   //software version running on remote system ********
        wallet: wallet,     // ** 
        lastPulseTimestamp:0,
        lastOWL:NO_OWL
    }
 }

 //function addMintEntry() {
 //    var mintEntry=mint:number, geo:string, port:number, incomingIP:string, publickey:string, version:string, wallet:string
 //}
 
 interface PulseEntry {
    outgoingTimestamp:number;   //from message layer
    pulseTimestamp:number;      //from message layer

    mint: number;               //
    geo: string;
    group: string;
    ipaddr:string;
    port: number;
    seq: number;
    owl:number;
    owls:string;

    bootTimestamp:number;
    version:string;
    inPulses:number;
    outPulses:number;
    pktDrops:number;
    lastMsg:string;
} 
 //
 //  pulseEntry - contains stats for and relevent fields to configure wireguard
 //
 function makePulseEntry(mint:number, geo:string, group:string, ipaddr:string, port:number, version:string):PulseEntry {
    return { //one record per pulse - index = <geo>:<group>
        mint: mint, //Genesis node would send this 
        geo: geo, //record index (key) is <geo>:<genesisGroup>
        group: group, //DEVPOS:DEVOP.1 for genesis node start
        ipaddr: ipaddr, //DEVPOS:DEVOP.1 for genesis node start
        port: port, //DEVPOS:DEVOP.1 for genesis node start
        seq: 1, //last sequence number heard
        owl: NO_OWL,     //delete this when pulseTimestamp is >2 secs old
        pulseTimestamp:0,
        owls: "1", //Startup - I am the only one here
        // stats
        bootTimestamp: now(), //RemoteClock on startup  **** - we abandon the pulse when this changes
        version: version, //software version running on sender's node    
        //
        inPulses: 0,
        outPulses: 0,
        pktDrops:0,  
        lastMsg: "",
        outgoingTimestamp: 0  //sender's timestamp on send
    }
 }

//
//      get conmfiguration from the genesis node
//
var url=encodeURI("http://"+process.env.GENESIS+":"+process.env.PORT+"/nodefactory?geo="+GEO+"&port="+PORT+"&publickey="+PUBLICKEY+"&version="+VERSION+"&wallet="+WALLET+"&myip="+process.env.MYIP+"&ts="+now());
console.log("getting pulseGroup from url="+url);

//var hostname=process.env.HOSTNAME||"noHostName"
//var geo=hostname.split(".")[0].toUpperCase();
//var port=process.env.PORT||"65013";
//
//  getPulseGroup() - 
//
function joinPulseGroup(ipaddr:string,port:number,callback) {
    console.log(`getPulseGroup(): ipaddr=${ipaddr}:${port}`);
    const http=require('http'); 
    var req = http.get(url, function (res) {
        var data = '', json_data;
        res.on('data', function (stream) {
            data += stream;
        });
        res.on('error', function() {
            console.log(ts()+"getPulseGroup(): received error from "+URL);
            process.exit(36); 
        })

        res.on('end', function () {
            //console.log("********* *******           data="+data);
            var newPulseGroup = JSON.parse(data);            
            console.log("getPulseGroup(): from node factory:"+dump(newPulseGroup));

            if (newPulseGroup.me.publickey==PUBLICKEY) {
                console.log(ts()+"getPulseGroup(): GENESIS node already configured ");
                //*********** GENESIS NODE CONFIGURED **********/
                //pulseGroups=[newPulseGroup];
                callback(newPulseGroup);            
                return;
            } 
            console.log(ts()+"getPulseGroup(): Configuring non-genesis node ... ");

            callback(newPulseGroup);            
            console.log("getPulseGroup():- call setWireguard to generate wireguard config for me and genesis node:");
    //        setWireguard(); //set up initial wireguard comfig
        });
    });
    //console.log("http fetch done");
}

//
//
//



/***************** TEST AREA ****************/
if (TEST) {
    //console.log("* * * * * * * * * Starting  pulseGroup="+dump(pulseGroup));

    joinPulseGroup(GENESIS, PORT, function (newPulseGroup) {
//    joinPulseGroup("71.202.2.184","65013", function (newPulseGroup) {
       console.log("callback from my or someone else's pulseGroup="+dump(newPulseGroup));

       //
       //       attach convenience routines to the downloaded pulseGroup assignment
       //
       newPulseGroup.forEachNode = function(callback) {for (var node in this.pulses) callback(node,this.pulses[node]);};
       newPulseGroup.forEachMint = function(callback) {for (var mint in this.mintTable) callback(mint,this.mintTable[mint]);};
       newPulseGroup.addNode = function(geo:string,group:string,ipaddr:string,port:number, publickey:string, version:string, wallet:string):MintEntry {
           var newMint=newPulseGroup.nextMint++;
           //console.log("AddNode(): "+geo+":"+group+" as "+ipaddr+"_"+port+" mint="+newMint+" publickey="+publickey+"version="+version+"wallet="+wallet);
           //TO ADD a PULSE: 
           this.pulses[geo + ":" + group] = makePulseEntry(newMint, geo, group, ipaddr, port, VERSION);
           //console.log("Added pulse: "+geo + ":" + group+"="+dump(pulseGroup.pulses[geo + ":" + group]));
           //TO ADD A MINT:
           var newNode=makeMintEntry(newMint, geo, port, ipaddr, publickey, version, wallet);
           this.mintTable[newMint] = newNode;
           //console.log(`addNode() adding mint# ${newMint} = ${geo}:${ipaddr}:${port}:${newMint} added to ${group}`);
           //console.log("After adding node, pulseGroup="+dump(pulseGroup));
           newPulseGroup.nodeCount++;
           return this.mintTable[newMint];
       };
       newPulseGroup.deleteNode = function(geo:string,group:string,ipaddr:string,port:number,mint:number) {
           delete this.pulses[geo + ":" + group];
           delete this.mintTable[mint];
       };
       //pulseGroup.pulse = function() {

        newPulseGroup.pulse=function() {
            var ipary:string[]=[], owls="";
            newPulseGroup.forEachNode(function(index:string,nodeEntry:PulseEntry) {
                ipary.push(nodeEntry.ipaddr+"_"+ nodeEntry.port);
                nodeEntry.outPulses++;
                
                if ( nodeEntry.owl == NO_OWL) owls+=nodeEntry.mint+",";
                else {
                    //if pulseTimestamp within a second (POLLING CYCLE)
                    owls+=nodeEntry.mint+"="+nodeEntry.owl+","
                }
            });
            owls=owls.replace(/,+$/, ""); //remove trailing comma 
            var myEntry=newPulseGroup.pulses[GEO+":"+newPulseGroup.groupName];
            var pulseMessage="0,"+VERSION+","+GEO+","+newPulseGroup.groupName+","+ (myEntry.seq++) +","+newPulseGroup.mintTable[0].bootTimestamp+","+myEntry.mint+","+owls;
            //console.log("pulseGroup.pulse(): pulseMessage="+pulseMessage+" to "+dump(ipary));  //INSTRUMENTATION POINT
            sendPulses(pulseMessage,ipary);

            setTimeout(newPulseGroup.pulse,newPulseGroup. cycleTime*1000);
            //var timeToNextSecond=now()%1000;  //REALLY WANT TO TRY AND CONTROL SELF TO END ON 1 SECOND BOUNDARIES
            //setTimeout(newPulseGroup.pulse,newPulseGroup. timeToNextSecond);
        };

        newPulseGroup.getMint=function(mint:number):MintEntry|null {
            for (var m in this.mintTable) {
                if (this.mintTable[m].mint==mint) return this.mintTable[m];
            }
            return null;
        };

        newPulseGroup.timeout=function() {
            for (var m in this.mintTable) {
                if (now()-this.mintTable[m].lastPulseTimestamp>15*1000) {
                    console.log("Timing out mint entry"+this.mintTable[m].geo);
                    delete this.mintTable[m];
                }
            }
            for (var p in this.pulses) {
                if (now()-this.pulses[p].pulseTimestamp> 5*1000) {
                    console.log("Timingout pulse entry"+this.pulses[p].geo);
                    delete this.pulses[p];
                }
            }
        }


        newPulseGroup.checkSWversion=function () {
            console.log("=================================> checkSWversion()");

            if (newPulseGroup.groupOwner==me.geo) 
                return console.log("checkSWversion - genesis node never checks its own version");
            const url = "http://" + genesis.ipaddr + ":" + genesis.port + "/version?ts="+now();  //add garbage to avoid caches
            console.log("checkSWversion(): url="+url);
            var http = require("http");
            http.get(url, res => {
                res.setEncoding("utf8");
                let body = "";

                res.on("data", data => {
                    body += data;
                });

                res.on('error', function(error) {
                    console.log("HANDLEPULSE: checkSWversion CAN'T REACH GENESIS NODE"); // Error handling here never triggered TODO
                });

                res.on("end", () => {
                    var version = JSON.parse(body);
                    var currentSWversion='"'+MYVERSION()+'"'; //find the Build.*
                    console.log(ts()+"checkSWversion(): "+" genesis SWversion=="+dump(version)+" currentSW="+currentSWversion);
                    if (version != me.version) {
                        console.log(ts() + "checkSWversion(): NEW SOFTWARE AVAILABLE - GroupOwner said " + version + " we are running " + currentSWversion + " .......process exitting");
                        process.exit(36); //SOFTWARE RELOAD
                    }
                });
            });
            setTimeout(newPulseGroup.checkSWversion,CHECK_SW_VERSION_CYCLE_TIME*1000);  //Every 60 seconds check we have the best software
        };

        newPulseGroup.recvPulses=function (){
            recvPulses(me.port,function(incomingPulse:PulseEntry) {
                //console.log("----------> recvPulses incomingPulse="+dump(incomingPulse));//+" newPulseGroup="+dump(newPulseGroup));
                //console.log("myPulseGroup="+dump(pulseGroup));
                var myPulseEntry=pulseGroup.pulses[incomingPulse.geo+":"+incomingPulse.group];
                var mintEntry=newPulseGroup.getMint(incomingPulse.mint);    // look up the pulse claimed mint
                //console.log(`associated ${incomingPulse.mint} mintEntry=`+dump(mintEntry));

                //console.log(`My pulseEntry for ${incomingPulse.geo}:${incomingPulse.group}=`+dump(myPulseEntry));
                if (typeof myPulseEntry == "undefined" || myPulseEntry==null) {  //If we don't have this pulseEntry yet

                    if (mintEntry!=null && (mintEntry.geo==incomingPulse.geo)) {  //we found mint and matches incoming geo - should we check incomingIP also? We can.
                        //console.log("recvPulses - adding entry cause I found s mint for this node: "+incomingPulse.geo+":"+incomingPulse.group);
                        //TODO: Explore this - we should not need to do this. New Mint leads to genesisSync
/* wbnwbn */            myPulseEntry=newPulseGroup.pulses[incomingPulse.geo+":"+incomingPulse.group]=makePulseEntry(incomingPulse.mint, incomingPulse.geo, incomingPulse.group, incomingPulse.ipaddr, incomingPulse.port, incomingPulse.version); 
                    }
                }

                //console.log("My pulseEntry for this pulse="+dump(myPulseEntry));
                if (myPulseEntry!=null) {     
                    //copy incoming pulse into my pulse record
                    myPulseEntry.inPulses++;
                    myPulseEntry.lastMsg=incomingPulse.lastMsg;
                    myPulseEntry.pulseTimestamp=incomingPulse.pulseTimestamp;
                    myPulseEntry.owl=incomingPulse.owl;
                    myPulseEntry.owls=incomingPulse.owls;
 
                    //update mint entry
                    mintEntry.lastPulseTimestamp=myPulseEntry.pulseTimestamp;
                    mintEntry.lastOWL=myPulseEntry.owl;
                    
                    //console.log("owls="+pulseEntry.owls);
                    if (myPulseEntry.mint==1) {             //if pulseGroup owner, make sure I have all of his mints
                        //console.log("recvPulse handling owner's pulse and managing population to match his");                            
                        //console.log(`CHECKING SOFTWARE VERSION: My build=(${me.version} vs groupOwner: ${incomingPulse.version}).`);

                        if (incomingPulse.version != me.version) {
                            console.log(`Group Owner has newer software than we do (${me.version} vs ${incomingPulse.version}). QUit, Rejoin, and reload new SW`);
                            console.log(`Group Owner has newer software than we do (${me.version} vs ${incomingPulse.version}). QUit, Rejoin, and reload new SW`);
                            console.log(`Group Owner has newer software than we do (${me.version} vs ${incomingPulse.version}). QUit, Rejoin, and reload new SW`);
                            console.log(`Group Owner has newer software than we do (${me.version} vs ${incomingPulse.version}). QUit, Rejoin, and reload new SW`);
                            console.log(`Group Owner has newer software than we do (${me.version} vs ${incomingPulse.version}). QUit, Rejoin, and reload new SW`);
                            process.exit(36); //SOFTWARE RELOAD and RECONNECT
                        }
                        var ary=myPulseEntry.owls.split(",");
                        for(var owlEntry in ary) {
                            //console.log("PROCESSING GROUP OWNER owls="+myPulseEntry.owls+" ary[ownEntry]="+ary[owlEntry]);
                            var m=ary[owlEntry].split("=")[0];
                            //console.log("Searching for mint "+m);
                            if (newPulseGroup.getMint(m) == null) {
                                console.log("Owner announced a NEW MINT ENTRY - syncing with genesis node for config");
                                return newPulseGroup.syncGenesisPulseGroup();
                            }
                        }
                        //console.log("recvPulses - group owner population is in tact");
                    }
                } else {
                    console.log("Received pulse but could not find a matching pulseRecord for it. Ignoring until group owner sends us a new mintTable entry for: "+incomingPulse.geo);

                    //newPulseGroup.fetchMintTable();  //this should be done only when group owner sends a pulse with mint we havn't seen
                                                    //maybe also add empty pulse records for each that don't have a pulse record
                }

            });
        };

        //
        //syncGenesisPulseGroup-sync this pulseGorup object with genesis node pulseGroup object
        //  copy mint table and update (add/del) pulseObject pulse entries so we match the genesis node
        //
        newPulseGroup.syncGenesisPulseGroup=function () {   //fetch mintTable and pulses from genesis node
            console.log("syncGenesisPulseGroup()");
            var http = require("http");
            var url = "http://" + newPulseGroup.genesis.ipaddr + ":" + newPulseGroup.genesis.port + "/pulseGroup"+"/"+this.groupName;
            var thisGroup=this.groupName;
            console.log("syncGenesisPulseGroup(): url="+url);
            http.get(url, function (res) {
                res.setEncoding("utf8");
                var body = "";
                res.on("data", function (data) {
                    body += data;
                });
                res.on("end", function () {
                    var groupOwnerPulseGroup = JSON.parse(body);
                    console.log("genesis node gave us this: "+dump(groupOwnerPulseGroup));
                    
                    var mintTable = groupOwnerPulseGroup.mintTable;
                    console.log("groupName="+dump(groupOwnerPulseGroup.groupName));
                    console.log("mintTable="+dump(mintTable));

                    if (mintTable == null) {
                        console.log("syncGenesisPulseGroup(): Genesis node has no mintTable");
                    } else {
                        newPulseGroup.mintTable=mintTable;
                        var pulses=groupOwnerPulseGroup.pulses;
                        for (var pulse in pulses) {             //Add all mints that we don't have
                            var genesisPulseEntry=pulses[pulse];
                            if (typeof newPulseGroup.pulses[pulse] == "undefined") {
                                console.log("syncGenesisPulseGroup(): Adding new pulse entry as my own: "+pulse);
                                newPulseGroup.pulses[pulse]=pulses[pulse];  //save our new pulse entry
                            }
                        }
                        for (var pulse in newPulseGroup.pulses) {  //Delete all node we have that the group owner does not
                            var myPulseEntry=newPulseGroup.pulses[pulse];
                            if (typeof pulses[pulse] == "undefined") {
                                console.log("syncGenesisPulseGroup(): Removing pulse entry that genesis node does not have: "+pulse);
                                newPulseGroup.pulses[pulse]=pulses[pulse];  //save our new pulse entry
                            }
                        }
                        newPulseGroup.nodeCount=0;
                        for (var pulse in newPulseGroup.pulses) { newPulseGroup.nodeCount++ }
                        console.log("* * * * * * *  * * * * * * * * * * * * *  * SETTING wbnwbnwbn nodeCount to = "+pulseGroup.pulses.length);
                        console.log("* * * * * * *  * * * * * * * * * * * * *  * NEW pulseGroup = "+dump(pulseGroup));

                    }
                    
                });
            });
        };
        //
        // TODO: assign a mew and genesis convenience reference as part of pulseGroup
        //newPulseGroup.me=newPulseGroup.getMint(newPulseGroup.whoami);newPulseGroup.genesis=newPulseGroup.getMint(1);

  /*      pulseGroup.addNode("MAZORE",GEO+".1","104.42.192.234",65013,PUBLICKEY,VERSION,WALLET);        
        pulseGroup.addNode("MAZDAL",GEO+".1","23.102.167.37", 65013,PUBLICKEY,VERSION,WALLET);
        pulseGroup.addNode("MAZASH",GEO+".1","52.251.39.60",  65013,PUBLICKEY,VERSION,WALLET);
        pulseGroup.addNode("MAZCHI",GEO+".1","157.55.208.35", 65013,PUBLICKEY,VERSION,WALLET);
        pulseGroup.addNode("MAZPAR",GEO+".1","40.89.168.131", 65013,PUBLICKEY,VERSION,WALLET);
        pulseGroup.addNode("MAZLON",GEO+".1","51.105.5.246",  65013,PUBLICKEY,VERSION,WALLET);
        pulseGroup.addNode("MAZAMS",GEO+".1","13.73.182.162", 65013,PUBLICKEY,VERSION,WALLET);
        pulseGroup.addNode("MAZIND",GEO+".1","104.211.95.109",65013,PUBLICKEY,VERSION,WALLET);
       pulseGroup.addNode("MAZCAP",GEO+".1","40.127.4.79",   65013,PUBLICKEY,VERSION,WALLET);
        pulseGroup.addNode("MAZSYD",GEO+".1","52.187.248.162",65013,PUBLICKEY,VERSION,WALLET);
    /* */    
        console.log("===* * * * * * * * * * * * * * * * * * DARP NODE STARTED: pulseGroup="+dump(newPulseGroup));
//        pulseGroup.forEachNode(function(index:string,node:PulseEntry){console.log("pulseNode: "+index+" node="+dump(node));});
//        pulseGroup.forEachMint(function(index:string,mint:MintEntry){console.log("MINT:"+index+" mint="+dump(mint));});
        //console.log("pulseGroup="+dump(pulseGroup));
        console.log("Starting pulseGroup "+newPulseGroup.groupName);
        newPulseGroup.recvPulses();
        newPulseGroup.pulse();

        //if (!pulseGroup.isGenesisNode) pulseGroups.push(newPulseGroup);
        //if (!pulseGroup.isGenesisNode) pulseGroups.push(newPulseGroup);
        //else
        pulseGroup=newPulseGroup; 
        pulseGroups[newPulseGroup.groupName]=newPulseGroup;  //for now genesis node has no others
        setTimeout(newPulseGroup.checkSWversion,5*1000);  //check that we have the best software

    });
}
//----------------- sender 

/***************** TEST AREA ****************/