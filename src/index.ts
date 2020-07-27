/** entry point */

import express = require('express');
import { logger, LogLevel } from './logger';
import { dump, Log, now } from './lib';
import { grapher } from './grapher';
import { getPulseGroup, AugmentedPulseGroup, Config, MintEntry, PulseEntry, PulseGroup, PulseGroups } from './pulsegroup';


logger.setLevel(LogLevel.INFO);


// Load config

const config = new Config();


// Construct my own pulseGroup for others to connect to

const me = new MintEntry(1, config.GEO, config.PORT, config.IP, config.PUBLICKEY, config.VERSION, config.WALLET);  //All nodes can count on 'me' always being present
const genesis = new MintEntry(1, config.GEO, config.PORT, config.IP, config.PUBLICKEY, config.VERSION, config.WALLET);  //All nodes also start out ready to be a genesis node for others
var pulse = new PulseEntry(1, config.GEO, config.GEO+".1", config.IP, config.PORT, config.VERSION);    //makePulseEntry(mint, geo, group, ipaddr, port, version) 
var myPulseGroup = new PulseGroup(me, genesis, pulse);  //my pulseGroup Configuration, these two me and genesis are the start of the mintTable
var myPulseGroups: PulseGroups = {};  // TO ADD a PULSE: pulseGroup.pulses["newnode" + ":" + genesis.geo+".1"] = pulse;
logger.info(`Starting with my own pulseGroup=${dump(myPulseGroup)}`);


// Start instrumentaton web server

const REFRESH = 120;  //Every 2 minutes force refresh
const OWLS_DISPLAYED = 30;

var app = express();
var server = app.listen(config.PORT, '0.0.0.0', function() {
    //TODO: add error handling here
    const serverAdddress = server.address();
    if (typeof serverAdddress !== 'string' && serverAdddress !== null) {
        var host = serverAdddress.address;
        var port = serverAdddress.port;
        logger.info(`Express app listening at http://${host}:${port}`);
    } else {
        logger.error("Express app initialization failed");
    }
}) //.on('error', console.log);

app.get('/', function(req, res) {
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
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    logger.info(`EXITTING and Stopping the node request from ${ip}`);
    Log("EXITTING and Stopping the node request from "+ip);
    var referer = req.get('Referer');
    if (referer !== undefined) {
        res.redirect(referer);
    } else {
        //TODO
    }
    process.exit(86);
});
 
 app.get('/reboot', function(req, res) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    logger.info(`/reboot: THIS SHOULD KICK YOU OUT OF DOCKER request from ${ip}`);
    Log("reboot: THIS SHOULD KICK YOU OUT OF DOCKER request from "+ip);
    var referer = req.get('Referer');
    if (referer !== undefined) {
        res.redirect(referer);
    } else {
        //TODO
    }
    process.exit(86) 
 });
 
 app.get('/reload', function(req, res) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    logger.info(`EXITTING to reload the system request from: ${ip}`)
    Log("EXITTING to reload the system request from: "+ip)
    var referer = req.get('Referer');
    if (referer !== undefined) {
        res.redirect(referer);
    } else {
        //TODO
    }
    process.exit(36);
 });

 app.get('/asset-manifest.json', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(JSON.stringify({}, null, 2));
    return;
});

app.get('/graph/:src/:dst', function(req, res) {
    res.setHeader('Content-Type', 'text/html');
    res.setHeader("Access-Control-Allow-Origin", "*");
    var dest=req.params.dst; 
    var src=req.params.src;
    var txt='';
    txt+=grapher(src,dest); //get the HTML to display and show graph

    // txt+='<meta http-equiv="refresh" content="'+60+'">';
    // txt+="<html> <head> <script type='text/javascript' src='https://www.gstatic.com/charts/loader.js'></script> <script> google.charts.load('current', {packages: ['corechart', 'line']}); google.charts.setOnLoadCallback(drawBackgroundColor); function drawBackgroundColor() { var data = new google.visualization.DataTable(); data.addColumn('date', 'X'); data.addColumn('number', 'one-way'); data.addRows([";
    // var myYYMMDD=YYMMDD();
    // var path=SRC+"-"+DST+"."+myYYMMDD+'.txt';
    // try {
    //     if (fs.existsSync(path)) {
    //         txt+=fs.readFileSync(path);
    //         console.log(`found graph data file ${path}:${txt}`);
    //     }
    //     else console.log("could not find live pulseGroup graph data from "+path);
    // } catch(err) {
    //     return console.error(err)
    // }
    // txt+=" ]); var options = { hAxis: { title: '"+SRC+"-"+DST+" ("+myYYMMDD+")' }, vAxis: { title: 'latency (in ms)' }, backgroundColor: '#f1f8e9' }; var chart = new google.visualization.LineChart(document.getElementById('chart_div')); chart.draw(data, options); } </script> </head> <body> <div id='chart_div'></div>";
    // txt+="<p><a href="+'http://' + me.ipaddr + ':' + me.port + '>Back</a></p></body> </html>';
    // console.log(`graph txt=${txt}`);

    res.end(txt);
    return;
});


//  this API should be the heart of the project - request a pulseGroup configuration for yourself (w/paramters), 
//  or update your specific pulseGroup to the group owner's 
app.get('/pulsegroup/:pulsegroup/:mint', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");

    // pulseGroup 
    if (typeof req.params.pulsegroup != "undefined") { 
        for (var pulseGroup in myPulseGroups) {
            if (myPulseGroups[pulseGroup].groupName==req.params.pulsegroup) {
                var mint=0;
                if (typeof req.params.mint != "undefined")  // use our mint 0
                    mint=parseInt(req.params.mint)          // or send mint0 of caller
                
                let clonedPulseGroup = JSON.parse(JSON.stringify(myPulseGroups[pulseGroup]));  // clone my pulseGroup obecjt 
                clonedPulseGroup.mintTable[0]=clonedPulseGroup.mintTable[mint];  // assign him his mint and config
                res.end(JSON.stringify(clonedPulseGroup, null, 2));  // send the cloned group with his mint as mint0
                return;  // we sent the more specific
            }
        }
        res.end(JSON.stringify(null));
    }
    else    {
        logger.warning("No pulseGroup specified");
        res.end(JSON.stringify(myPulseGroups, null, 2));
        return;
    }
});

app.get(['/pulsegroups','/state','/me'], function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(JSON.stringify(myPulseGroups, null, 2)); 
    return;
});

app.get('/mintTable', function(req, res) {
    logger.info("fetching '/mintTable' ");
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(JSON.stringify(myPulseGroups, null, 2)); 
    return;
});

// Configuration for node - allocate a mint
app.get('/nodefactory', function(req, res) {
    // additional nodes adding to pulseGroup
    logger.info(`EXPRESS /nodefactory: config requested with params: ${dump(req.query)}`);

    // parse incoming parameters
    var geo = String(req.query.geo);
    var publickey = String(req.query.publickey);
    var port = Number(req.query.port) || 65013;
    var wallet = String(req.query.wallet) || "";
    var incomingTimestamp = req.query.ts;
    if (typeof incomingTimestamp == "undefined") {
        logger.warning("/nodeFactory called with no timestamp");
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            "rc": "-1 nodeFactory called with no timestamp."
        }));
        return;
    }

    var incomingIP = req.query.myip;  // for now we believe the node's IP
    var octetCount = 0;
    if (typeof incomingIP === "string") {
        var octetCount = incomingIP.split(".").length;  // but validate as IP, not error msg
    }
    if (octetCount != 4) {
        incomingIP="noMYIP"
    };

    var clientIncomingIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (incomingIP == "noMYIP") incomingIP = clientIncomingIP;
    if (typeof incomingIP == "undefined")
        return logger.error(`incomingIP unavailable from geo=${geo} incomingIP=${incomingIP} clientIncomingIP=${clientIncomingIP}`);
    logger.info(`incomingIP=${incomingIP} clientIncomingIP=${clientIncomingIP} req.myip=${req.query.myip}`);

    var version = String(req.query.version);

    // handle Genesis node case - first to start up
    if (incomingIP == me.ipaddr && (port==config.GENESISPORT)) {  // Genesis node instantiating itself - don't need to add anything
        console.log(`I AM GENESIS NODE incomingIP=${incomingIP} port=${port} GENESIS=${config.GENESIS} GENESISPORT=${config.GENESISPORT} me=`+dump(me));
        logger.info("...........................GENESIS NODE CONFIGURED FINISHED configured...........");
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(myPulseGroup)); 
        return;
    }

    //  Or - Handle pulseGroup member case
    logger.info("........................ SETTING UP NON-GENESIS PULSE NODE ...................");

    // First, remove previous instances from this IP:port - one IP:port per pulseGroup-we accept the last
    // TODO - this next block should probably use the deleteNode code instead.
    for (var mint in myPulseGroup.mintTable) {
        if (mint=="0" || mint=="1") { 
            // ignore mintTable[0] and minttable[1] - never delete these
            logger.debug(`looking at mint=${dump(myPulseGroup.mintTable[mint])}`);
        } else {
            if ((myPulseGroup.mintTable[mint] != null) && myPulseGroup.mintTable[mint].ipaddr == incomingIP && myPulseGroup.mintTable[mint].port == port) {
                // make sure not do delete me or genesis node
                logger.info(`deleting previous mint for this node: ${incomingIP}:${port} mint #${mint} geo=${myPulseGroup.mintTable[mint].geo}`);
                myPulseGroup.mintTable.splice(parseInt(mint));
            }
        }
    }

    // Add pulseGroup mintEntry and pulseEntry and Clone ourselves as the new pulsegroup
    var newMint = myPulseGroup.nextMint++;
    logger.info(`${geo}: mint=${newMint} publickey=${publickey} version=${version} wallet=${wallet}`);
    myPulseGroup.pulses[geo + ":" + myPulseGroup.groupName] = new PulseEntry(newMint, geo, myPulseGroup.groupName, String(incomingIP), port, config.VERSION);
    logger.debug(`Added pulse: ${geo}:${myPulseGroup.groupName}=${dump(myPulseGroup.pulses[geo + ":" + myPulseGroup.groupName])}`);

    // mintTable - first mintTable[0] is always me and [1] is always genesis node for this pulsegroup
    var newNode = new MintEntry(newMint, geo, port, String(incomingIP), publickey, version, wallet);
    myPulseGroup.mintTable[newMint] = newNode;  // we already have a mintTable[0] and a mintTable[1] - add new guy to end mof my genesis mintTable
    
    logger.info(`Added mint# ${newMint} = ${newNode.geo}:${newNode.ipaddr}:${newNode.port}:${newMint} to ${myPulseGroup.groupName}`);
    logger.info(`After adding node, pulseGroup=${dump(myPulseGroup)}`);
    myPulseGroup.nodeCount++;
     
    // make a copy of the pulseGroup for the new node and set its passed-in startup variables
    let newNodePulseGroup = JSON.parse(JSON.stringify(myPulseGroup));  // clone my pulseGroup object 
    newNodePulseGroup.mintTable[0]=newNode;  // assign him his mint and config
    logger.info("* Geneis node crteated newNodePulseGroup="+dump(newNodePulseGroup));
    console.log(`Here Genesis node should setWireguard RESYNCH for new node ${geo}....`);

    // send response to pulse group member node
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(newNodePulseGroup));  // send mint:0 mint:1 *mint:N groupEntry *entryN
});


// Instrument the pulseGroup

/******* BEGIN INSTRUMENTATION CODE ****/
function instrumentation() {    //this should get its own file
    var txt = '<!DOCTYPE html><meta http-equiv="refresh" content="' + REFRESH + '">'; //TODO: dynamic refresh based on new node adds
    txt += '<head title="DARP">';

    txt += '<script> function startTime() { var today = new Date(); var h = today.getHours(); var m = today.getMinutes(); var s = today.getSeconds(); m = checkTime(m); s = checkTime(s); document.getElementById(\'txt\').innerHTML = h + ":" + m + ":" + s; var t = setTimeout(startTime, 500); } function checkTime(i) { if (i < 10) {i = "0" + i};  return i; } </script>';
//    txt += '<link rel = "stylesheet" type = "text/css" href = "http://drpeering.com/noia.css" /> '
//    txt += '<link rel = "stylesheet" type = "text/css" href = "http://'+me.ipaddr+':'+me.port+'/darp.css" /> '
    txt += "<style>";  //inline so we don't have to do a fetch 
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
     .ME{ \
        color: black;\
        background-color: tan;\
        font-weight: bold;\
    }\
    \
    .GENESIS{ \
        color: black;\
        background-color: grey;\
    }\
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
    txt += "</style>"

    txt +=`<script src="https://code.jquery.com/jquery-3.5.1.min.js" integrity="sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0=" crossorigin="anonymous"></script>`

    txt += "<script>"
    
    txt += '    $( document ).ready(function() {';
    txt += '       console.log( "document loaded" );';
    txt += '       fetchState();';  
    txt += '    });';
 
    txt += '    $( window ).on( "load", function() {';
    txt += '        console.log( "window loaded" );';
    txt += '     });';
    txt += 'var nodeCountLastTime=0;' //We start out with ourselves only
    txt += 'var sleepTime=0;' 
    
    txt += 'function fetchState() {'
    
    txt += 'var url="http://'+me.ipaddr+":"+me.port+'/pulseGroups";';  //For instruementation show multiple pulseGorups
    //txt += 'console.log("getJSON url="+url);';
    txt += '   $.getJSON(url, function(config) {'
    txt += '        $(document.body).css( "background", "white" );'
    //txt += '        console.log("XHR SUCCESS - config="+JSON.stringify(config,null,2));'
    txt += '         for (var n in config) { ';
    txt+=  '            var pulseGroup=config[n];';

    // Fill the OWL matrix using only the owls - TODO: remove matrix ugliness.
    txt += 'for (var src in pulseGroup.pulses) {';
    txt += '    var pulseEntry=pulseGroup.pulses[src];';
    txt += '    if (pulseEntry==null) console.log("ERROR: pulseEntry==null");'
    //txt += '    console.log("pulseEntry="+JSON.stringify(pulseGroup,null,2)+JSON.stringify(pulseEntry,null,2));'
    txt += '    var owls=pulseEntry.owls.split(",");';
    txt += '    for(var owlEntry in owls) {';
    txt += '       var srcMint=parseInt(owls[owlEntry].split("=")[0]);'; //get the
    txt +='        var owl=-99999;';
    txt += '       var strOwl=owls[owlEntry].split("=")[1];';
    txt += '       if (typeof strOwl != "undefined") {';  //<srcMint>[=<owl>[<flag>]],...
    txt += '           owl=parseInt(strOwl);';
    txt += '           var regex = /@/;';
    txt += '           var flag=strOwl.match(regex);';
    
    txt += '            var srcOwlMintEntry=pulseGroup.mintTable[srcMint];';
    txt += '            var destOwlMintEntry=pulseGroup.mintTable[pulseEntry.mint];';
    //txt += '            console.log("srcOwlMintEntry="+JSON.stringify(srcOwlMintEntry,null,2));'
    //txt += '            console.log("destOwlMintEntry="+JSON.stringify(destOwlMintEntry,null,2));'

    txt += '            if (srcOwlMintEntry!=null && destOwlMintEntry!=null) {'
    //txt += '               console.log("non-null src and dest entries");'
    txt += '               var gurl="http://"+destOwlMintEntry.ipaddr+":"+destOwlMintEntry.port+"/graph/"+srcOwlMintEntry.geo+"/"+destOwlMintEntry.geo;';
    txt += '               var myDiv=\'<div class="\'+srcOwlMintEntry.mint+"-"+destOwlMintEntry.mint+\'">\';';
    txt += '               var link="<a target=_blank href="+gurl+">";';
    //txt += '               console.log("Finished non-null");';

    txt += '            } else {'
    //txt += '               console.log("NULL mintEntry in owls - OK for one run "+srcOwlMintEntry+destOwlMintEntry);'
    txt += '               var gurl="http://noMint";';
    txt += '               var myDiv=\'<div class="\'+srcMint+"-"+pulseEntry.mint+\'">\';';
    txt += '               var link="<a target=_blank href="+gurl+">";';
    txt += '            }'
    //txt += '                     console.log("link="+myDiv+link+owl+" ms</a></div>");';
    txt += ' $("."+srcMint+"-"+pulseEntry.mint).html(myDiv+link+owl+" ms</a></div>");';
    //txt += '                     console.log("After link flag="+flag);';





    txt += '             if (flag) {';  //We have an OWL measure that should be investigated
    //txt += '                 console.log("found a flagged entry "+strOwl+" "+srcOwlMintEntry +" "+destOwlMintEntry);';
    //txt += '                 console.log("pulseEntry.mint="+pulseEntry.mint+"srcOwlMintEntry.mint="+srcOwlMintEntry.mint+" destOwlMintEntry.mint="+destOwlMintEntry.mint);';
    

    txt += '               if ((srcOwlMintEntry!=null) && (destOwlMintEntry!=null)) {';
    //txt += '                   console.log("HIGHLIGHTING class="+srcOwlMintEntry.mint+"-"+pulseEntry.mint+"="+strOwl);'
    txt += '                   $("."+srcOwlMintEntry.mint+"-"+pulseEntry.mint).addClass("BUSY");'; 
    txt += '                   $("."+srcOwlMintEntry.mint+"-"+pulseEntry.mint).css("border-color", "yellow").css("border-width", "3px");';
    //txt += '                   console.log("FINISHED HIGHLIGHTING");'
    txt += '               }'
    
    txt += '            } else {'; //if flag
    //txt += '               console.log("UN-flagged entry "+strOwl+" "+srcOwlMintEntry +" "+destOwlMintEntry);';

    txt += '               if (srcOwlMintEntry!=null && destOwlMintEntry!=null) {';
//    txt += '                   console.log("NO FLAG UN--HIGHLIGHTING "+srcOwlMintEntry.mint+"-"+destOwlMintEntry.mint+"="+owl);'
    txt += '                   $("."+srcOwlMintEntry.mint+"-"+pulseEntry.mint).removeClass("BUSY");';    
    txt += '                   $("."+srcOwlMintEntry.mint+"-"+pulseEntry.mint).css("border-color", "black").css("border-width", "3px");;';
//    txt += '                   console.log("FINISHED UN-HIGHLIGHTING");'
    txt += '               }' 
    txt += '            }';




    txt += '        }';
    txt += '     }'; 
    txt += '}';



    txt += '/* here create extraordinary path table */';

    txt += 'function getOWLfrom(srcMint, owls) {';
    txt += '   var ary = owls.split(",");';
    txt += '    for (var i = 0; i < ary.length; i++) {';
    txt += '        var mint = ary[i].split("=")[0];';
    txt += '        if (mint == srcMint) {';
    txt += '            var owl = ary[i].split("=")[1];';
    txt += '            if (typeof owl != "undefined" && owl != null) {';
    txt += '                console.log("returning srcMint="+srcMint+" owl="+owl);'
    txt += '                return owl;';
    txt += '              } else {';
    txt += '                  return -99999;';  //no OWL measurement
    txt += '              }';
    txt += '         }';
    txt += '    }';
    txt += '    return -99999;'; //did not find the srcMint
    txt += '}'
    
    txt += 'function getOwl(srcMint,destMint) {'
    txt += '    var srcMintEntry=pulseGroup.mintTable[srcMint];'; 
    txt += '    if (srcMintEntry==null) return console.log("getOwl() can not find mintTableEntry for "+srcMint);'
    txt += '    var destPulseEntry=pulseGroup.pulses[srcMintEntry.geo+":"+pulseGroup.groupName];'; 
    txt += '    if (destPulseEntry==null) return console.log("getOwl() can not find pulse entry for "+srcMintEntry.geo+":"+pulseGroup.groupName);'; 
    txt += '    console.log("getOwl(): destMint="+destPulseEntry.mint+" destPulseEntry.owls="+destPulseEntry.owls);';

    txt += '    var owl=getOWLfrom(srcMint,destPulseEntry.owls);'; 
    txt += '    console.log("getOwl("+srcMint+"-"+destMint+") returning "+owl);'
    txt += ' return owl;'
    txt += '}'

    txt += 'for (var srcP in pulseGroup.pulses) {';
    txt += '    var srcEntry=pulseGroup.pulses[srcP];'
    txt += '    for (var destP in pulseGroup.pulses) {';
    txt += '        var destEntry=pulseGroup.pulses[destP];';
    txt += '        var direct=getOwl(srcEntry.mint,destEntry.mint);';  //get direct latency measure
    txt += '        console.log("Here we would compare "+srcEntry.mint+"-"+destEntry.mint+"="+direct);'
    txt += '        if (destEntry!=srcEntry) '
    txt += '        for (iP in pulseGroup.pulses) {'
    txt += '            var intermediaryEntry=pulseGroup.pulses[iP];';
    txt += '            if (intermediaryEntry!=srcEntry && intermediaryEntry!=destEntry) {'
    txt += '               var srcToIntermediary=getOwl(srcEntry.mint,intermediaryEntry.mint);'
    txt += '               var intermediaryToDest=getOwl(intermediaryEntry.mint,destEntry.mint);'
    txt += '               var intermediaryPathLatency=srcToIntermediary+intermediaryToDest;'
    txt += '               var delta=intermediaryPathLatency-direct;'
    txt += '               console.log("**** "+srcEntry.mint+"-"+destEntry.mint+"="+direct+" intermediaryPathLatency="+intermediaryPathLatency+" delta="+delta);'
    txt += '            }';
    txt += '        }';
    txt += '    }';
    txt += '}';

   //txt+= '             console.log("pulseGroup="+JSON.stringify(pulseGroup,null,2));'
   //txt += '         console.log("config="+JSON.stringify(config,null,2)+" nodeCountNow="+nodeCountNow+" nodeCountLastTime="+nodeCountLastTime+" find nodeCount somewhere delivered config in: "+JSON.stringify(config,null,2) );'
   txt += '             console.log(" pulseGroup.nodeCount="+pulseGroup.nodeCount+" nodeCountLastTime="+nodeCountLastTime );'
   txt += '             if ( pulseGroup.nodeCount >= 1 ) {'
   txt += '                if (nodeCountLastTime!=0) {'
   txt += '                     if ( nodeCountLastTime != pulseGroup.nodeCount ) {'
   txt += '                         console.log("NEW NODE: HERE I LOCATION RELOAD(): pulseGroup.nodeCount="+pulseGroup.nodeCount+" nodeCountLastTime="+nodeCountLastTime );';
   txt += '                         console.log("NEW NODE: HERE I LOCATION RELOAD(): pulseGroup.nodeCount="+pulseGroup.nodeCount+" nodeCountLastTime="+nodeCountLastTime );';
   txt += '                         console.log("NEW NODE: HERE I LOCATION RELOAD(): pulseGroup.nodeCount="+pulseGroup.nodeCount+" nodeCountLastTime="+nodeCountLastTime );';
   txt += '                         console.log("NEW NODE: HERE I LOCATION RELOAD(): pulseGroup.nodeCount="+pulseGroup.nodeCount+" nodeCountLastTime="+nodeCountLastTime );';
   txt += '                         location.reload();' ;
   txt += '                     }'     
   txt += '                 } else nodeCountLastTime=pulseGroup.nodeCount;'   
   txt += '             }'
   txt += '             nodeCountLastTime=pulseGroup.nodeCount ;';
   
                       //update the dateTime so people know the updates re coming in
   txt += "             var d = new Date(parseInt(pulseGroup.ts)); ";
   txt += "             var now=d.getTime();"
   txt += "             var timeStr=d.toString().split(' ')[4];"
   //       txt += "      var d = new Date(); var now=d.getTime();var timeStr=d.toString().split(' ')[4];"
   //txt += '             $("#dateTime").html( "<div class=\'fade-out\'><h1>*Updated: " + timeStr + "</h1></div>" );' //we show this epoch
   txt += '             $("#dateTime").html( "<div class=\'fade-out updated\'><h1>*Updated: " + timeStr + " renderTime="+(1000-sleepTime)+" ms Uptime:"+Math.round(((now-pulseGroup.mintTable[0].bootTimestamp)/1000)/60)+" minutes</h1></div>" );' //we show this epoch
   txt += '             $("#raw").text( "RAW (best rendered when view source): ["+pulseGroup.groupName+"]="+JSON.stringify(pulseGroup,null,2));';  //wbnwbnwbnwbnwbnwnbn


   //      Render table from information in the state fetched from node
   //
   txt += '      var totalEarn=0.000000;'
   txt += '      for (let [key, value] of Object.entries(pulseGroup.pulses)) {'
   //                txt += '   console.log(`FOR EACH PULSE  ${key}.split(":")[0]: ${value} ---> $("."+pulse.geo+"_"+${key}+").html("+${value}+");`);'
   txt += '          var pulseLabel=key;'   //fill in most fields as counters - plain
   txt += '          var pulse=value;'      //
   txt += '          if (pulse!=null) {'
   txt += '             for (let [field, fieldValue] of Object.entries(pulse)) {'
   // txt += '             console.log("     FOR EACH FIELD       ^field="+field+" fieldValue="+fieldValue);'
 //txt += '                console.log("Setting "+pulse.geo+"_"+field+"="+fieldValue);'
 // txt += '               $("."+pulse.geo+"_"+field).html(fieldValue+"");'
   txt += '                $("."+pulse.geo+"_"+field).text(fieldValue);'
   txt += '              }'

  //. txt += '              console.log("pulse.owl="+pulse.owl);'
   
   txt += '              if (pulse.owl=="-99999") $("."+pulse.geo+"_state").text("NR").addClass("NR").removeClass("UP");' //Add NR class to entire row
   txt += '              else $("."+pulse.geo+"_state").addClass("UP").text("UP").removeClass("NR");' //Add NR class to entire row
   
   txt += '              if (pulse.owl=="-99999") $("."+pulse.geo).addClass("NR").removeClass("UP");' //Add NR class to entire row
   txt += '              else $("."+pulse.geo).addClass("UP").removeClass("NR");' //Add NR class to entire row

   txt += '              if (pulse.pulseTimestamp!="0")'
   txt += '                  $("."+pulse.geo+"_pulseTimestamp").text(""+Math.round((now-pulse.pulseTimestamp)/1000)+" secs ago");'
   txt += '              else $("."+pulse.geo+"_pulseTimestamp").text("0");'
   txt += '              $("."+pulse.geo+"_bootTimestamp").text(""+Math.round((now-pulse.bootTimestamp)/1000)+" secs ago");'        
   txt +='               $("."+pulse.geo+"_owls").text(pulse.owls.substring(0,20));'  //TODO : Align left for this text field
   txt +='               pulse.inPulses=parseInt(pulse.inPulses);'
   txt +='               pulse.outPulses=parseInt(pulse.outPulses);'
   txt += '              $("."+pulse.geo+"_rtt").text(pulse.rtt);'
   txt += '              var balance = (Math.min(pulse.inPulses*1500, pulse.outPulses*1500) / (1000000 * 1000)) * .5;';
   txt += '              totalEarn+=balance;';
   txt += '              balance=balance.toFixed(6);';

   //txt += 'console.log("balance="+balance+ "totalEarn="+totalEarn);'

   txt += '               $("."+pulse.geo+"_balance").text("$" + balance);'  //TODO : Align left for this text field
 
   

//      txt +='           $("."+pulse.geo+"_owls").html(\'<span style="text-align:left>"\'+pulse.owls+"</span>");'  //TODO : Align left for this text field
    txt += '           }'   
    txt += '       }'   
//txt += 'console.log("totalEarn coming in =:"+totalEarn);'
   txt += '       totalEarn=parseFloat(totalEarn).toFixed(6);'
   txt +='        $(".total_earn").text("totalEarn: $"+totalEarn);'
//   txt +='        $(".total_earn").html("totalEarn: $"+totalEarn);'  //TODO : Align left for this text field
//   txt +='           $(".total_earn").html("$" + totalEarn.toFixed(6));'  //TODO : Align left for this text field





    txt += '         }'
    txt += '     '

   txt += '   }).fail(function() { ';
   txt += '       console.log("JSON Fetch error");';
   txt += '        $(document.body).css( "background", "pink" );'
   txt += '   });'

     txt += 'var d = new Date();sleepTime=1000-(d.getTime()+1000)%1000;'
    //txt += '    console.log("sleepTime between fetches="+sleepTime);';  
    txt += "    setTimeout(fetchState,sleepTime);";  
//    txt += "    setTimeout(fetchState,1000);";  
    txt += "}";

    txt += '</script>';
    txt += '</head>';
    txt += '<body>';
    txt += '<h1>DARP Node '+me.geo+' http://'+me.ipaddr+":"+me.port+' '+config.VERSION+'</h1>';

    var d=new Date();
    var timeStr=d.toString().split(' ')[4];

    txt += '<p id="dateTime">*Refresh: '+ timeStr + ' </p>'


    //
    //  INSTRUMENTATION externalize pulseGroup matrix
    //
    for (var p in myPulseGroups) {
        var pulseGroup=myPulseGroups[p];

        //
        //   show OWL Matrix table
        //
        txt += '<br><h2>' + pulseGroup.groupName + ' pulseGroup: ' + pulseGroup.groupName + '</h2><table class="matrix">';
        txt += '<tr><th>'+pulseGroup.groupName+' OWL Matrix</th>'

        //   print OWL headers
        for (var col in pulseGroup.pulses) {
            var colEntry = pulseGroup.pulses[col];
            //txt+='<th><a href="http://'+colEntry.ipaddr+":"+me.port+'/">'+colEntry.geo+":"+colEntry.srcMint+"</a></th>"
            txt += '<th><a target="_blank" href="http://' + colEntry.ipaddr+":"+colEntry.port+'/">' + colEntry.geo + " <b>" + colEntry.mint + "</b></a> </th>"
            //else txt += '<th><a target="_blank" href="http://' + colEntry.ipaddr+":"+colEntry.port+'/">'+ colEntry.mint + "</a></th>"
        }
        txt += "</tr>"

        for (var src in pulseGroup.matrix) {      
            var srcMintEntry=pulseGroup.mintTable[src];  //src mintEntry
            if (srcMintEntry!=null) {
                if (srcMintEntry.state=="UP") txt += '<tr class="'+srcMintEntry.geo+' UP"><td><a target="_blank" href="http://' + srcMintEntry.ipaddr+":"+srcMintEntry.port+'/">'+srcMintEntry.geo+" "+srcMintEntry.mint+'</a></td>'; //heacer on left side
                else txt += '<tr class="'+srcMintEntry.geo+' NR"><td>'+srcMintEntry.geo+" "+srcMintEntry.mint+'</td>'; //heacer on left side
            
                for (var dest in pulseGroup.matrix[src]) {
                    var destMintEntry=pulseGroup.mintTable[parseInt(dest)];
                    //console.log(`dest=${dest}`);
                    if (destMintEntry!=null) txt += '<td class="'+srcMintEntry.mint+"-"+destMintEntry.mint+' '+srcMintEntry.geo+' '+destMintEntry.geo+'">' + '<div class="'+srcMintEntry.mint+"-"+destMintEntry.mint+'">'+ '<a target="_blank" href="http://' + destMintEntry.ipaddr + ':' + destMintEntry.port + '/graph/' + srcMintEntry.geo + '/' + destMintEntry.geo +'" >' + pulseGroup.matrix[src][dest] + " ms</a></div></td>";
                    else txt += '<td class="'+src+"-"+dest+'">' + "ERRnomint"+pulseGroup.matrix[src][dest] + " ms</td>";
                }
                txt +="</tr>"
            }
        }
        txt+="</table>";


        txt += '<br><h2>Extraordinary Network Paths (Better through intermediary)</h2>';
        txt += '<table class="extraordinary">';
        txt += '<tr><th>A Side</th><th>Z Side</th><th>OWL</th><th> </th> <th>intermediary</th><th>ms</th><th>to Z Side</th><th>total ms</th><th>ms better</th>   </tr>'
        txt += '</table>'



        //
        //  INSTRUMENTATION: Externalize pulse structures 
        //
        txt += '<br><h2>' + pulseGroup.groupName + ' pulseGroup' + '</h2><table class="pulses">';
        txt += "<tr>";
        txt += "<th>geo</th>";
        txt += "<th>group</th>";
        txt += "<th>ipaddr</th>";
        txt += "<th>port</th>";
        txt += "<th>seq</th>";
        txt += "<th>pulseTimestamp</th>";
        txt += "<th>mint</th>";
        txt += "<th>owl</th>";
        txt += "<th>wg rtt</th>";
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
            var rowMintEntry=pulseGroup.mintTable[pulseEntry.mint];
            if ((rowMintEntry!=null)&&(rowMintEntry.state=="UP"))
                txt += '<tr class="UP ' + pulseEntry.geo + '" >';
            else txt += '<tr class="NR ' + "unknown geo" + '" >'; //should not happen
            if (rowMintEntry!=null) {
                //            txt+="<td>"+'<a href="http://' + mintEntry.ipaddr + ':' + mintEntry.port + '/" >'+mintEntry.geo+"</a></td>"
                txt += '<td class="' + pulseEntry.geo + ':' + pulseEntry.mint + '">' + '<a target="_blank" href="http://' + pulseEntry.ipaddr + ':' + pulseEntry.port + '/" >' + pulseEntry.geo + '</a>' + "</td>";
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
    //            txt += '<td class="' + pulseEntry.geo + '_owl fade-out"' + '>' + '<a  target="_blank" href="http://' + me.ipaddr + ':' + me.port + '/graph?src=' + pulseEntry.geo + '&dst=' + me.geo + "&group=" + pulseEntry.group + '" >' + pulseEntry.owl + "</a> ms</td>";
                txt += '<td class="' + pulseEntry.geo + '_owl "' + '>' + '<a  target="_blank" href="http://' + me.ipaddr + ':' + me.port + '/graph/' + pulseEntry.geo + '/' + me.geo +'" >' + pulseEntry.owl + "</a> ms</td>";
                txt += '<td class="' + pulseEntry.geo + '_rtt "' + '>' + '<a class="BUSY" target="_blank" href="http://' + me.ipaddr + ':' + me.port + '/graph/' + pulseEntry.geo + '/' + me.geo +'" >' + pulseEntry.rtt + "</a> ms</td>";
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
                } else {
                    txt += "<td>" + "" + "</td>";
                    txt += "<td>" + "" + "</td>";
                }
                var deltaSeconds2 = Math.round((now() - pulseEntry.bootTimestamp) / 1000) + " secs ago";
                if (pulseEntry.bootTimestamp == 0)
                    deltaSeconds2 = "0";
                //txt += "<td>" + now()+" "+entry.pulseTimestamp+ "</td>";
                txt += '<td class="' + pulseEntry.geo + '_bootTimestamp"' + '>' + deltaSeconds2 + "</td>";
                txt += '<td class="' + pulseEntry.geo + '_version"' + '>' + pulseEntry.version + "</td>";
                var balance = (Math.min(pulseEntry.inPulses*1500, pulseEntry.outPulses*1500) / (1000000 * 1000)) * .5; //GB=1000 MB @ 50 cents per
                total = total + balance;
                txt += '<td class="' + pulseEntry.geo + '_balance"' + '> $' + balance.toFixed(6) + "</td>";
                //txt+="<td>"+pulseEntry.lastMsg+"</td>"
            }

                txt += "</tr>";
        }
        txt += '<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td class="total_earn">'+pulseGroup.groupName+' Earnings $' + total.toFixed(6) + '</td></tr>';
        txt += "</table>";
    }


    for (var p in myPulseGroups) {
        var pulseGroup=myPulseGroups[p];
        //
        //  INSTRUMENTATION: Externalize mintTable 
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
            if (srcMintEntry!=null) {
                //console.log(ts()+"a="+a+" mintEntry"+dump(mintEntry));

                var mintClass="";
                if (a=="0") mintClass+='ME ';
                if (srcMintEntry.mint==1) mintClass+='GENESIS ';
                
                if (srcMintEntry.state=="UP") mintClass+="UP ";
                if (srcMintEntry.state=="NR") mintClass+="NR ";
                
                txt += '<tr class="' + mintClass+srcMintEntry.geo + '" >';

//                txt += '<tr class="'+mintEntry.geo+'">';
                //txt+="<td>"+mintEntry+"</td>"
                txt += "<td>" + srcMintEntry.mint + "</td>";
                txt += '<td class="' + srcMintEntry.state + '">' + '<a target="_blank" href="http://' + srcMintEntry.ipaddr + ':' + srcMintEntry.port + '/" >' + srcMintEntry.geo + "</a></td>";
                txt += "<td>" + srcMintEntry.port + "</td>";
                //if (me.geo!=.ipaddr)
                //    txt += "<td>" + '<a target="_blank" href="http://' + srcMintEntry.ipaddr + ':' + srcMintEntry.port + '/me" >' + srcMintEntry.ipaddr + "</a></td>";
                //else
                    txt += "<td>" + '<a target="_blank" href="http://127.0.0.1:8081/ssh?ubuntu@'+srcMintEntry.ipaddr+'">'+srcMintEntry.ipaddr+'</a></td>';
                txt += "<td>" + srcMintEntry.publickey.substring(0, 3) + "..." + srcMintEntry.publickey.substring(40, srcMintEntry.publickey.length) + "</td>";
                txt += '<td class="' + srcMintEntry.geo + ' ' + srcMintEntry.geo + '_state' + ' ' + srcMintEntry.state + '">' + '<a target="_blank" href="http://' + srcMintEntry.ipaddr + ':' + srcMintEntry.port + '/mintTable" >' + srcMintEntry.state + '</a>' + "</td>";
                //                   txt += "<td>" + '<a href="http://' + mintEntry.ipaddr + ':' + mintEntry.port + '/config" >' + mintEntry.state + '</a>' + "</td>"
                //var deltaT = Math.round((now() - mintEntry.pulseTimestamp) / 1000) + " secs ago";
                //if (mintEntry.pulseTimestamp == 0) deltaT = "0";
                //txt += '<td class="'+mintEntry.geo+'_pulseTimestamp"'+'">' + deltaT + "</td>";
                var deltaSeconds = Math.round((now() - srcMintEntry.lastPulseTimestamp) / 1000) + " secs ago";
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
                var deltaSeconds2 = Math.round((now() - srcMintEntry.bootTimestamp) / 1000) + " secs ago";
                if (srcMintEntry.bootTimestamp == 0)
                    deltaSeconds2 = "0";
                //txt += "<td>" + now()+" "+entry.pulseTimestamp+ "</td>";
                txt += '<td class="' + srcMintEntry.geo + '_bootTimestamp"' + '>' + deltaSeconds2 + "</td>";
                txt += "</tr>";
            } //null mintTable entries are OK
        }
        txt += "</table>";
    }
    
    
    txt += '<p>Connect to this pulseGroup using: docker run -p ' + me.port + ":" + me.port + ' -p ' + me.port + ":" + me.port + "/udp -p 80:80/udp -v ~/wireguard:/etc/wireguard -e GENESIS=" + me.ipaddr + ' -e GENESISPORT='+config.GENESISPORT+' -e HOSTNAME=`hostname`  -e WALLET=auto -it williambnorton/darp:latest</p>'

    txt += ""
    txt += '<p id="raw">'+JSON.stringify(myPulseGroups,null,2)+'</p>';
    
    txt += "</body>";
    txt += "</html>"
    //console.log("txt="+txt);
    return txt;
}
/******* END INSTRUMENTATION CODE ****/


// Initiate the protocol

(async () => {
    try {
        myPulseGroup = await getPulseGroup(config);
        myPulseGroups[myPulseGroup.groupName] = myPulseGroup;  // for now genesis node has no others
        logger.info(`DARP NODE STARTED: pulseGroup=${dump(myPulseGroup)}`);
        var augmentedPulseGroup = new AugmentedPulseGroup(config, myPulseGroup);
        augmentedPulseGroup.flashWireguard();  // create our wireguard files based on our mint Table
        augmentedPulseGroup.recvPulses();
        augmentedPulseGroup.pulse();
        setTimeout(augmentedPulseGroup.checkSWversion, 5 * 1000);  // check that we have the best software
        setTimeout(augmentedPulseGroup.measurertt, 2 * 1000); // ping every other second
        // augmentedPulseGroup.addNode("MAZORE",config.GEO+".1","104.42.192.234",65013,config.PUBLICKEY,config.VERSION,config.WALLET);
        // augmentedPulseGroup.addNode("MAZDAL",config.GEO+".1","23.102.167.37", 65013,config.PUBLICKEY,config.VERSION,config.WALLET);
        // augmentedPulseGroup.addNode("MAZASH",config.GEO+".1","52.251.39.60",  65013,config.PUBLICKEY,config.VERSION,config.WALLET);
        // augmentedPulseGroup.addNode("MAZCHI",config.GEO+".1","157.55.208.35", 65013,config.PUBLICKEY,config.VERSION,config.WALLET);
        // augmentedPulseGroup.addNode("MAZPAR",config.GEO+".1","40.89.168.131", 65013,config.PUBLICKEY,config.VERSION,config.WALLET);
        // augmentedPulseGroup.addNode("MAZLON",config.GEO+".1","51.105.5.246",  65013,config.PUBLICKEY,config.VERSION,config.WALLET);
        // augmentedPulseGroup.addNode("MAZAMS",config.GEO+".1","13.73.182.162", 65013,config.PUBLICKEY,config.VERSION,config.WALLET);
        // augmentedPulseGroup.addNode("MAZIND",config.GEO+".1","104.211.95.109",65013,config.PUBLICKEY,config.VERSION,config.WALLET);
        // augmentedPulseGroup.addNode("MAZCAP",config.GEO+".1","40.127.4.79",   65013,config.PUBLICKEY,config.VERSION,config.WALLET);
        // augmentedPulseGroup.addNode("MAZSYD",config.GEO+".1","52.187.248.162",65013,config.PUBLICKEY,config.VERSION,config.WALLET);
    } catch (error) {
        logger.error(error);
    }
})();
