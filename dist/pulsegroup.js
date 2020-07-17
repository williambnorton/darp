"use strict";
/** @module pulsegroup Create Configuration for joining our pulseGroup object */
exports.__esModule = true;
var lib_1 = require("./lib");
var pulselayer_1 = require("./pulselayer");
var grapher_1 = require("./grapher");
var express = require("express");
var http = require("http");
var fs = require("fs");
var os = require("os");
// Define constants
var CHECK_SW_VERSION_CYCLE_TIME = 15; //CHECK SW updates every 15 seconds
var NO_OWL = -99999;
var REFRESH = 120; //Every 2 minutes force refresh
var OWLS_DISPLAYED = 30;
// const TEST=true;
// const DEFAULT_SHOWPULSES = "0"
// const DEVIATION_THRESHOLD=20;  //Threshold to flag a matrix cell as "interesting", exceeding this percentage from median
// const DEFAULT_START_STATE="SINGLESTEP";  //for single stepping through network protocol code
// const DEFAULT_START_STATE = "QUARANTINE"; //for single stepping through network protocol code
var DEFAULT_START_STATE = "NR";
console.log(lib_1.ts() + "pulsegroup.ts(): ALL NODES START IN " + DEFAULT_START_STATE + " Mode");
//const DEFAULT_START_STATE="SINGLESTEP"; console.log(ts()+"EXPRESS: ALL NODES START IN SINGLESTEP (no pulsing) Mode");
// Load environment variables
if (!process.env.DARPDIR) {
    console.log("No DARPDIR enviropnmental variable specified ");
    process.env.DARPDIR = process.env.HOME + "/darp";
    console.log("DARPDIR defaulted to \" + " + process.env.DARPDIR);
}
if (!process.env.HOSTNAME) {
    process.env.HOSTNAME = os.hostname().split(".")[0].toUpperCase();
    console.log("No HOSTNAME enviropnmental variable specified + " + process.env.HOSTNAME);
}
if (!process.env.PORT) {
    process.env.PORT = "65013";
    console.log("No PORT enviropnmental variable specified - setting my DEFAULT PORT " + process.env.PORT);
}
var PORT = parseInt(process.env.PORT) || 65013; //passed into docker
if (!process.env.GENESIS) {
    process.env.GENESIS = "71.202.2.184";
    console.log("No GENESIS enviropnmental variable specified - setting DEFAULT GENESIS and PORT to " + process.env.GENESIS + ":" + process.env.PORT);
}
var GENESIS = process.env.GENESIS;
if (!process.env.VERSION) {
    process.env.VERSION = fs.readFileSync('./SWVersion', { encoding: 'utf8', flag: 'r' }).trim();
    console.log("No VERSION enviropnmental variable specified - setting to " + process.env.VERSION);
}
var VERSION = process.env.VERSION || "NoVersion";
if (!process.env.MYIP) {
    console.log("No MYIP enviropnmental variable specified - ERROR - but I will try and find an IP myself frmom incoming message");
    process.env.MYIP = process.env.GENESIS; // MYIP();
}
else {
    process.env.MYIP = process.env.MYIP.replace(/['"]+/g, ''); //\trim string
}
var IP = process.env.MYIP;
var PUBLICKEY = process.env.PUBLICKEY || "noPublicKey";
if (!PUBLICKEY)
    try {
        PUBLICKEY = fs.readFileSync('../wireguard/publickey', 'utf8');
        PUBLICKEY = PUBLICKEY.replace(/^\n|\n$/g, '');
        console.log("pulled PUBLICKEY from publickey file: >" + PUBLICKEY + "<");
    }
    catch (err) {
        console.log("PUBLICKEY lookup failed");
        PUBLICKEY = "deadbeef00deadbeef00deadbeef0013";
    }
var GEO = process.env.HOSTNAME || "noHostName"; //passed into docker
GEO = GEO.toUpperCase().split(".")[0].split(":")[0].split(",")[0].split("+")[0];
var WALLET = process.env.WALLET || "584e560b06717ae0d76b8067d68a2ffd34d7a390f2b2888f83bc9d15462c04b2";
// Start config/instrumentaton web server
var app = express();
var server = app.listen(PORT, '0.0.0.0', function () {
    //TODO: add error handling here
    var serverAdddress = server.address();
    if (typeof serverAdddress !== 'string' && serverAdddress !== null) {
        var host = serverAdddress.address;
        var port = serverAdddress.port;
        console.log("Express app listening at http://%s:%s", host, port);
    }
    else {
        console.log("Express app initialization failed");
    }
}); //.on('error', console.log);
;
var MintEntry = /** @class */ (function () {
    function MintEntry(mint, geo, port, incomingIP, publickey, version, wallet) {
        this.mint = mint;
        this.geo = geo;
        this.port = port;
        this.ipaddr = incomingIP; //set by genesis node on connection
        this.publickey = publickey;
        this.state = DEFAULT_START_STATE; // this.state = mint==0 ? DEFAULT_START_STATE : "me";
        this.bootTimestamp = lib_1.now(); //RemoteClock on startup  ****
        this.version = version; //software version running on remote system ********
        this.wallet = wallet; // **
        this.lastPulseTimestamp = 0; //for timing out and validating lastOWL
        this.lastOWL = NO_OWL; //most recent OWL measurement
    }
    ;
    return MintEntry;
}());
;
;
var IncomingPulse = /** @class */ (function () {
    function IncomingPulse(pulseTimestamp, outgoingTimestamp, msgType, version, geo, group, seq, bootTimestamp, mint, owls, owl, lastMsg) {
        this.pulseTimestamp = pulseTimestamp;
        this.outgoingTimestamp = outgoingTimestamp;
        this.msgType = msgType;
        this.version = version,
            this.geo = geo;
        this.group = group;
        this.seq = seq;
        this.bootTimestamp = bootTimestamp; //if genesis node reboots --> all node reload SW too
        this.mint = mint;
        this.owls = owls;
        this.owl = owl;
        this.lastMsg = lastMsg;
    }
    ;
    return IncomingPulse;
}());
;
;
var PulseEntry = /** @class */ (function () {
    function PulseEntry(mint, geo, group, ipaddr, port, version) {
        this.mint = mint;
        this.geo = geo;
        this.group = group;
        this.ipaddr = ipaddr;
        this.port = port;
        this.seq = 1;
        this.owl = NO_OWL;
        this.pulseTimestamp = 0;
        this.owls = "1"; //Startup - I am the only one here
        this.history = [];
        this.medianHistory = [];
        this.bootTimestamp = lib_1.now(); //RemoteClock on startup  **** - we abandon the pulse when this changes
        this.version = version, //software version running on sender's node    
            //
            this.inPulses = 0;
        this.outPulses = 0;
        this.pktDrops = 0;
        this.lastMsg = "";
        this.outgoingTimestamp = 0; //sender's timestamp on send
    }
    ;
    return PulseEntry;
}());
;
;
var PulseGroup = /** @class */ (function () {
    function PulseGroup(me, genesis, pulse) {
        var _a;
        this.groupName = me.geo + ".1";
        this.groupOwner = me.geo;
        this.mintTable = [me, genesis]; // Simplification: me should always be mintTable[0], genesis node should always be mintTable[1]
        //pulseGroup.me and pulseGroup.genesis should be there for convenience though
        //this.pulseGroup.me = me;
        //this.pulseGroup.genesis = genesis;
        this.pulses = (_a = {},
            _a[genesis.geo + ":" + genesis.geo + ".1"] = pulse,
            _a); //store statistics for this network segment
        this.rc = "",
            this.ts = lib_1.now(),
            this.nodeCount = 1, //how many nodes in this pulsegroup
            this.nextMint = 2, //assign IP. Allocate IP out of 10.10.0.<mint>
            this.cycleTime = 1, //pulseGroup-wide setting: number of seconds between pulses
            this.matrix = [],
            this.csvMatrix = [];
    }
    ;
    return PulseGroup;
}());
;
// Construct my own pulseGroup for others to connect to
var me = new MintEntry(1, GEO, PORT, IP, PUBLICKEY, VERSION, WALLET); //All nodes can count on 'me' always being present
var genesis = new MintEntry(1, GEO, PORT, IP, PUBLICKEY, VERSION, WALLET); //All nodes also start out ready to be a genesis node for others
var pulse = new PulseEntry(1, GEO, GEO + ".1", IP, PORT, VERSION); //makePulseEntry(mint, geo, group, ipaddr, port, version) 
var myPulseGroup = new PulseGroup(me, genesis, pulse); //my pulseGroup Configuration, these two me and genesis are the start of the mintTable
var myPulseGroups = {}; // TO ADD a PULSE: pulseGroup.pulses["newnode" + ":" + genesis.geo+".1"] = pulse;
lib_1.Log("--------------------------Starting with my own pulseGroup=" + lib_1.dump(myPulseGroup));
//pulseGroup.addNode("MAZORE",GEO+".1","104.42.192.234",65013,PUBLICKEY,VERSION,WALLET);
//console.log("-********************** AFTER pulseGroup="+dump(pulseGroup));
//process.exit(36);
//instrument the pulseGroup
function instrumentation() {
    var txt = '<!DOCTYPE html><meta http-equiv="refresh" content="' + REFRESH + '">'; //TODO: dynamic refresh based on new node adds
    txt += '<head title="DARP">';
    txt += '<script> function startTime() { var today = new Date(); var h = today.getHours(); var m = today.getMinutes(); var s = today.getSeconds(); m = checkTime(m); s = checkTime(s); document.getElementById(\'txt\').innerHTML = h + ":" + m + ":" + s; var t = setTimeout(startTime, 500); } function checkTime(i) { if (i < 10) {i = "0" + i};  return i; } </script>';
    //    txt += '<link rel = "stylesheet" type = "text/css" href = "http://drpeering.com/noia.css" /> '
    //    txt += '<link rel = "stylesheet" type = "text/css" href = "http://'+me.ipaddr+':'+me.port+'/darp.css" /> '
    txt += "<style>"; //inline so we don't have to do a fetch 
    txt += ' \
    p,hr,tr,th { font-size: 10px } \
  \
    .right { text-align: right;display: inline-block; } \
    .left{ text-align: left;display: inline-block; } \
\
    h1 { font-size: 14px; text-align: center;;display: inline-block; } \
    h2 { font-size: 12px; text-align: center;;display: inline-block; } \
    \
    table, th, td { \
      border: 1px solid black; \
      padding: 2px; \
    } \
    .mintTable tr:first-child td { \
        vertical-align: top; \
    } \
    .mintTable tr:first-child { \
        color: blue; \
    } \
    .pulses tr:first-child { \
        color: blue; \
    } \
     \
    .UP{ \
            color: black;\
            background-color: lightgreen;\
            font-weight: bold;\
    }\
    \
    .BUSY{ \
            color: black;\
            border-color:yellow;\
    }\
    \
    .NR{ \
            color: black; \
            background-color: pink; \
    }';
    txt += "</style>";
    txt += "<script src=\"https://code.jquery.com/jquery-3.5.1.min.js\" integrity=\"sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0=\" crossorigin=\"anonymous\"></script>";
    txt += "<script>";
    txt += 'var nodeCountLastTime=0;'; //We start out with ourselves only
    txt += 'function fetchState() {';
    txt += 'var url="http://' + me.ipaddr + ":" + me.port + '/pulseGroups";'; //For instruementation show multiple pulseGorups
    //txt += 'console.log("getJSON url="+url);';
    txt += '   $.getJSON(url, function(config) {';
    txt += '        $(document.body).css( "background", "white" );';
    // txt += '        console.log("XHR SUCCESS - config="+JSON.stringify(config,null,2));'
    txt += '         for (var n in config) { ';
    txt += '            var pulseGroup=config[n];';
    /*****
     //u update the matrix using jquery selectors
     txt += 'for (var src in pulseGroup.matrix) {';
     txt += '    for (var dest in pulseGroup.matrix[src]) {';
     txt += '         if (pulseGroup.matrix[src][dest]!=-99999)';
     txt += '         var srcMintEntry=pulseGroup.mintTable[src];';
     txt += '         var destMintEntry=pulseGroup.mintTable[dest];';
     txt += '         if ((srcMintEntry!=null) && (destMintEntry!=null)){'
     txt += '             var gurl="http://"+destMintEntry.ipaddr+":"+destMintEntry.port+"/graph/"+srcMintEntry.geo+"/"+destMintEntry.geo;';
 
 
 
 
 //    txt += '             var link="<a target=_blank href="+gurl+">";';
     txt += '             var myDiv=\'<div class="\'+srcMintEntry.mint+"-"+destMintEntry.mint+\'">\';';
     txt += '             var link="<a target=_blank href="+gurl+">";';
 
     //txt += '             console.log("link="+myDiv+link+pulseGroup.matrix[src][dest]+" ms</a></div>");';
     txt += '             $("."+src+"-"+dest).html(myDiv+link+pulseGroup.matrix[src][dest]+" ms</a></div>");';
 
     //    txt += '         } else console.log("COULD NOT FIND MINT");';
     txt += '         } else {';
     txt += '              $("."+src+"-"+dest).html(pulseGroup.matrix[src][dest]+" ms");'; //does this happen?
     txt += '              console.log("COULD NOT FIND MINT "+src+srcMintEntry+dest+destMintEntry);';
 
     txt += '         }'
 
 
 
     //txt += '         else $("."+src+"-"+dest).html("<p>__</p>");';
 //    txt += '<td class="'+src+"-"+dest+'">' + '<a target="_blank" href="http://' + destMint.ipaddr + ':' + destMint.port + '/graph/' + mintEntry.geo + '/' + destMint.geo +'" >' + pulseGroup.matrix[src][dest] + " ms</a></td>";
 
     txt += '    }';
     txt += '}';
     //txt += 'console.log("pulseGroup="+JSON.stringify(pulseGroup,null,2));'
 **/
    //   Now instead, we will fill the matrix using only the owls - removing matrix ugliness.
    txt += 'for (var src in pulseGroup.pulses) {';
    txt += '    var pulseEntry=pulseGroup.pulses[src];';
    txt += '    if (pulseEntry==null) console.log("ERROR: pulseEntry==null");';
    //txt += '    console.log("pulseEntry="+JSON.stringify(pulseGroup,null,2)+JSON.stringify(pulseEntry,null,2));'
    txt += '    var owls=pulseEntry.owls.split(",");';
    txt += '    for(var owlEntry in owls) {';
    txt += '       var srcMint=parseInt(owls[owlEntry].split("=")[0]);'; //get the
    txt += '        var owl=-99999;';
    txt += '       var strOwl=owls[owlEntry].split("=")[1];';
    txt += '       if (typeof strOwl != "undefined") {'; //<srcMint>[=<owl>[<flag>]],...
    txt += '           owl=parseInt(strOwl);';
    txt += '           var regex = /@/;';
    txt += '           var flag=strOwl.match(regex);';
    txt += '            var srcOwlMintEntry=pulseGroup.mintTable[srcMint];';
    txt += '            var destOwlMintEntry=pulseGroup.mintTable[pulseEntry.mint];';
    //txt += '            console.log("srcOwlMintEntry="+JSON.stringify(srcOwlMintEntry,null,2));'
    //txt += '            console.log("destOwlMintEntry="+JSON.stringify(destOwlMintEntry,null,2));'
    txt += '            if (srcOwlMintEntry!=null && destOwlMintEntry!=null) {';
    //txt += '               console.log("non-null src and dest entries");'
    txt += '               var gurl="http://"+destOwlMintEntry.ipaddr+":"+destOwlMintEntry.port+"/graph/"+srcOwlMintEntry.geo+"/"+destOwlMintEntry.geo;';
    txt += '               var myDiv=\'<div class="\'+srcOwlMintEntry.mint+"-"+destOwlMintEntry.mint+\'">\';';
    txt += '               var link="<a target=_blank href="+gurl+">";';
    //txt += '               console.log("Finished non-null");';
    txt += '            } else {';
    //txt += '               console.log("NULL mintEntry in owls - OK for one run "+srcOwlMintEntry+destOwlMintEntry);'
    txt += '               var gurl="http://noMint";';
    txt += '               var myDiv=\'<div class="\'+srcMint+"-"+pulseEntry.mint+\'">\';';
    txt += '               var link="<a target=_blank href="+gurl+">";';
    txt += '            }';
    //txt += '                     console.log("link="+myDiv+link+owl+" ms</a></div>");';
    txt += ' $("."+srcMint+"-"+pulseEntry.mint).html(myDiv+link+owl+" ms</a></div>");';
    //txt += '                     console.log("After link flag="+flag);';
    txt += '             if (flag) {'; //We have an OWL measure that should be investigated
    //txt += '                 console.log("found a flagged entry "+strOwl+" "+srcOwlMintEntry +" "+destOwlMintEntry);';
    //txt += '                 console.log("pulseEntry.mint="+pulseEntry.mint+"srcOwlMintEntry.mint="+srcOwlMintEntry.mint+" destOwlMintEntry.mint="+destOwlMintEntry.mint);';
    txt += '               if ((srcOwlMintEntry!=null) && (destOwlMintEntry!=null)) {';
    //txt += '                   console.log("HIGHLIGHTING class="+srcOwlMintEntry.mint+"-"+pulseEntry.mint+"="+strOwl);'
    txt += '                   $("."+srcOwlMintEntry.mint+"-"+pulseEntry.mint).addClass("BUSY");';
    txt += '                   $("."+srcOwlMintEntry.mint+"-"+pulseEntry.mint).css("border-color", "yellow").css("border-width", "3px");';
    //txt += '                   console.log("FINISHED HIGHLIGHTING");'
    txt += '               }';
    txt += '            } else {'; //if flag
    //txt += '               console.log("UN-flagged entry "+strOwl+" "+srcOwlMintEntry +" "+destOwlMintEntry);';
    txt += '               if (srcOwlMintEntry!=null && destOwlMintEntry!=null) {';
    //    txt += '                   console.log("NO FLAG UN--HIGHLIGHTING "+srcOwlMintEntry.mint+"-"+destOwlMintEntry.mint+"="+owl);'
    txt += '                   $("."+srcOwlMintEntry.mint+"-"+pulseEntry.mint).removeClass("BUSY");';
    txt += '                   $("."+srcOwlMintEntry.mint+"-"+pulseEntry.mint).css("border-color", "black").css("border-width", "3px");;';
    //    txt += '                   console.log("FINISHED UN-HIGHLIGHTING");'
    txt += '               }';
    txt += '            }';
    txt += '        }';
    txt += '     }';
    txt += '}';
    txt += '/* now create extraordinary path table */';
    txt += 'function getOWLfrom(srcMint, owls) {';
    txt += '   var ary = owls.split(",");';
    txt += '    for (var i = 0; i < ary.length; i++) {';
    txt += '        var mint = ary[i].split("=")[0];';
    txt += '        if (mint == srcMint) {';
    txt += '            var owl = ary[i].split("=")[1];';
    txt += '            if (typeof owl != "undefined" && owl != null)';
    txt += '                return owl;';
    txt += '              else';
    txt += '                  return "";';
    txt += '         }';
    txt += '    }';
    txt += '    return "";';
    txt += '}';
    txt += 'function getOwl(srcMint,destMint) {';
    txt += '    var srcMintEntry=pulseGroup.mintTable[srcMint];';
    txt += '    if (srcMintEntry==null) return console.log("getOwl() can not find mintTableEntry for "+srcMint);';
    txt += '    var destPulseEntry=pulseGroup.pulses[srcMintEntry.geo+":"+pulseGroup.groupName];';
    txt += '    if (destPulseEntry==null) return console.log("getOwl() can not find pulse entry for "+srcMintEntry.geo+":"+pulseGroup.groupName);';
    txt += '    var owl=getOWLfrom(srcMint,destPulseEntry.owls);';
    txt += '    console.log("getOwl("+srcMint+"-"+destMint+") returning "+owl);';
    txt += ' return owl;';
    txt += '}';
    txt += 'for (var srcP in pulseGroup.pulses) {';
    txt += '    var srcEntry=pulseGroup.pulses[srcP];';
    txt += '    for (var destP in pulseGroup.pulses) {';
    txt += '        var destEntry=pulseGroup.pulses[destP];';
    txt += '        var direct=getOwl(srcEntry.mint,destEntry.mint);'; //get direct latency measure
    txt += '        console.log("Here we would compare "+srcEntry.mint+"-"+destEntry.mint+"="+direct);';
    txt += '        for (iP in pulseGroup.pulses) {';
    txt += '            var intermediaryEntry=pulseGroup.pulses[iP];';
    txt += '            var srcToIntermediary=getOwl(srcEntry.mint,intermediaryEntry.mint);';
    txt += '            var intermediaryToDest=getOwl(intermediaryEntry.mint,destEntry.mint);';
    txt += '            var intermediaryPathLatency=srcToIntermediary+intermediaryToDest;';
    txt += '            var delta=intermediaryPathLatency-direct;';
    txt += '            if (delta<0) console.log("BETTER PATH direct="+direct+" intermediaryPathLatency="+intermediaryPathLatency+" delta="+delta);';
    txt += '        }';
    txt += '    }';
    txt += '}';
    //txt += '    for (var dest in pulseGroup.pulses) {'
    //txt += '         for (var intermediary in pulseGroup.pulses) {'
    //txt += '             var direct=getOwl(pulseGroup.pulses[intermediary].mint'
    //txt+= '             console.log("pulseGroup="+JSON.stringify(pulseGroup,null,2));'
    //txt += '         console.log("config="+JSON.stringify(config,null,2)+" nodeCountNow="+nodeCountNow+" nodeCountLastTime="+nodeCountLastTime+" find nodeCount somewhere delivered config in: "+JSON.stringify(config,null,2) );'
    //txt += '             console.log(" pulseGroup.nodeCount="+pulseGroup.nodeCount+" nodeCountLastTime="+nodeCountLastTime );'
    txt += '             if ( pulseGroup.nodeCount > 1 ) {';
    txt += '                if (nodeCountLastTime!=0) {';
    txt += '                     if ( nodeCountLastTime != pulseGroup.nodeCount ) {';
    txt += '                         console.log("NEW NODE: HERE I LOCATION RELOAD(): pulseGroup.nodeCount="+pulseGroup.nodeCount+" nodeCountLastTime="+nodeCountLastTime );';
    txt += '                         console.log("NEW NODE: HERE I LOCATION RELOAD(): pulseGroup.nodeCount="+pulseGroup.nodeCount+" nodeCountLastTime="+nodeCountLastTime );';
    txt += '                         console.log("NEW NODE: HERE I LOCATION RELOAD(): pulseGroup.nodeCount="+pulseGroup.nodeCount+" nodeCountLastTime="+nodeCountLastTime );';
    txt += '                         console.log("NEW NODE: HERE I LOCATION RELOAD(): pulseGroup.nodeCount="+pulseGroup.nodeCount+" nodeCountLastTime="+nodeCountLastTime );';
    txt += '                         location.reload();';
    txt += '                     }';
    txt += '                 } else nodeCountLastTime=pulseGroup.nodeCount;';
    txt += '             }';
    txt += '             nodeCountLastTime=pulseGroup.nodeCount ;';
    //update the dateTime so people know the updates re coming in
    txt += "             var d = new Date(parseInt(pulseGroup.ts)); ";
    txt += "             var now=d.getTime();";
    txt += "             var timeStr=d.toString().split(' ')[4];";
    //       txt += "      var d = new Date(); var now=d.getTime();var timeStr=d.toString().split(' ')[4];"
    //txt += '             $("#dateTime").html( "<div class=\'fade-out\'><h1>*Updated: " + timeStr + "</h1></div>" );' //we show this epoch
    txt += '             $("#dateTime").html( "<div class=\'fade-out updated\'><h1>*Updated: " + timeStr + "</h1></div>" );'; //we show this epoch
    txt += '             $("#raw").text( "pulseGroup=["+pulseGroup.groupName+"]="+JSON.stringify(pulseGroup,null,2));'; //wbnwbnwbnwbnwbnwnbn
    //      Render table from information in the state fetched from node
    //
    txt += '      var totalEarn=0.000000;';
    txt += '      for (let [key, value] of Object.entries(pulseGroup.pulses)) {';
    //                txt += '   console.log(`FOR EACH PULSE  ${key}.split(":")[0]: ${value} ---> $("."+pulse.geo+"_"+${key}+").html("+${value}+");`);'
    txt += '          var pulseLabel=key;'; //fill in most fields as counters - plain
    txt += '          var pulse=value;'; //
    txt += '          if (pulse!=null) {';
    txt += '             for (let [field, fieldValue] of Object.entries(pulse)) {';
    // txt += '             console.log("     FOR EACH FIELD       ^field="+field+" fieldValue="+fieldValue);'
    //txt += '                console.log("Setting "+pulse.geo+"_"+field+"="+fieldValue);'
    // txt += '               $("."+pulse.geo+"_"+field).html(fieldValue+"");'
    txt += '                $("."+pulse.geo+"_"+field).text(fieldValue);';
    txt += '              }';
    //. txt += '              console.log("pulse.owl="+pulse.owl);'
    txt += '              if (pulse.owl=="-99999") $("."+pulse.geo+"_state").text("NR").addClass("NR").removeClass("UP");'; //Add NR class to entire row
    txt += '              else $("."+pulse.geo+"_state").addClass("UP").text("UP").removeClass("NR");'; //Add NR class to entire row
    txt += '              if (pulse.owl=="-99999") $("."+pulse.geo).addClass("NR").removeClass("UP");'; //Add NR class to entire row
    txt += '              else $("."+pulse.geo).addClass("UP").removeClass("NR");'; //Add NR class to entire row
    txt += '              if (pulse.pulseTimestamp!="0")';
    txt += '                  $("."+pulse.geo+"_pulseTimestamp").text(""+Math.round((now-pulse.pulseTimestamp)/1000)+" secs ago");';
    txt += '              else $("."+pulse.geo+"_pulseTimestamp").text("0");';
    txt += '              $("."+pulse.geo+"_bootTimestamp").text(""+Math.round((now-pulse.bootTimestamp)/1000)+" secs ago");';
    txt += '               $("."+pulse.geo+"_owls").text(pulse.owls.substring(0,20));'; //TODO : Align left for this text field
    txt += '               pulse.inPulses=parseInt(pulse.inPulses);';
    txt += '               pulse.outPulses=parseInt(pulse.outPulses);';
    txt += '              var balance = (Math.min(pulse.inPulses*1500, pulse.outPulses*1500) / (1000000 * 1000)) * .5;';
    txt += '              totalEarn+=balance;';
    txt += '              balance=balance.toFixed(6);';
    //txt += 'console.log("balance="+balance+ "totalEarn="+totalEarn);'
    txt += '               $("."+pulse.geo+"_balance").text("$" + balance);'; //TODO : Align left for this text field
    //      txt +='           $("."+pulse.geo+"_owls").html(\'<span style="text-align:left>"\'+pulse.owls+"</span>");'  //TODO : Align left for this text field
    txt += '           }';
    txt += '       }';
    //txt += 'console.log("totalEarn coming in =:"+totalEarn);'
    txt += '       totalEarn=parseFloat(totalEarn).toFixed(6);';
    txt += '        $(".total_earn").text("totalEarn: $"+totalEarn);';
    //   txt +='        $(".total_earn").html("totalEarn: $"+totalEarn);'  //TODO : Align left for this text field
    //   txt +='           $(".total_earn").html("$" + totalEarn.toFixed(6));'  //TODO : Align left for this text field
    txt += '         }';
    txt += '     ';
    txt += '   }).fail(function() { ';
    txt += '       console.log("JSON Fetch error");';
    txt += '        $(document.body).css( "background", "pink" );';
    txt += '   });';
    txt += "    setTimeout(fetchState,1000);";
    txt += "}";
    txt += 'setTimeout(fetchState,1000);';
    txt += '</script>';
    txt += '</head>';
    txt += '<body>';
    txt += '<h1>DARP Node ' + me.geo + ' http://' + me.ipaddr + ":" + me.port + '</h1>';
    var d = new Date();
    var timeStr = d.toString().split(' ')[4];
    txt += '<p id="dateTime">*Refresh: ' + timeStr + ' </p>';
    //
    //  externalize pulseGroup matrix
    //
    for (var p in myPulseGroups) {
        var pulseGroup = myPulseGroups[p];
        //
        //   show OWL Matrix table
        //
        txt += '<br><h2>' + pulseGroup.groupName + ' pulseGroup: ' + pulseGroup.groupName + '</h2><table class="matrix">';
        txt += '<tr><th>' + pulseGroup.groupName + ' OWL Matrix</th>';
        //   print OWL headers
        for (var col in pulseGroup.pulses) {
            var colEntry = pulseGroup.pulses[col];
            //txt+='<th><a href="http://'+colEntry.ipaddr+":"+me.port+'/">'+colEntry.geo+":"+colEntry.srcMint+"</a></th>"
            txt += '<th><a target="_blank" href="http://' + colEntry.ipaddr + ":" + colEntry.port + '/">' + colEntry.geo + " <b>" + colEntry.mint + "</b></a> </th>";
            //else txt += '<th><a target="_blank" href="http://' + colEntry.ipaddr+":"+colEntry.port+'/">'+ colEntry.mint + "</a></th>"
        }
        txt += "</tr>";
        for (var src in pulseGroup.matrix) {
            var srcMintEntry = pulseGroup.mintTable[src]; //src mintEntry
            if (srcMintEntry != null) {
                if (srcMintEntry.state == "UP")
                    txt += '<tr class="' + srcMintEntry.geo + ' UP"><td><a target="_blank" href="http://' + srcMintEntry.ipaddr + ":" + srcMintEntry.port + '/">' + srcMintEntry.geo + " " + srcMintEntry.mint + '</a></td>'; //heacer on left side
                else
                    txt += '<tr class="' + srcMintEntry.geo + ' NR"><td>' + srcMintEntry.geo + " " + srcMintEntry.mint + '</td>'; //heacer on left side
                for (var dest in pulseGroup.matrix[src]) {
                    var destMintEntry = pulseGroup.mintTable[parseInt(dest)];
                    //console.log(`dest=${dest}`);
                    if (destMintEntry != null)
                        txt += '<td class="' + srcMintEntry.mint + "-" + destMintEntry.mint + ' ' + srcMintEntry.geo + ' ' + destMintEntry.geo + '">' + '<div class="' + srcMintEntry.mint + "-" + destMintEntry.mint + '">' + '<a target="_blank" href="http://' + destMintEntry.ipaddr + ':' + destMintEntry.port + '/graph/' + srcMintEntry.geo + '/' + destMintEntry.geo + '" >' + pulseGroup.matrix[src][dest] + " ms</a></div></td>";
                    else
                        txt += '<td class="' + src + "-" + dest + '">' + pulseGroup.matrix[src][dest] + " ms</td>";
                }
                txt += "</tr>";
            }
        }
        txt += "</table>";
        txt += '<br><h2>Extraordinary Network Paths (Better through intermediary)</h2>';
        txt += '<table class="extraordinary">';
        txt += '<tr><th>A Side</th><th>Z Side</th><th>OWL</th><th> </th> <th>intermediary</th><th>ms</th><th>to Z Side</th><th>total ms</th><th>ms better</th>   </tr>';
        txt += '</table>';
        //
        //  Externalize pulse structures 
        //
        txt += '<br><h2>' + pulseGroup.groupName + ' pulseGroup' + '</h2><table class="pulseTable">';
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
        txt += "<th>Net Earnings</th>";
        txt += "</tr>";
        var total = 0; //Add up total balance of all pulses
        //console.log(ts()+"                            pulses="+dump(pulses));
        for (var a in pulseGroup.pulses) {
            var pulseEntry = pulseGroup.pulses[a];
            //console.log(ts()+"a="+a+" pulseTable[pulseEntry]"+dump(pulseEntry));
            //console.log("pulseEntry="+dump(pulseEntry));
            var rowMintEntry = pulseGroup.mintTable[pulseEntry.mint];
            if ((rowMintEntry) && (rowMintEntry.state == "UP"))
                txt += '<tr class="UP ' + pulseEntry.geo + '" >';
            else
                txt += '<tr class="NR ' + "unknown geo" + '" >';
            if (rowMintEntry != null) {
                //            txt+="<td>"+'<a href="http://' + mintEntry.ipaddr + ':' + mintEntry.port + '/" >'+mintEntry.geo+"</a></td>"
                txt += '<td class="' + pulseEntry.geo + ':' + pulseEntry.mint + '">' + '<a target="_blank" href="http://' + pulseEntry.ipaddr + ':' + pulseEntry.port + '/" >' + pulseEntry.geo + '</a>' + "</td>";
                //txt+="<td>"+pulseEntry.geo+"</td>"
                txt += "<td >" + pulseEntry.group + "</td>";
                txt += "<td> " + '<a target="_blank" href="http://' + pulseEntry.ipaddr + ':' + pulseEntry.port + '/me" >' + pulseEntry.ipaddr + "</a></td>";
                txt += "<td>" + '<a target="_blank" href="http://' + pulseEntry.ipaddr + ':' + pulseEntry.port + '/state" >' + pulseEntry.port + "</a></td>";
                txt += '<td class="' + pulseEntry.geo + '_seq"' + '>' + pulseEntry.seq + "</td>";
                var deltaSeconds = Math.round((lib_1.now() - pulseEntry.pulseTimestamp) / 1000) + " secs ago";
                if (pulseEntry.pulseTimestamp == 0)
                    deltaSeconds = "0";
                //txt += "<td>" + now()+" "+entry.pulseTimestamp+ "</td>";
                txt += '<td class="' + pulseEntry.geo + '_pulseTimestamp"' + '>' + deltaSeconds + "</td>";
                //txt+="<td>"+pulseEntry.pulseTimestamp+"</td>"
                txt += "<td>" + pulseEntry.mint + "</td>";
                // OWL
                //            txt += '<td class="' + pulseEntry.geo + '_owl fade-out"' + '>' + '<a  target="_blank" href="http://' + me.ipaddr + ':' + me.port + '/graph?src=' + pulseEntry.geo + '&dst=' + me.geo + "&group=" + pulseEntry.group + '" >' + pulseEntry.owl + "</a> ms</td>";
                txt += '<td class="' + pulseEntry.geo + '_owl "' + '>' + '<a  target="_blank" href="http://' + me.ipaddr + ':' + me.port + '/graph/' + pulseEntry.geo + '/' + me.geo + '" >' + pulseEntry.owl + "</a> ms</td>";
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
                    txt += '<td class="' + pulseEntry.geo + '_owls"' + '>' + pulseEntry.owls.substring(0, OWLS_DISPLAYED) + "</td>";
                    //txt += "<td>" + pulseEntry.lastMsg.substring(0,50) + "</td>"
                }
                else {
                    txt += "<td>" + "" + "</td>";
                    txt += "<td>" + "" + "</td>";
                }
                var deltaSeconds2 = Math.round((lib_1.now() - pulseEntry.bootTimestamp) / 1000) + " secs ago";
                if (pulseEntry.bootTimestamp == 0)
                    deltaSeconds2 = "0";
                //txt += "<td>" + now()+" "+entry.pulseTimestamp+ "</td>";
                txt += '<td class="' + pulseEntry.geo + '_bootTimestamp"' + '>' + deltaSeconds2 + "</td>";
                txt += '<td class="' + pulseEntry.geo + '_version"' + '>' + pulseEntry.version + "</td>";
                var balance = (Math.min(pulseEntry.inPulses * 1500, pulseEntry.outPulses * 1500) / (1000000 * 1000)) * .5; //GB=1000 MB @ 50 cents per
                total = total + balance;
                txt += '<td class="' + pulseEntry.geo + '_balance"' + '> $' + balance.toFixed(6) + "</td>";
                //txt+="<td>"+pulseEntry.lastMsg+"</td>"
            }
            txt += "</tr>";
        }
        txt += '<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td class="total_earn">' + pulseGroup.groupName + ' Earnings $' + total.toFixed(6) + '</td></tr>';
        txt += "</table>";
    }
    for (var p in myPulseGroups) {
        var pulseGroup = myPulseGroups[p];
        //
        //  Externalize mintTable 
        //
        //console.log(ts()+"config.mintTable="+dump(config.mintTable));
        txt += '<br><h2>mintTable</h2><table class="mintTable">';
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
            var srcMintEntry = pulseGroup.mintTable[a];
            if (srcMintEntry != null) {
                //console.log(ts()+"a="+a+" mintEntry"+dump(mintEntry));
                if (srcMintEntry.state == "UP")
                    txt += '<tr class="UP ' + srcMintEntry.geo + '" >';
                else
                    txt += '<tr class="NR ' + srcMintEntry.geo + '" >';
                //                txt += '<tr class="'+mintEntry.geo+'">';
                //txt+="<td>"+mintEntry+"</td>"
                txt += "<td>" + srcMintEntry.mint + "</td>";
                txt += '<td class="' + srcMintEntry.state + '">' + '<a target="_blank" href="http://' + srcMintEntry.ipaddr + ':' + srcMintEntry.port + '/" >' + srcMintEntry.geo + "</a></td>";
                txt += "<td>" + srcMintEntry.port + "</td>";
                txt += "<td>" + '<a target="_blank" href="http://' + srcMintEntry.ipaddr + ':' + srcMintEntry.port + '/me" >' + srcMintEntry.ipaddr + "</a></td>";
                txt += "<td>" + srcMintEntry.publickey.substring(0, 3) + "..." + srcMintEntry.publickey.substring(40, srcMintEntry.publickey.length) + "</td>";
                txt += '<td class="' + srcMintEntry.geo + ' ' + srcMintEntry.geo + '_state' + ' ' + srcMintEntry.state + '">' + '<a target="_blank" href="http://' + srcMintEntry.ipaddr + ':' + srcMintEntry.port + '/mintTable" >' + srcMintEntry.state + '</a>' + "</td>";
                //                   txt += "<td>" + '<a href="http://' + mintEntry.ipaddr + ':' + mintEntry.port + '/config" >' + mintEntry.state + '</a>' + "</td>"
                //var deltaT = Math.round((now() - mintEntry.pulseTimestamp) / 1000) + " secs ago";
                //if (mintEntry.pulseTimestamp == 0) deltaT = "0";
                //txt += '<td class="'+mintEntry.geo+'_pulseTimestamp"'+'">' + deltaT + "</td>";
                var deltaSeconds = Math.round((lib_1.now() - srcMintEntry.lastPulseTimestamp) / 1000) + " secs ago";
                if (srcMintEntry.lastPulseTimestamp == 0)
                    deltaSeconds = "0";
                //txt += "<td>" + now()+" "+entry.pulseTimestamp+ "</td>";
                txt += '<td class="' + srcMintEntry.geo + '_pulseTimestamp"' + '>' + deltaSeconds + "</td>";
                //            txt += '<td class="' + mintEntry.geo + '_owl fade-out"' + '>' + '<a target="_blank" href="http://' + me.ipaddr + ':' + me.port + '/graph?src=' + mintEntry.geo + '&dst=' + me.geo + "&group=" + pulseGroup.groupName + '" >' + mintEntry.lastOWL + "</a> ms</td>";
                txt += '<td class="' + srcMintEntry.geo + '_owl "' + '>' + '<a target="_blank" href="http://' + me.ipaddr + ':' + me.port + '/graph?src=' + srcMintEntry.geo + '&dst=' + me.geo + "&group=" + pulseGroup.groupName + '" >' + srcMintEntry.lastOWL + "</a> ms</td>";
                //txt+="<td>"+mintEntry.bootTimestamp+"</td>"
                txt += "<td>" + '<a target="_blank" href="http://' + srcMintEntry.ipaddr + ':' + srcMintEntry.port + '/version" >' + srcMintEntry.version + "</a></td>";
                txt += "<td>" + srcMintEntry.wallet.substring(0, 3) + "..." + srcMintEntry.wallet.substring(40, srcMintEntry.wallet.length) + "</td>";
                //txt+="<td>"+mintEntry.SHOWPULSES+"</td>"
                //txt += "<td>" + mintEntry.owl + " ms</td>"
                //txt+="<td>"+mintEntry.isGenesisNode+"</td>"
                //            txt+="<td>"+mintEntry.rtt+"</td>"
                var stopButtonURL = "http://" + srcMintEntry.ipaddr + ":" + srcMintEntry.port + "/stop";
                var rebootButtonURL = "http://" + srcMintEntry.ipaddr + ":" + srcMintEntry.port + "/reboot";
                var reloadButtonURL = "http://" + srcMintEntry.ipaddr + ":" + srcMintEntry.port + "/reload";
                var SINGLESTEPButtonURL = "http://" + srcMintEntry.ipaddr + ":" + srcMintEntry.port + "/SINGLESTEP";
                var pulseMsgButtonURL = "http://" + srcMintEntry.ipaddr + ":" + srcMintEntry.port + "/pulseMsg";
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
                var deltaSeconds2 = Math.round((lib_1.now() - srcMintEntry.bootTimestamp) / 1000) + " secs ago";
                if (srcMintEntry.bootTimestamp == 0)
                    deltaSeconds2 = "0";
                //txt += "<td>" + now()+" "+entry.pulseTimestamp+ "</td>";
                txt += '<td class="' + srcMintEntry.geo + '_bootTimestamp"' + '>' + deltaSeconds2 + "</td>";
                txt += "</tr>";
            }
        }
        txt += "</table>";
    }
    txt += '<p>Connect to this pulseGroup using: docker run -p ' + me.port + ":" + me.port + ' -p ' + me.port + ":" + me.port + "/udp -p 80:80/udp -v ~/wireguard:/etc/wireguard -e GENESIS=" + me.ipaddr + ' -e HOSTNAME=`hostname`  -e WALLET=auto -it williambnorton/darp:latest</p>';
    txt += "";
    txt += '<p id="raw">' + JSON.stringify(myPulseGroups, null, 2) + '</p>';
    txt += "</body>";
    txt += "</html>";
    //console.log("txt="+txt);
    return txt;
}
app.get('/', function (req, res) {
    //console.log("********************** fetching '/'");
    //handleShowState(req, res); 
    res.setHeader('Content-Type', 'text/html');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(instrumentation());
    return;
});
app.get('/version', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(JSON.stringify(me.version));
    return;
});
app.get('/stop', function (req, res) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log("EXITTING and Stopping the node request from " + ip);
    lib_1.Log("EXITTING and Stopping the node request from " + ip);
    var referer = req.get('Referer');
    if (referer !== undefined) {
        res.redirect(referer);
    }
    else {
        //TODO
    }
    process.exit(86);
});
app.get('/reboot', function (req, res) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log("/reboot: THIS SHOULD KICK YOU OUT OF DOCKER request from " + ip);
    lib_1.Log("reboot: THIS SHOULD KICK YOU OUT OF DOCKER request from " + ip);
    var referer = req.get('Referer');
    if (referer !== undefined) {
        res.redirect(referer);
    }
    else {
        //TODO
    }
    process.exit(99999);
});
app.get('/reload', function (req, res) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log("EXITTING to reload the system request from: " + ip);
    lib_1.Log("EXITTING to reload the system request from: " + ip);
    var referer = req.get('Referer');
    if (referer !== undefined) {
        res.redirect(referer);
    }
    else {
        //TODO
    }
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
app.get('/graph/:src/:dst', function (req, res) {
    //console.log("********************** fetching '/'");
    //handleShowState(req, res); 
    res.setHeader('Content-Type', 'text/html');
    res.setHeader("Access-Control-Allow-Origin", "*");
    var dest = req.params.dst;
    var src = req.params.src;
    var txt = '';
    txt += grapher_1.grapher(src, dest); //get the HTML to display and show graph
    //    txt+='<meta http-equiv="refresh" content="'+60+'">';
    //    txt+="<html> <head> <script type='text/javascript' src='https://www.gstatic.com/charts/loader.js'></script> <script> google.charts.load('current', {packages: ['corechart', 'line']}); google.charts.setOnLoadCallback(drawBackgroundColor); function drawBackgroundColor() { var data = new google.visualization.DataTable(); data.addColumn('date', 'X'); data.addColumn('number', 'one-way'); data.addRows([";
    //    var myYYMMDD=YYMMDD();     
    // /   var path=SRC+"-"+DST+"."+myYYMMDD+'.txt';
    //    try {
    //                if (fs.existsSync(path)) {
    //file exists
    //                        txt+=fs.readFileSync(path);
    //console.log(`found graph data file ${path}:${txt}`);
    //                }
    //                else console.log("could not find live pulseGroup graph data from "+path);
    //    } catch(err) {
    //                return console.error(err)
    //    }
    //    txt+=" ]); var options = { hAxis: { title: '"+SRC+"-"+DST+" ("+myYYMMDD+")' }, vAxis: { title: 'latency (in ms)' }, backgroundColor: '#f1f8e9' }; var chart = new google.visualization.LineChart(document.getElementById('chart_div')); chart.draw(data, options); } </script> </head> <body> <div id='chart_div'></div>";
    //    txt+="<p><a href="+'http://' + me.ipaddr + ':' + me.port + '>Back</a></p></body> </html>';
    //console.log(`graph txt=${txt}`);
    res.end(txt);
    return;
});
//
//  this API should be the heart of the project - request a pulseGroup configuration for yourself (w/paramters), 
//  or update your specific pulseGroup to the group owner's 
//
app.get('/pulsegroup/:pulsegroup/:mint', function (req, res) {
    //console.log("fetching '/pulseGroup' pulsegroup="+req.params.pulsegroup+" req.params.mint="+req.params.mint);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    //
    //  pulseGroup 
    //
    if (typeof req.params.pulsegroup != "undefined") {
        //console.log("pulsegroup="+req.params.pulsegroup+" mint="+req.params.mint);
        for (var pulseGroup in myPulseGroups) {
            if (myPulseGroups[pulseGroup].groupName == req.params.pulsegroup) {
                var mint = 0;
                if (typeof req.params.mint != "undefined") //use our mint 0
                    mint = parseInt(req.params.mint); //or send mint0 of caller
                var clonedPulseGroup = JSON.parse(JSON.stringify(myPulseGroups[pulseGroup])); //clone my pulseGroup obecjt 
                //newNodePulseGroup.me=newNode;
                clonedPulseGroup.mintTable[0] = clonedPulseGroup.mintTable[mint]; //assign him his mint and config
                //console.log("pulsegroup delivering cloned pulseGroup with customer mint0 for new mint #" +mint+dump(clonedPulseGroup));
                //res.end(JSON.stringify(myPulseGroups[pulseGroup], null, 2));
                res.end(JSON.stringify(clonedPulseGroup, null, 2)); //send the cloned group with his mint as mint0
                return; //we sent the more specific
            }
        }
        //console.log("/pulseGroup/:pulsegroup returning pulseGroup specified "+req.params.pulsegroup);
        res.end(JSON.stringify(null));
    }
    else {
        console.log("No pulseGroup specified");
        res.end(JSON.stringify(myPulseGroups, null, 2));
        return;
    }
});
app.get(['/pulsegroups', '/state', '/me'], function (req, res) {
    //console.log(ts()+"fetching '/pulseGroups' "+req.connection.remoteAddress);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(JSON.stringify(myPulseGroups, null, 2));
    return;
});
app.get('/mintTable', function (req, res) {
    console.log("fetching '/mintTable' ");
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(JSON.stringify(myPulseGroups, null, 2));
    return;
});
//// nodeFactory
//       Configuration for node - allocate a mint
//
app.get('/nodefactory', function (req, res) {
    //console.log(ts() + "NODEFACTORY");
    //
    //  additional nodes adding to pulseGroup
    //
    console.log('EXPRESS nodeFactory: config requested with params: ' + lib_1.dump(req.query));
    //
    //  Marshall incoming parameters
    //  
    //console.log("EXPRESS geo="+req.query.geo+" publickey="+req.query.publickey+" query="+JSON.stringify(req.query,null,2)+" port="+req.query.port+" wallet="+req.query.wallet+" version="+req.query.version);
    //marshall variables
    var geo = String(req.query.geo);
    var publickey = String(req.query.publickey);
    var port = Number(req.query.port) || 65013;
    var wallet = String(req.query.wallet) || "";
    var incomingTimestamp = req.query.ts;
    if (typeof incomingTimestamp == "undefined") {
        console.log("/nodeFactory called with no timestamp");
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            "rc": "-1 nodeFactory called with no timestamp. "
        }));
        return;
    }
    var incomingIP = req.query.myip; // for now we believe the node's IP
    var octetCount = 0;
    if (typeof incomingIP === "string") {
        var octetCount = incomingIP.split(".").length; //but validate as IP, not error msg
    }
    if (octetCount != 4) {
        incomingIP = "noMYIP";
    }
    ;
    var clientIncomingIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (incomingIP == "noMYIP")
        incomingIP = clientIncomingIP;
    if (typeof incomingIP == "undefined")
        return console.log(lib_1.ts() + "***********************ERROR: incomingIP unavailable from geo=" + geo + " incomingIP=" + incomingIP + " clientIncomingIP=" + clientIncomingIP);
    ;
    console.log("incomingIP=" + incomingIP + " clientIncomingIP=" + clientIncomingIP + " req.myip=" + req.query.myip);
    // function filter(incomingIP:string) {
    //     //here we filter (ignore) incoming IPs with global blacklist/whitelist
    // }
    //console.log("req="+dump(req));
    var version = String(req.query.version);
    //console.log("EXPRESS /nodefactory geo="+geo+" publickey="+publickey+" port="+port+" wallet="+wallet+" incomingIP="+incomingIP+" version="+version);
    //console.log("req="+dump(req.connection));
    //var newNode=pulseGroup.addNode( geo, GEO+".1", incomingIP, port,publickey, version, wallet); //add new node and pulse entry to group
    //
    //  Handle Geneis Node case - first to start up
    //
    if (me.ipaddr == incomingIP) { //GENESIS NODE instantiating itself - don't need to add anything
        console.log("...........................GENESIS NODE CONFIGURED FINISHED configured...........");
        console.log("...........................GENESIS NODE CONFIGURED FINISHED configured...........");
        console.log("...........................GENESIS NODE CONFIGURED FINISHED configured...........");
        console.log("...........................GENESIS NODE CONFIGURED FINISHED configured...........");
        console.log("...........................GENESIS NODE CONFIGURED FINISHED configured...........");
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(myPulseGroup));
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
    //  First, remove previous instances from this IP:port - one IP:port per pulseGroup-we accept the last
    //
    for (var mint in myPulseGroup.mintTable) {
        //        console.log("looking at mint="+dump(pulseGroup.mintTable[mint]));
        if ((myPulseGroup.mintTable[mint] != null) && myPulseGroup.mintTable[mint].ipaddr == incomingIP && myPulseGroup.mintTable[mint].port == port) {
            console.log("deleting previous mint for this node: " + incomingIP + ":" + port + " mint #" + mint + " geo=" + myPulseGroup.mintTable[mint].geo);
            myPulseGroup.mintTable.splice(parseInt(mint)); //make sure not do delete me or genesis node
            //remove the owl
            //delete pulseGroup.mintTable[mint];  //will make it null in the mint table
        }
    }
    //
    //  Add pulseGroup mintEntry and pulseEntry and Clone ourselves as the new pulsegroup
    //
    var newMint = myPulseGroup.nextMint++;
    console.log(geo + ": mint=" + newMint + " publickey=" + publickey + "version=" + version + "wallet=" + wallet);
    myPulseGroup.pulses[geo + ":" + myPulseGroup.groupName] = new PulseEntry(newMint, geo, myPulseGroup.groupName, String(incomingIP), port, VERSION);
    //console.log("Added pulse: "+geo + ":" + group+"="+dump(pulseGroup.pulses[geo + ":" + group]));
    //
    //  mintTable - first [0] is me and [1] is genesis
    // Here is a little code
    var newNode = new MintEntry(newMint, geo, port, String(incomingIP), publickey, version, wallet);
    myPulseGroup.mintTable[newMint] = newNode; //we already have a mintTable[0] and a mintTable[1] - add new guy to end mof my genesis mintTable
    console.log("added mint# " + newMint + " = " + newNode.geo + ":" + newNode.ipaddr + ":" + newNode.port + ":" + newMint + " to " + myPulseGroup.groupName);
    console.log("After adding node, pulseGroup=" + lib_1.dump(myPulseGroup));
    myPulseGroup.nodeCount++;
    //TODO: check for duplicates - search for ipaddr:port that matches
    //console.log("BeforeCloning, pulseGroup="+dump(pulseGroup));
    //function makeMintEntry(mint:number, geo:string, port:number, incomingIP:string, publickey:string, version:string, wallet:string):MintEntry {
    //make a copy of the pulseGroup for the new node and set its passed-in startup variables
    var newNodePulseGroup = JSON.parse(JSON.stringify(myPulseGroup)); //clone my pulseGroup obecjt 
    //newNodePulseGroup.me=newNode;
    newNodePulseGroup.mintTable[0] = newNode; //assign him his mint and config
    //newNodePulseGroup.mintTable.shift();  //get rid of groupOwner mint[0]
    //newNodePulseGroup.mintTable[0]=newNode;
    //wbnwbnwbn - Here we modify our pulseGroup to be fitted for remote.
    //  this means mintTable[0]  
    console.log("********************************* newNodePulseGroup=");
    console.log("********************************* newNodePulseGroup=");
    console.log("********************************* newNodePulseGroup=");
    console.log("********************************* newNodePulseGroup=");
    console.log("********************************* newNodePulseGroup=" + lib_1.dump(newNodePulseGroup));
    //
    //                              pulseNode MEMBER NODE
    //
    // console.log(ts() + "nodefactory configuring new node publickey=" + publickey + " me.publickey=" + me.publickey);
    // console.log(ts() + "nodefactory: Received connection from " + geo + "(" + incomingIP + ")");
    // console.log(ts() + "nodeFactory sending newNodeConfig =" + dump(newNodePulseGroup));
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(newNodePulseGroup)); //send mint:0 mint:1 *mint:N groupEntry *entryN
    // console.log("After Cloning and delivery of member config, my genesis pulseGroup="+dump(pulseGroup));
    // pulseGroups=[pulseGroup];
    // var pulseGroups={[me.geo+".1"] : myPulseGroup};
});
//
//      get conmfiguration from the genesis node
//
var url = encodeURI("http://" + process.env.GENESIS + ":" + process.env.PORT + "/nodefactory?geo=" + GEO + "&port=" + PORT + "&publickey=" + PUBLICKEY + "&version=" + VERSION + "&wallet=" + WALLET + "&myip=" + process.env.MYIP + "&ts=" + lib_1.now());
console.log("getting pulseGroup from url=" + url);
//var hostname=process.env.HOSTNAME||"noHostName"
//var geo=hostname.split(".")[0].toUpperCase();
//var port=process.env.PORT||"65013";
//
//  newPulseGroup() - this will be the object creation from remote JSON routine
//
function getMyPulseGroupObject(ipaddr, port, callback) {
    console.log("getPulseGroup(): ipaddr=" + ipaddr + ":" + port);
    http.get(url, function (res) {
        var data = '';
        res.on('data', function (stream) {
            data += stream;
        });
        res.on('error', function () {
            console.log(lib_1.ts() + "getPulseGroup(): received error from " + URL);
            process.exit(36);
        });
        res.on('end', function () {
            //console.log("********* *******           data="+data);
            var newPulseGroup = JSON.parse(data);
            console.log("getPulseGroup(): from node factory:" + lib_1.dump(newPulseGroup));
            if (newPulseGroup.mintTable[0].publickey == PUBLICKEY) {
                console.log(lib_1.ts() + "getPulseGroup(): GENESIS node already configured ");
                //*********** GENESIS NODE CONFIGURED **********/
                //pulseGroups=[newPulseGroup];
                callback(newPulseGroup);
                return;
            }
            console.log(lib_1.ts() + "getPulseGroup(): Configuring non-genesis node ... ");
            callback(newPulseGroup);
            console.log("getPulseGroup():- call setWireguard to generate wireguard config for me and genesis node:");
            // setWireguard(); //set up initial wireguard comfig
        });
    });
    //console.log("http fetch done");
}
/***************** MAIN ****************/
//console.log("* * * * * * * * * Starting  pulseGroup="+dump(pulseGroup));
//
//  This is really a pulseGroup object creator - should instead return an object woith attached methods and config from genesis node
//
//      as in, when incoming JOIN message comes in, pulseGroups[n++]=new pulseGroup(GENESIS, PORT, [PUBLICKEY], ... )
getMyPulseGroupObject(GENESIS, PORT, function (newPulseGroup) {
    //    joinPulseGroup("71.202.2.184","65013", function (newPulseGroup) {
    console.log("callback from my or someone else's pulseGroup=" + lib_1.dump(newPulseGroup));
    //
    //       attach convenience routines to the downloaded pulseGroup assignment
    //
    newPulseGroup.forEachNode = function (callback) { for (var node in this.pulses)
        callback(node, this.pulses[node]); };
    newPulseGroup.forEachMint = function (callback) { for (var mint in this.mintTable)
        callback(mint, this.mintTable[mint]); };
    //TODO: is this the only place that nodes are added?  I do it manually somewhere...?
    newPulseGroup.addNode = function (geo, group, ipaddr, port, publickey, version, wallet) {
        newPulseGroup.deleteNode(ipaddr, port); //remove any preexisting entries with this ipaddr:port
        var newMint = newPulseGroup.nextMint++;
        //console.log("AddNode(): "+geo+":"+group+" as "+ipaddr+"_"+port+" mint="+newMint+" publickey="+publickey+"version="+version+"wallet="+wallet);
        //TO ADD a PULSE: 
        this.pulses[geo + ":" + group] = new PulseEntry(newMint, geo, group, ipaddr, port, VERSION);
        //console.log("Added pulse: "+geo + ":" + group+"="+dump(pulseGroup.pulses[geo + ":" + group]));
        //TO ADD A MINT:
        var newNode = new MintEntry(newMint, geo, port, ipaddr, publickey, version, wallet);
        this.mintTable[newMint] = newNode;
        //console.log(`addNode() adding mint# ${newMint} = ${geo}:${ipaddr}:${port}:${newMint} added to ${group}`);
        //console.log("After adding node, pulseGroup="+dump(pulseGroup));
        newPulseGroup.nodeCount++;
        return this.mintTable[newMint];
    };
    //   newPulseGroup.deleteNode = function(geo:string,group:string,ipaddr:string,port:number,mint:number) {
    //       delete this.pulses[geo + ":" + group];
    //       delete this.mintTable[mint];
    //   };
    newPulseGroup.deleteNode = function (ipaddr, port) {
        this.mintTable.forEach(function (element) {
            if (element.ipaddr == ipaddr && element.port == port) {
                console.log("delete old mint " + element.mint);
            }
        });
    };
    //pulseGroup.pulse = function() {
    //
    //  buildMatrix of objects for each segment - 
    //
    newPulseGroup.buildMatrix = function () {
        //return;//turning off this feature until stable
        var matrix = [];
        for (var pulse in newPulseGroup.pulses) {
            var pulseEntry = newPulseGroup.pulses[pulse];
            // console.log("processing "+pulse);
            // newPulseGroup.forEachNode(function(index:string,nodeEntry:PulseEntry) {
            // var pulseFreshness=now()-pulseEntry.pulseTimestamp;
            //console.log(`${pulse} pulseFreshness=${pulseFreshness}`);
            if ((lib_1.now() - pulseEntry.pulseTimestamp) < 2 * 1000) { // VALID PULSE
                //for each OWLS                 
                var ary = pulseEntry.owls.split(","); //put all my OWLs into matrix
                for (var owlEntry in ary) {
                    var m = parseInt(ary[owlEntry].split("=")[0]);
                    var owl = NO_OWL;
                    var strOwl = ary[owlEntry].split("=")[1];
                    if (typeof strOwl != "undefined")
                        owl = parseInt(strOwl);
                    if (typeof matrix[m] == "undefined")
                        matrix[m] = [];
                    //console.log("Searching for mint "+m);
                    //console.log(`matrix src ${m} - dst ${nodeEntry.mint} = ${owl}`);
                    matrix[m][pulseEntry.mint] = owl; //pulse measured to peer
                }
                if (typeof matrix[pulseEntry.mint] == "undefined")
                    matrix[pulseEntry.mint] = [];
                matrix[pulseEntry.mint][newPulseGroup.mintTable[0].mint] = pulseEntry.owl; //pulse measured to me
            }
            else { //OLD PULSE - CLEAR these entries
                console.log(pulseEntry.geo + " did not respond. Entering NO_OWL for all values to this node");
                // node did not respond - so we have no data - no entry, should we mark call all NO_OWL
                // newPulseGroup.forEachNode(function(index:string,groupNode:PulseEntry) {
                //    if ((index!="0") && (groupNode.mint!=nodeEntry.mint)) 
                //        matrix[groupNode.mint][nodeEntry.mint]=NO_OWL;  //clear out previously published measurements
                //});
                // if (typeof newPulseGroup.mintTable[0].mint=="undefined")  return console.log("UNDEFINED MINT 0 - too early");
                // console.log(`nodeEntry.mint=${nodeEntry.mint} mymint=${newPulseGroup.mintTable[0].mint}`);
                if (typeof matrix[pulseEntry.mint] == "undefined")
                    matrix[pulseEntry.mint] = [];
                matrix[pulseEntry.mint][newPulseGroup.mintTable[0].mint] = NO_OWL; //This guy missed his pulse - mark his entries empty
            }
        }
        //for (var s in newPulseGroup.matrix) //INTRUMENTATION POINT
        //    for (var d in newPulseGroup.matrix[s])
        //        console.log(`MATRIX s=${s} d=${d} = ${newPulseGroup.matrix[s][d]}`);
        newPulseGroup.matrix = matrix; //replace existing matrix - 
        //console.log("could publish to subscribers here pulseGroup matrix="+dump(newPulseGroup.matrix));
    };
    //
    //  pulse()
    //
    newPulseGroup.pulse = function () {
        var ipary = [];
        var owls = "";
        newPulseGroup.forEachNode(function (index, nodeEntry) {
            ipary.push(nodeEntry.ipaddr + "_" + nodeEntry.port);
            nodeEntry.outPulses++;
            var flag = "";
            if (nodeEntry.owl == NO_OWL)
                owls += nodeEntry.mint + ",";
            else {
                var medianOfMeasures = lib_1.median(nodeEntry.history);
                //console.log(`nodeEntry.medianHistory.length=${nodeEntry.medianHistory.length}`);
                if (nodeEntry.medianHistory.length > 0) { //use medianHistory to identify a median to deviate from
                    var medianOfMedians = lib_1.median(nodeEntry.medianHistory);
                    //var deviation=Math.round(Math.abs(medianOfMedians-medianOfMeasures)*100/medianOfMedians);
                    var deviation = Math.round(Math.abs(medianOfMedians - nodeEntry.owl) * 100 / medianOfMedians);
                    var delta = Math.abs(medianOfMedians - nodeEntry.owl);
                    //console.log(`geo=${nodeEntry.geo} nodeEntry.owl=${nodeEntry.owl} medianOfMeasures=${medianOfMeasures} medianOfMedians=${medianOfMedians} deviation=${deviation}%`);
                    //                  if ((nodeEntry.owl>4) && (deviation>DEVIATION_THRESHOLD)) {  //flag if off by 30% from median
                    if (delta > 10) { //flagg if deviation is > 10ms - we can improve that
                        console.log(lib_1.ts() + ("Flagging " + nodeEntry.mint + "-" + newPulseGroup.mintTable[0].mint + " " + nodeEntry.owl + "@  delta=" + delta + " geo=" + nodeEntry.geo + " to " + me.geo + " nodeEntry.owl=" + nodeEntry.owl + "@ medianOfMeasures=" + medianOfMeasures + " medianOfMedians=" + medianOfMedians + " deviation=" + deviation + "%"));
                        flag = "@"; //deviation 30% from the median, flag
                    }
                }
            }
            owls += nodeEntry.mint + "=" + nodeEntry.owl + flag + ",";
        });
        owls = owls.replace(/,+$/, ""); //remove trailing comma 
        var myEntry = newPulseGroup.pulses[GEO + ":" + newPulseGroup.groupName];
        myEntry.seq++;
        var pulseMessage = "0," + VERSION + "," + GEO + "," + newPulseGroup.groupName + "," + myEntry.seq + "," + newPulseGroup.mintTable[0].bootTimestamp + "," + myEntry.mint + "," + owls;
        //console.log("pulseGroup.pulse(): pulseMessage="+pulseMessage+" to "+dump(ipary));  //INSTRUMENTATION POINT
        pulselayer_1.sendPulses(pulseMessage, ipary);
        var sleepTime = 1000 - (lib_1.now() + 1000) % 1000; // start pulse around on the second
        //console.log(`sleepTime=${sleepTime}`);
        setTimeout(newPulseGroup.pulse, sleepTime);
        //        setTimeout(newPulseGroup.pulse,newPulseGroup.cycleTime*1000);
        //var timeToNextSecond=now()%1000;  //REALLY WANT TO TRY AND CONTROL SELF TO END ON 1 SECOND BOUNDARIES
        //setTimeout(newPulseGroup.pulse,newPulseGroup. timeToNextSecond);
        newPulseGroup.timeout(); //and timeout the non-responders
        if (newPulseGroup.adminControl == 'RESYNCH') {
            console.log(lib_1.ts() + "Resynching with genesis node...");
            newPulseGroup.syncGenesisPulseGroup(); //fetch new config from genesis
            newPulseGroup.adminControl = '';
        }
        newPulseGroup.mintTable[0].state = "UP";
        newPulseGroup.mintTable[0].lastPulseTimestamp = lib_1.now();
    };
    newPulseGroup.isGenesisNode = function () {
        return newPulseGroup.mintTable[0].geo == newPulseGroup.groupOwner;
    };
    newPulseGroup.getMint = function (mint) {
        return newPulseGroup.mintTable[mint];
        for (var m in newPulseGroup.mintTable) {
            if (newPulseGroup.mintTable[m] != null) {
                //genesis node should timeout old mints
                //if ((newPulseGroup.isGenesisNode()) && (now()-this.mintTable.lastPulseTimestamp>5)) {
                //    console.log("getMint() SHOULD BE timing out :"+this.mintTable[m].geo+" mint "+this.mintTable[m].mint);
                //delete this.mintTable[m];
                //}
                //console.log(`m=${m}`);
                if ((m != "0") && (this.mintTable[m].mint == mint))
                    return this.mintTable[m];
            }
        }
        return null;
    };
    //  two different timeouts
    //  1) update packetLoss counters and clear OWLs in pulseEntry
    //  2) remove nodes that timeout (Genesis manages group population) 
    //      or non-genesis nodes remove the group when genesis node goes away for n=~15 seconds
    //  all pulseTimes are assumed accurate to my local clock
    newPulseGroup.timeout = function () {
        //var nodeipy=[];
        var startingPulseEntryCount = newPulseGroup.pulses.length;
        for (var m in this.mintTable) {
            //console.log("checking for a pre-existing: "+dump(this.mintTable[m]));
            if ((m != "0") && this.mintTable[m] && this.mintTable[m].lastPulseTimestamp != 0) { //ignore mintTable[0]
                var elapsedMSincePulse = (lib_1.now() - this.mintTable[m].lastPulseTimestamp);
                //console.log(`elapsed ms since last pulse=${elapsedMSincePulse}`);
                if (elapsedMSincePulse > 2 * newPulseGroup.cycleTime * 1000) { //timeout after 2 seconds
                    //console.log("m="+m+" elapsedMSincePulse="+elapsedMSincePulse+" clearing OWL in mint entry which missed at least one cycle"+this.mintTable[m].geo);
                    this.mintTable[m].lastOWL = NO_OWL; //we don't have a valid OWL
                    this.mintTable[m].state = "NR"; //We don't know this node's state
                    if (newPulseGroup.isGenesisNode()) { /*GENESIS ONLY*/
                        console.log("m=" + m + " genesis node elapsedMSincePulse=" + elapsedMSincePulse);
                        if (elapsedMSincePulse > 5 * newPulseGroup.cycleTime * 1000) { //TIMEOUT MINT after 5 seconds
                            console.log("timeout(): DELETING MINT with " + elapsedMSincePulse + " ms old timestamp " + this.mintTable[m].geo + " mint=" + this.mintTable[m].mint);
                            //console.log("timeout(): DELETING MINT with old timestamp "+this.mintTable[m].geo);
                            //console.log("timeout(): DELETING MINT with old timestamp "+this.mintTable[m].geo);
                            //console.log("timeout(): DELETING MINT with old timestamp "+this.mintTable[m].geo);
                            //console.log("timeout(): DELETING MINT with old timestamp "+this.mintTable[m].geo);
                            //delete newPulseGroup.mintTable[m];   //did not work
                            delete newPulseGroup.mintTable[m];
                        }
                    }
                    else { /*  not genesis - only can time out genesis  */
                        console.log("timing out genesis node reconnect newPulseGroup.mintTable=" + lib_1.dump(newPulseGroup.mintTable));
                        if (lib_1.now() - newPulseGroup.mintTable[1].lastPulseTimestamp > 30 * 1000) {
                            console.log("Here the node will timeout the genesis snode, and delete his pulseGroup");
                        }
                        //we may timeout the group owner and kill the pulsegroup
                        //if (elapsedMSincePulse > 60 * 1000 ) console.log("group owner has been unreachable for 1 minute: "+elapsedMSincePulse);
                    }
                    //Nodes can be upgraded to "BUSY" if someone else has a measurement to it
                    //delete this.mintTable[m];
                }
            }
        }
        for (var p in this.pulses) {
            if ((this.pulses[p]) && (this.pulses[p].pulseTimestamp != 0) && (this.pulses[p].mint != 1)) { //don't timeout genesis pulse
                var elapsedMSincePulse = (lib_1.now() - this.pulses[p].pulseTimestamp);
                //console.log(`${this.pulses[p].geo} elapsedSecondsSincePulse=${elapsedSecondsSincePulse}`);
                if (elapsedMSincePulse > 2 * newPulseGroup.cycleTime * 1000) { //timeout after 2 seconds
                    //console.log(ts()+"timout(): Non-respondong node Clearing OWL in pulse entry "+this.pulses[p].geo+":"+this.groupName);
                    this.pulses[p].owl = NO_OWL;
                    this.pulses[p].owls = "1";
                    this.pulses[p].pktDrops++;
                    if (newPulseGroup.isGenesisNode()) { /*GENESIS ONLY*/
                        //console.log(`I am Genesis Node timing out ${this.pulses[p].geo}`);
                        if (elapsedMSincePulse > 10 * newPulseGroup.cycleTime * 1000) {
                            console.log(lib_1.ts() + ("timeout() : Genesis DELETING PULSE " + this.pulses[p].geo + " with " + elapsedMSincePulse + " ms old timestamp "));
                            // console.log(ts()+"timeout() - Genesis DELETEING PULSE with old timestamp "+this.pulses[p].geo);
                            // console.log(ts()+"timeout() - Genesis DELETEING PULSE with old timestamp "+this.pulses[p].geo);
                            // console.log(ts()+"timeout() - Genesis DELETEING PULSE with old timestamp "+this.pulses[p].geo);
                            // console.log(ts()+"timeout() - Genesis DELETEING PULSE with old timestamp "+this.pulses[p].geo);
                            if (newPulseGroup.mintTable[this.pulses[p].mint] == null) { //delete this.pulses[p];
                                delete this.pulses[p];
                            }
                            else {
                                console.log("will delete pulse when mint is gone");
                            }
                        }
                    }
                    //delete this.pulses[p];
                }
            }
        }
        if (startingPulseEntryCount != newPulseGroup.pulses.length) {
            newPulseGroup.nodeCount = Object.keys(newPulseGroup.pulses).length;
            console.log("timeout(): nodeC0unt Changed from " + startingPulseEntryCount + " setting newPulseGroup.nodeCount=" + newPulseGroup.pulses.length);
        }
        //        newPulseGroup.nodeCount=0;  //update nodeCount since we may have deleted
        //        for (var p in this.pulses) {
        //            newPulseGroup.nodeCount++;
        //        }
        newPulseGroup.buildMatrix();
    };
    newPulseGroup.checkSWversion = function () {
        //console.log("=================================> checkSWversion()");
        if (newPulseGroup.groupOwner == me.geo)
            return console.log("Point your browser to Genesis Node for instrumentation: http://" + newPulseGroup.mintTable[0].ipaddr + ":" + newPulseGroup.mintTable[0].port);
        //console.log("checkSWversion newPulseGroup="+dump(newPulseGroup));    
        var url = encodeURI("http://" + newPulseGroup.mintTable[1].ipaddr + ":" + newPulseGroup.mintTable[1].port + "/version?ts=" + lib_1.now() + "&x=" + lib_1.now() % 2000); //add garbage to avoid caches
        //console.log("checkSWversion(): url="+url);
        http.get(url, function (res) {
            res.setEncoding("utf8");
            var body = "";
            res.on("data", function (data) {
                body += data;
            });
            res.on('error', function (error) {
                console.log("checkSWversion():: checkSWversion CAN'T REACH GENESIS NODE"); // Error handling here never triggered TODO
            });
            res.on("end", function () {
                var genesisVersion = JSON.parse(body);
                var mySWversion = lib_1.MYVERSION(); //find the Build.*
                console.log(lib_1.ts() + "checkSWversion(): " + " genesis SWversion==" + lib_1.dump(genesisVersion) + " MY SW Version=" + mySWversion + " me.version=" + me.version);
                if (genesisVersion != mySWversion) {
                    console.log(lib_1.ts() + "checkSWversion(): NEW SOFTWARE AVAILABLE - GroupOwner said " + genesisVersion + " we are running " + mySWversion + " .......process exitting");
                    process.exit(36); //SOFTWARE RELOAD
                }
            });
        });
        setTimeout(newPulseGroup.checkSWversion, CHECK_SW_VERSION_CYCLE_TIME * 1000); //Every 60 seconds check we have the best software
    };
    newPulseGroup.adminControl = '';
    //
    //  recvPulses - 
    //
    newPulseGroup.recvPulses = function () {
        pulselayer_1.recvPulses(me.port, function (incomingPulse) {
            //console.log("----------> recvPulses incomingPulse="+dump(incomingPulse));//+" newPulseGroup="+dump(newPulseGroup));
            //console.log("myPulseGroup="+dump(pulseGroup));
            var myPulseEntry = myPulseGroup.pulses[incomingPulse.geo + ":" + incomingPulse.group];
            var mintEntry = newPulseGroup.getMint(incomingPulse.mint); // look up the pulse claimed mint
            //console.log(`associated ${incomingPulse.mint} mintEntry=`+dump(mintEntry));
            //console.log(`My pulseEntry for ${incomingPulse.geo}:${incomingPulse.group}=`+dump(myPulseEntry));
            //            if (typeof myPulseEntry == "undefined" || myPulseEntry==null) {  //If we don't have this pulseEntry yet
            if (myPulseEntry == null || mintEntry == null) {
                if (!newPulseGroup.isGenesisNode()) {
                    console.log(lib_1.ts() + ("ignoring " + incomingPulse.geo + ":" + incomingPulse.group + " - we do not have this pulse entry"));
                    return;
                }
                //TODO: This is where authentication to this pulseGroup happens
                if (mintEntry == null) { //} && (mintEntry.geo==incomingPulse.geo)) {  //we found mint and matches incoming geo - should we check incomingIP also? We can.
                    console.log(lib_1.ts() + "recvPulses(): IGNORING PULSE Found pulseEntry " + incomingPulse.geo + ":" + incomingPulse.group + " but Could not find mint for this pulse... Will re-synch with genesis to get credentials for " + incomingPulse.geo);
                    newPulseGroup.adminControl = 'RESYNCH';
                    return; //we are done     
                }
                if (mintEntry.geo != incomingPulse.geo) {
                    console.log(lib_1.ts() + "recvPulses(): IGNORING PULSE - mismatched mint " + incomingPulse.geo + ":" + incomingPulse.group + " and mint=" + mintEntry.mint + " and this mint is geo=" + mintEntry.geo + " but Could not find mint for this pulse... will re-synch with genesis to get credentials for " + incomingPulse.geo);
                    newPulseGroup.adminControl = 'RESYNCH';
                    return; //we are done    
                }
                return; //we need a mint and pulseGroup entry to receive a pulse
            }
            //console.log(ts()+"recvPulses(): Valid pulse for a mint we know about "+incomingPulse.geo);
            //we expect mintEntry to --> mint entry for this pulse
            //console.log("My pulseEntry for this pulse="+dump(myPulseEntry));
            if (myPulseEntry !== undefined) {
                newPulseGroup.ts = lib_1.now(); //We got a pulse - update the pulseGroup timestamp
                //copy incoming pulse into my pulse record
                myPulseEntry.inPulses++;
                myPulseEntry.lastMsg = incomingPulse.lastMsg;
                myPulseEntry.pulseTimestamp = incomingPulse.pulseTimestamp;
                myPulseEntry.owl = incomingPulse.owl;
                myPulseEntry.seq = incomingPulse.seq;
                myPulseEntry.owls = incomingPulse.owls;
                myPulseEntry.history.push(myPulseEntry.owl);
                if (myPulseEntry.history.length > 60) //store 60 samples
                    myPulseEntry.history.shift(); //drop off the last sample
                var d = new Date(myPulseEntry.pulseTimestamp);
                if (d.getSeconds() == 0) {
                    myPulseEntry.medianHistory.push(lib_1.median(myPulseEntry.history));
                    //console.log(`Wrote MedianHistory median=${median(myPulseEntry.history)} Now myPulseEntry=${dump(myPulseEntry)}`);
                }
                //update mint entry
                mintEntry.lastPulseTimestamp = myPulseEntry.pulseTimestamp; //CRASH mintEntry ==null
                mintEntry.lastOWL = myPulseEntry.owl;
                mintEntry.state = "UP";
                //console.log("owls="+pulseEntry.owls);
                if (myPulseEntry.mint == 1) { //if pulseGroup owner, make sure I have all of his mints
                    //console.log("recvPulse handling owner's pulse and managing population to match his");                            
                    //console.log(`CHECKING SOFTWARE VERSION: My build=(${me.version} vs groupOwner: ${incomingPulse.version}).`);
                    if (incomingPulse.version != me.version) {
                        console.log("Group Owner has newer software than we do me: " + me.version + " vs genesis: " + incomingPulse.version + "). QUit, Rejoin, and reload new SW");
                        console.log("Group Owner has newer software than we do (" + me.version + " vs " + incomingPulse.version + "). QUit, Rejoin, and reload new SW");
                        console.log("Group Owner has newer software than we do (" + me.version + " vs " + incomingPulse.version + "). QUit, Rejoin, and reload new SW");
                        console.log("Group Owner has newer software than we do (" + me.version + " vs " + incomingPulse.version + "). QUit, Rejoin, and reload new SW");
                        console.log("Group Owner has newer software than we do (" + me.version + " vs " + incomingPulse.version + "). QUit, Rejoin, and reload new SW");
                        process.exit(36); //SOFTWARE RELOAD and RECONNECT
                    }
                    //
                    //  groupOwner controls population.
                    // - resync if groupOwner has diff config
                    var ary = myPulseEntry.owls.split(",");
                    for (var owlEntry in ary) {
                        //console.log("PROCESSING GROUP OWNER owls="+myPulseEntry.owls+" ary[ownEntry]="+ary[owlEntry]);
                        var m = parseInt(ary[owlEntry].split("=")[0]);
                        var strOwl = ary[owlEntry].split("=")[1];
                        if (typeof strOwl == "undefined")
                            strOwl = "0";
                        //console.log("Searching for mint "+m);
                        var srcMintEntry = newPulseGroup.mintTable[m];
                        var dstMintEntry = newPulseGroup.mintTable[myPulseEntry.mint];
                        if (srcMintEntry == null || dstMintEntry == null) {
                            console.log("Owner announced a NEW MINT ENTRY " + m + " - syncing with genesis node for new mintTable and pulses for its config");
                            newPulseGroup.syncGenesisPulseGroup(); //any membership change we need resync
                            return;
                        }
                        // var owl=parseInt(strOwl);
                        // newPulseGroup.storeOWL(srcMintEntry.geo,dstMintEntry.geo,owl);  //store owls into my local filestore
                    }
                    //console.log(`groupOwner tells us there are ${owlCount} nodes in thie pulseGroup and we have ${newPulseGroup.nodeCount}`);
                    //TODO: Also resync if the groupOwner has removed an item
                    //console.log("recvPulses - group owner population is in tact");
                }
                newPulseGroup.storeOWL(incomingPulse.geo, newPulseGroup.mintTable[0].geo, incomingPulse.owl); //store pulse latency To me
            }
            else {
                console.log("Received pulse but could not find a matching pulseRecord for it. Ignoring until group owner sends us a new mintTable entry for: " + incomingPulse.geo);
                //newPulseGroup.fetchMintTable();  //this should be done only when group owner sends a pulse with mint we havn't seen
                //maybe also add empty pulse records for each that don't have a pulse record
            }
        });
    };
    //
    //      storeOWL() - store one way latency to file or graphing & history
    //
    newPulseGroup.storeOWL = function (src, dst, owl) {
        grapher_1.grapherStoreOwl(src, dst, owl); //store OWL in a way the grapher can parse it
    };
    //
    //syncGenesisPulseGroup-sync this pulseGorup object with genesis node pulseGroup object
    //  copy mint table and update (add/del) pulseObject pulse entries so we match the genesis node
    //
    newPulseGroup.syncGenesisPulseGroup = function () {
        if (newPulseGroup.isGenesisNode())
            return console.log(lib_1.ts() + "Genesis node does not sync with itself");
        var url = encodeURI('http://' + newPulseGroup.mintTable[1].ipaddr + ":" + newPulseGroup.mintTable[1].port + "/pulsegroup/" + this.groupName + "/" + newPulseGroup.mintTable[0].mint);
        console.log("syncGenesisPulseGroup(): url=" + url);
        http.get(url, function (res) {
            res.setEncoding("utf8");
            var body = "";
            res.on("data", function (data) {
                body += data;
            });
            res.on("end", function () {
                var groupOwnerPulseGroup = JSON.parse(body);
                //console.log("genesis node gave us this: "+dump(groupOwnerPulseGroup));
                var mintTable = groupOwnerPulseGroup.mintTable;
                //console.log("groupName="+dump(groupOwnerPulseGroup.groupName));
                //console.log("mintTable="+dump(mintTable));
                //console.log("****mintTable from genesis node="+dump(mintTable));
                if (groupOwnerPulseGroup.groupOwner != me.geo) {
                    mintTable[0] = newPulseGroup.mintTable[0]; //wbnwbnwbn INSTALL MY mintTable[0]
                }
                newPulseGroup.mintTable = mintTable; //with us as #0, we have the new PulseGroup mintTable
                //console.log("**** after installing my me entry mintTable="+dump(mintTable));
                //                        mintTable.pop(); //pop off the genesis mint0
                //                        console.log("****after POP mintTable="+dump(mintTable));
                //                        mintTable.push(pulseGroup.me);
                //                        console.log("**** after Push() mintTable="+dump(mintTable));
                var pulses = groupOwnerPulseGroup.pulses;
                for (var pulse in pulses) { //Add all mints that we don't have
                    if (typeof newPulseGroup.pulses[pulse] == "undefined") {
                        console.log("syncGenesisPulseGroup(): Adding new pulse entry as my own: " + pulse);
                        console.log("syncGenesisPulseGroup(): Adding new pulse entry as my own: " + pulse);
                        console.log("syncGenesisPulseGroup(): Adding new pulse entry as my own: " + pulse);
                        console.log("syncGenesisPulseGroup(): Adding new pulse entry as my own: " + pulse);
                        console.log("syncGenesisPulseGroup(): Adding new pulse entry as my own: " + pulse);
                        newPulseGroup.pulses[pulse] = pulses[pulse]; //save our new pulse entry
                    }
                }
                for (var pulse in newPulseGroup.pulses) { //Delete all node we have that the group owner does not
                    if (typeof pulses[pulse] == "undefined") {
                        console.log("syncGenesisPulseGroup(): Removing pulse entry that genesis node does not have: " + pulse);
                        console.log("syncGenesisPulseGroup(): Removing pulse entry that genesis node does not have: " + pulse);
                        console.log("syncGenesisPulseGroup(): Removing pulse entry that genesis node does not have: " + pulse);
                        console.log("syncGenesisPulseGroup(): Removing pulse entry that genesis node does not have: " + pulse);
                        console.log("syncGenesisPulseGroup(): Removing pulse entry that genesis node does not have: " + pulse);
                        delete newPulseGroup.pulses[pulse]; //delete this pulse we have but groupOwner does not have
                    }
                }
                newPulseGroup.nodeCount = Object.keys(newPulseGroup.pulses).length;
            });
        });
    };
    //
    // TODO: assign a mew and genesis convenience reference as part of pulseGroup
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
    console.log("===* * * * * * * * * * * * * * * * * * DARP NODE STARTED: pulseGroup=" + lib_1.dump(newPulseGroup));
    //        pulseGroup.forEachNode(function(index:string,node:PulseEntry){console.log("pulseNode: "+index+" node="+dump(node));});
    //        pulseGroup.forEachMint(function(index:string,mint:MintEntry){console.log("MINT:"+index+" mint="+dump(mint));});
    //console.log("pulseGroup="+dump(pulseGroup));
    console.log("Starting pulseGroup " + newPulseGroup.groupName);
    newPulseGroup.recvPulses();
    newPulseGroup.pulse();
    //if (!pulseGroup.isGenesisNode) pulseGroups.push(newPulseGroup);
    //if (!pulseGroup.isGenesisNode) pulseGroups.push(newPulseGroup);
    //else
    myPulseGroup = newPulseGroup;
    myPulseGroups[newPulseGroup.groupName] = newPulseGroup; //for now genesis node has no others
    setTimeout(newPulseGroup.checkSWversion, 5 * 1000); //check that we have the best software
});
//----------------- sender 
/***************** TEST AREA ****************/ 
