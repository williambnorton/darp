/** @module pulsegroup Create Configuration for joining our pulseGroup object */

import { dump, now, MYVERSION, Log, median } from './lib';
import { logger, LogLevel } from './logger';
import { sendPulses, recvPulses } from './pulselayer';
import { grapher, grapherStoreOwls } from './grapher';
import express = require('express');
import http = require('http');
import fs = require('fs');
import os = require('os');


logger.setLevel(LogLevel.WARNING);


// Define constants

const CHECK_SW_VERSION_CYCLE_TIME=15;//CHECK SW updates every 15 seconds
const NO_OWL=-99999;
const REFRESH=120;  //Every 2 minutes force refresh
const OWLS_DISPLAYED=30;
// const TEST=true;
// const DEFAULT_SHOWPULSES = "0"
// const DEVIATION_THRESHOLD=20;  //Threshold to flag a matrix cell as "interesting", exceeding this percentage from median
// const DEFAULT_START_STATE="SINGLESTEP";  //for single stepping through network protocol code
// const DEFAULT_START_STATE = "QUARANTINE"; //for single stepping through network protocol code
const DEFAULT_START_STATE="NR"; 
logger.info("pulsegroup: ALL NODES START IN "+DEFAULT_START_STATE+" Mode");
//const DEFAULT_START_STATE="SINGLESTEP"; console.log(ts()+"EXPRESS: ALL NODES START IN SINGLESTEP (no pulsing) Mode");

// Load environment variables

if (!process.env.DARPDIR) {
    logger.warning("No DARPDIR environmental variable specified ");
    process.env.DARPDIR = process.env.HOME + "/darp"
    logger.warning(`DARPDIR defaulted to " + ${process.env.DARPDIR}`);
}

if (!process.env.GENESIS) {
    logger.error(`No GENESIS environmental variable specified - EXITTING`);
    process.exit(86);
}
const GENESIS=process.env.GENESIS;

var PORT=65013;
if (process.env.PORT) {
    PORT = parseInt(process.env.PORT);
}
logger.info(`Starting with PORT=${PORT}`);

var GENESISPORT=PORT;
if (process.env.GENESISPORT) {
    GENESISPORT = parseInt(process.env.GENESISPORT);   //Unless otherwise specified GENESIS PORT is same as user's port
    logger.info(`Setting GENESISPORT to ${GENESISPORT}`);
}

if (!process.env.HOSTNAME) {
    process.env.HOSTNAME = os.hostname().split(".")[0].toUpperCase();
    logger.warning(`No HOSTNAME environmental variable specified + ${process.env.HOSTNAME}`);
}
var HOSTNAME=process.env.HOSTNAME;  //multiport - may want to tack port to name?
if (PORT!=65013) HOSTNAME+="@"+PORT

if (!process.env.VERSION) {
    process.env.VERSION = fs.readFileSync('./SWVersion', {encoding:'utf8', flag:'r'}).trim();
    logger.warning(`No VERSION environmental variable specified - setting to ${process.env.VERSION}`);
}
var VERSION=process.env.VERSION||"NoVersion";

if (!process.env.MYIP) {
    logger.warning("No MYIP environmental variable specified - ERROR - but I will try and find an IP myself from incoming message");
    process.env.MYIP = process.env.GENESIS  // MYIP();
} else {
    process.env.MYIP = process.env.MYIP.replace(/['"]+/g, ''); //\trim string
}
var IP=process.env.MYIP

var PUBLICKEY = process.env.PUBLICKEY || "noPublicKey";
if (!PUBLICKEY) {
    try {
        PUBLICKEY = fs.readFileSync('../wireguard/publickey', 'utf8');
        PUBLICKEY = PUBLICKEY.replace(/^\n|\n$/g, '');
        logger.info("pulled PUBLICKEY from publickey file: >" + PUBLICKEY + "<");
    } catch (err) {
        logger.warning("PUBLICKEY lookup failed");
        PUBLICKEY = "deadbeef00deadbeef00deadbeef0013";
    }
}

var GEO = HOSTNAME; //passed into docker
GEO = GEO.toUpperCase().split(".")[0].split(":")[0].split(",")[0].split("+")[0];  //remove problem characters
var WALLET = process.env.WALLET || "auto";

logger.info(`GENESIS=${GENESIS} GENESISPORT=${GENESISPORT}`);
// Start config/instrumentaton web server

var app = express();
var server = app.listen(PORT, '0.0.0.0', function() {
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


// Define data structures used in the protocol

/** Node configuraton details */
interface MintEntryInterface {
    mint: number;
    geo: string;

    // wireguard configuration details
    port: number;
    ipaddr: string;
    publickey: string;

    state: string;
    bootTimestamp: number;
    version: string;
    wallet: string;
    lastPulseTimestamp: number;
    lastOWL: number;
};

class MintEntry implements MintEntryInterface {
    mint: number;
    geo: string;

    port: number;
    ipaddr: string;
    publickey: string;

    state: string;
    bootTimestamp: number;
    version: string;
    wallet: string;
    lastPulseTimestamp: number;
    lastOWL: number;
    constructor(mint: number, geo: string, port: number, incomingIP: string, publickey: string, version: string, wallet: string) {
        this.mint = mint; 
        this.geo = geo;
        this.port = port;
        this.ipaddr = incomingIP;  //set by genesis node on connection
        this.publickey = publickey;
        this.state = DEFAULT_START_STATE;  // this.state = mint==0 ? DEFAULT_START_STATE : "me";
        this.bootTimestamp = now();  //RemoteClock on startup  ****
        this.version = version;  //software version running on remote system ********
        this.wallet = wallet;  // **
        this.lastPulseTimestamp = 0; //for timing out and validating lastOWL
        this.lastOWL = NO_OWL;  //most recent OWL measurement
    };
};

/** Incoming pulse definition, when deserialized form pulse message. Export for use in pulselayer. */
export interface IncomingPulseInterface {
    outgoingTimestamp: number;
    pulseTimestamp: number;
    msgType: string;
    version:string;
    geo: string;
    group: string;
    seq: number;
    bootTimestamp: number;
    mint: number;
    owls: string;
    owl: number;
    lastMsg: string;
};
 
class IncomingPulse implements IncomingPulseInterface {
    outgoingTimestamp: number;
    pulseTimestamp: number;
    msgType: string;
    version:string;
    geo: string;
    group: string;
    seq: number;
    bootTimestamp: number;
    mint: number;
    owls: string;
    owl: number;
    lastMsg: string;
    constructor (pulseTimestamp: number, outgoingTimestamp: number, msgType: string, 
        version: string, geo: string, group: string, seq: number, bootTimestamp: number,
        mint: number, owls: string, owl: number, lastMsg: string) {
            this.pulseTimestamp = pulseTimestamp;
            this.outgoingTimestamp = outgoingTimestamp;
            this.msgType = msgType;
            this.version = version,
            this.geo = geo;
            this.group = group;
            this.seq = seq;
            this.bootTimestamp = bootTimestamp;   //if genesis node reboots --> all node reload SW too
            this.mint = mint;
            this.owls = owls;
            this.owl = owl;
            this.lastMsg = lastMsg;
        };
};

/** Contains stats for and relevent fields to configure wireguard. */
interface PulseEntryInterface {
    outgoingTimestamp: number;   //from message layer
    pulseTimestamp: number;      //from message layer

    mint: number; //Genesis node would send this 
    geo: string; //record index (key) is <geo>:<genesisGroup>
    group: string; //DEVPOS:DEVOP.1 for genesis node start
    ipaddr: string; //DEVPOS:DEVOP.1 for genesis node start
    port: number; //DEVPOS:DEVOP.1 for genesis node start
    seq: number; //last sequence number heard
    owl: number; //delete this when pulseTimestamp is >2 secs old
    owls: string;
    history: number[];   //history of last 60 owls measured
    medianHistory: number[];  //history of 1-minute medians
    
    // stats
    bootTimestamp: number;
    version: string;
    inPulses: number;
    outPulses: number;
    pktDrops: number;
    lastMsg: string;
};

class PulseEntry implements PulseEntryInterface {
    outgoingTimestamp: number;
    pulseTimestamp: number;

    mint: number;
    geo: string;
    group: string;
    ipaddr: string;
    port: number;
    seq: number;
    owl: number;
    owls: string;
    history: number[];
    medianHistory: number[];

    bootTimestamp: number;
    version: string;
    inPulses: number;
    outPulses: number;
    pktDrops: number;
    lastMsg: string;

    constructor(mint:number, geo:string, group:string, ipaddr:string, port:number, version:string) {
        this.mint = mint;
        this.geo = geo;
        this.group = group;
        this.ipaddr = ipaddr;
        this.port = port;
        this.seq = 1;
        this.owl = NO_OWL;
        this.pulseTimestamp = 0;
        this.owls = "1";  //Startup - I am the only one here
        this.history = [];
        this.medianHistory =[];
        
        this.bootTimestamp = now(); //RemoteClock on startup  **** - we abandon the pulse when this changes
        this.version = version, //software version running on sender's node    
        //
        this.inPulses = 0;
        this.outPulses = 0;
        this.pktDrops = 0;  
        this.lastMsg = "";
        this.outgoingTimestamp = 0;  //sender's timestamp on send
    };
};


type Pulses = {[x: string]: PulseEntryInterface};
type PulseGroups = {[x: string]: PulseGroup};

interface PulseGroupInterface {
    groupName: string;
    groupOwner: string;
    me?: MintEntryInterface;
    genesis?: MintEntryInterface;
    mintTable: MintEntryInterface[];
    pulses: Pulses;
    rc: string;
    ts: number;
    nodeCount: number;
    nextMint: number;
    cycleTime: number;
    matrix: number[][];  //OWL Measurements from participation in the pulseGroup [src][dst]=OWL
    csvMatrix: number[];  //OWLs in CSV format
};

class PulseGroup implements PulseGroupInterface {
    groupName: string;
    groupOwner: string;
    me?: MintEntryInterface;
    genesis?: MintEntryInterface;
    mintTable: MintEntryInterface[];
    pulses: Pulses;
    rc: string;
    ts: number;
    nodeCount: number;
    nextMint: number;
    cycleTime: number;
    matrix: number[][];
    csvMatrix: number[];
    constructor (me: MintEntryInterface, genesis: MintEntryInterface, pulse: PulseEntryInterface) {
        this.groupName = me.geo + ".1";
        this.groupOwner = me.geo;
        this.mintTable = [me, genesis];  // Simplification: me should always be mintTable[0], genesis node should always be mintTable[1]
        //pulseGroup.me and pulseGroup.genesis should be there for convenience though
        //this.pulseGroup.me = me;
        //this.pulseGroup.genesis = genesis;
        this.pulses = {               
            [genesis.geo + ":" + genesis.geo+".1"]: pulse
        };  //store statistics for this network segment
        this.rc = "",
        this.ts = now(), 
        this.nodeCount = 1,  //how many nodes in this pulsegroup
        this.nextMint = 2,  //assign IP. Allocate IP out of 10.10.0.<mint>
        this.cycleTime = 1,  //pulseGroup-wide setting: number of seconds between pulses
        this.matrix = [],
        this.csvMatrix = []
    };
};


interface AugmentedPulseGroupInterface extends PulseGroupInterface {
    adminControl: string;

    addNode: (geo: string, group: string, ipaddr: string, port: number, publickey: string, version: string, wallet: string) => MintEntry;
    buildMatrix: () => void;
    checkSWversion: () => void;
    deleteNode: (ipaddr: string, port: number) => void;
    forEachNode: (callback: CallableFunction) => void;
    forEachMint: (callback: CallableFunction) => void;
    isGenesisNode: () => Boolean;
    pulse: () => void;
    recvPulses: () => void;
    storeOWL: (src:string, dst:string, owl:number) => void;
    syncGenesisPulseGroup: () => void;
    timeout: () => void;
}

type newPulseGroupCallback = (newPulseGroup: AugmentedPulseGroupInterface) => void;


// Construct my own pulseGroup for others to connect to

const me = new MintEntry(1, GEO, PORT, IP, PUBLICKEY, VERSION, WALLET);  //All nodes can count on 'me' always being present
const genesis = new MintEntry(1, GEO, PORT, IP, PUBLICKEY, VERSION, WALLET);  //All nodes also start out ready to be a genesis node for others
var pulse = new PulseEntry(1, GEO, GEO+".1", IP, PORT, VERSION);    //makePulseEntry(mint, geo, group, ipaddr, port, version) 
var myPulseGroup = new PulseGroup(me, genesis, pulse);  //my pulseGroup Configuration, these two me and genesis are the start of the mintTable
var myPulseGroups: PulseGroups = {};  // TO ADD a PULSE: pulseGroup.pulses["newnode" + ":" + genesis.geo+".1"] = pulse;


Log("--------------------------Starting with my own pulseGroup="+dump(myPulseGroup));
//pulseGroup.addNode("MAZORE",GEO+".1","104.42.192.234",65013,PUBLICKEY,VERSION,WALLET);
//console.log("-********************** AFTER pulseGroup="+dump(pulseGroup));

//process.exit(36);
//instrument the pulseGroup
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

    /*
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
    */








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
   txt += '             $("#dateTime").html( "<div class=\'fade-out updated\'><h1>*Updated: " + timeStr + " renderTime="+(1000-sleepTime)+" ms</h1></div>" );' //we show this epoch
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
    txt += '<h1>DARP Node '+me.geo+' http://'+me.ipaddr+":"+me.port+' '+VERSION+'</h1>';

    var d=new Date();
    var timeStr=d.toString().split(' ')[4];

    txt += '<p id="dateTime">*Refresh: '+ timeStr + ' </p>'


    //
    //  externalize pulseGroup matrix
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
        //  Externalize pulse structures 
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
            if (srcMintEntry!=null) {
                //console.log(ts()+"a="+a+" mintEntry"+dump(mintEntry));

                var mintClass="";
                if (a=="0") mintClass+='ME ';
                if (srcMintEntry.mint==1) mintClass+='GENESIS ';
                
                if (srcMintEntry.state=="UP") mintClass+="UP ";
                if (srcMintEntry.state=="NR") mintClass+="NT ";
                
                txt += '<tr class="' + mintClass+srcMintEntry.geo + '" >';

//                txt += '<tr class="'+mintEntry.geo+'">';
                //txt+="<td>"+mintEntry+"</td>"
                txt += "<td>" + srcMintEntry.mint + "</td>";
                txt += '<td class="' + srcMintEntry.state + '">' + '<a target="_blank" href="http://' + srcMintEntry.ipaddr + ':' + srcMintEntry.port + '/" >' + srcMintEntry.geo + "</a></td>";
                txt += "<td>" + srcMintEntry.port + "</td>";
                //if (me.geo!=.ipaddr)
                //    txt += "<td>" + '<a target="_blank" href="http://' + srcMintEntry.ipaddr + ':' + srcMintEntry.port + '/me" >' + srcMintEntry.ipaddr + "</a></td>";
                //else
                    txt += "<td>" + '<a target="_blank" href="http://127.0.0.1:8081/ssh?ubuntu@'+srcMintEntry.ipaddr+'">ssh '+srcMintEntry.ipaddr+'</a></td>';
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









    
    
    
    
    txt += '<p>Connect to this pulseGroup using: docker run -p ' + me.port + ":" + me.port + ' -p ' + me.port + ":" + me.port + "/udp -p 80:80/udp -v ~/wireguard:/etc/wireguard -e GENESIS=" + me.ipaddr + ' -e GENESISPORT='+GENESISPORT+' -e HOSTNAME=`hostname`  -e WALLET=auto -it williambnorton/darp:latest</p>'

    txt += ""
    txt += '<p id="raw">'+JSON.stringify(myPulseGroups,null,2)+'</p>';
    
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
    process.exit(99999) 
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
    //console.log("EXPRess fetching '/state' state");
    //console.log("app.get('/state' callback config="+dump(config));
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(JSON.stringify({}, null, 2));
    return;
});

app.get('/graph/:src/:dst', function(req, res) {
    //console.log("********************** fetching '/'");
    //handleShowState(req, res); 
    res.setHeader('Content-Type', 'text/html');
    res.setHeader("Access-Control-Allow-Origin", "*");
    var dest=req.params.dst; 
    var src=req.params.src;
    var txt='';
    txt+=grapher(src,dest); //get the HTML to display and show graph

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
app.get('/pulsegroup/:pulsegroup/:mint', function(req, res) {
    //console.log("fetching '/pulseGroup' pulsegroup="+req.params.pulsegroup+" req.params.mint="+req.params.mint);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");

    //
    //  pulseGroup 
    //
    if (typeof req.params.pulsegroup != "undefined") { 
        //console.log("pulsegroup="+req.params.pulsegroup+" mint="+req.params.mint);
        for (var pulseGroup in myPulseGroups) {
            if (myPulseGroups[pulseGroup].groupName==req.params.pulsegroup) {
                var mint=0;
                if (typeof req.params.mint != "undefined")  //use our mint 0
                    mint=parseInt(req.params.mint)          //or send mint0 of caller
                
                let clonedPulseGroup = JSON.parse(JSON.stringify(myPulseGroups[pulseGroup]));    //clone my pulseGroup obecjt 
                //newNodePulseGroup.me=newNode;
                clonedPulseGroup.mintTable[0]=clonedPulseGroup.mintTable[mint];  //assign him his mint and config
                //console.log("pulsegroup delivering cloned pulseGroup with customer mint0 for new mint #" +mint+dump(clonedPulseGroup));
                //res.end(JSON.stringify(myPulseGroups[pulseGroup], null, 2));
                res.end(JSON.stringify(clonedPulseGroup, null, 2));  //send the cloned group with his mint as mint0
                return; //we sent the more specific
            }
        }
        //console.log("/pulseGroup/:pulsegroup returning pulseGroup specified "+req.params.pulsegroup);
        res.end(JSON.stringify(null));
    }
    else    {
        logger.warning("No pulseGroup specified");
        res.end(JSON.stringify(myPulseGroups, null, 2));
        return
    }
});

app.get(['/pulsegroups','/state','/me'], function(req, res) {
    //console.log(ts()+"fetching '/pulseGroups' "+req.connection.remoteAddress);
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
//// nodeFactory
//       Configuration for node - allocate a mint
//
app.get('/nodefactory', function(req, res) {
    //console.log(ts() + "NODEFACTORY");

    //
    //  additional nodes adding to pulseGroup
    //
    logger.info('EXPRESS nodeFactory: config requested with params: ' + dump(req.query));

    //
    //  Marshall incoming parameters
    //  

    //console.log("EXPRESS geo="+req.query.geo+" publickey="+req.query.publickey+" query="+JSON.stringify(req.query,null,2)+" port="+req.query.port+" wallet="+req.query.wallet+" version="+req.query.version);
    //marshall variables
    var geo = String(req.query.geo);
    var publickey = String(req.query.publickey);
    var port = Number(req.query.port) || 65013;
    //var genesisport = Number(req.query.genesisport) || port;
    var wallet = String(req.query.wallet) || "";
    var incomingTimestamp = req.query.ts;
    if (typeof incomingTimestamp == "undefined") {
        logger.warning("/nodeFactory called with no timestamp");
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            "rc": "-1 nodeFactory called with no timestamp. "
        }));
        return;
    }

    var incomingIP = req.query.myip;                // for now we believe the node's IP
    var octetCount = 0;
    if (typeof incomingIP === "string") {
        var octetCount = incomingIP.split(".").length;  //but validate as IP, not error msg
    }
    if (octetCount != 4) {
        incomingIP="noMYIP"
    };

    var clientIncomingIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (incomingIP == "noMYIP") incomingIP = clientIncomingIP;
    if (typeof incomingIP == "undefined")
        return logger.error(`incomingIP unavailable from geo=${geo} incomingIP=${incomingIP} clientIncomingIP=${clientIncomingIP}`);
    logger.info(`incomingIP=${incomingIP} clientIncomingIP=${clientIncomingIP} req.myip=${req.query.myip}`);

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
    if (me.ipaddr==incomingIP && (port==GENESISPORT)) {         //GENESIS NODE instantiating itself - don't need to add anything
        console.log(`I AM GENESIS NODE incomingIP=${incomingIP} port=${port} GENESIS=${GENESIS} GENESISPORT=${GENESISPORT} me=`+dump(me));
        logger.info("...........................GENESIS NODE CONFIGURED FINISHED configured...........");
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(myPulseGroup)); 
        return;
    }

//
//  Or - Handle pulseGroup member case
//

    logger.info("........................ SETTING UP NON-GENESIS PULSE NODE ...................");
    logger.info("........................ SETTING UP NON-GENESIS PULSE NODE ...................");
    logger.info("........................ SETTING UP NON-GENESIS PULSE NODE ...................");
    logger.info("........................ SETTING UP NON-GENESIS PULSE NODE ...................");
    logger.info("........................ SETTING UP NON-GENESIS PULSE NODE ...................");

//
//  First, remove previous instances from this IP:port - one IP:port per pulseGroup-we accept the last
// TODO - this next block should probably use the deleteNode code instead.
    for (var mint in myPulseGroup.mintTable) {
        if (mint=="0" || mint=="1") { //ignore mintTable[0] and minttable[1] - never delete these
//        console.log("looking at mint="+dump(pulseGroup.mintTable[mint]));
        } else {
            if ((myPulseGroup.mintTable[mint]!=null) && myPulseGroup.mintTable[mint].ipaddr==incomingIP &&  myPulseGroup.mintTable[mint].port==port) {
                logger.info(`deleting previous mint for this node: ${incomingIP}:${port} mint #${mint} geo=${myPulseGroup.mintTable[mint].geo}`);

                myPulseGroup.mintTable.splice(parseInt(mint));   //make sure not do delete me or genesis node
                //did not delete pulse or
            }
        }
    }
    //
    //  Add pulseGroup mintEntry and pulseEntry and Clone ourselves as the new pulsegroup
    //
    var newMint=myPulseGroup.nextMint++;
    logger.info(`${geo}: mint=${newMint} publickey=${publickey} version=${version} wallet=${wallet}`);
    myPulseGroup.pulses[geo + ":" + myPulseGroup.groupName] = new PulseEntry(newMint, geo, myPulseGroup.groupName, String(incomingIP), port, VERSION);
    //console.log("Added pulse: "+geo + ":" + group+"="+dump(pulseGroup.pulses[geo + ":" + group]));




    //
    //  mintTable - first mintTable[0] is always me and [1] is always genesis node for this pulsegroup
    //
    var newNode = new MintEntry(newMint, geo, port, String(incomingIP), publickey, version, wallet);
    myPulseGroup.mintTable[newMint]=newNode;  //we already have a mintTable[0] and a mintTable[1] - add new guy to end mof my genesis mintTable
    
    logger.info(`added mint# ${newMint} = ${newNode.geo}:${newNode.ipaddr}:${newNode.port}:${newMint} to ${myPulseGroup.groupName}`);
    logger.info("After adding node, pulseGroup="+dump(myPulseGroup));
    myPulseGroup.nodeCount++;
     
    //make a copy of the pulseGroup for the new node and set its passed-in startup variables
    let newNodePulseGroup = JSON.parse(JSON.stringify(myPulseGroup));    //clone my pulseGroup obecjt 
    newNodePulseGroup.mintTable[0]=newNode;  //assign him his mint and config

    //- Here we modify our pulseGroup to be fitted for remote.
    //  this means mintTable[0]  

    logger.info("* Geneis node crteated newNodePulseGroup="+dump(newNodePulseGroup));

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
//  getMyPulseGroupObject() - this will be the pulsegroup object from the genesis node
//
function getMyPulseGroupObject(ipaddr: string, port: number, callback: newPulseGroupCallback) {

    const configurl="http://"+GENESIS+":"+GENESISPORT+"/nodefactory?geo="+GEO+"&port="+PORT+"&publickey="+PUBLICKEY+"&genesisport="+GENESISPORT+"&version="+VERSION+"&wallet="+WALLET+"&myip="+process.env.MYIP+"&ts="+now();
    var pulseGroupObjectURL=encodeURI(configurl);
    logger.info(`getting pulseGroup from url=${pulseGroupObjectURL}`);
    logger.info(`getPulseGroupObject(): pulling from ipaddr=${ipaddr} port ${port}`);

    http.get(pulseGroupObjectURL, function (res) {
        var data = '';
        res.on('data', function (stream) {
            data += stream;
        });
        res.on('error', function() {
            logger.error(`getPulseGroup(): received error from ${pulseGroupObjectURL}`);
            process.exit(36); 
        })

        res.on('end', function () {
            //console.log("********* *******           data="+data);
            var newPulseGroup = JSON.parse(data);            
            logger.info("getPulseGroup(): from node factory:"+dump(newPulseGroup));

            if (newPulseGroup.mintTable[1].publickey==PUBLICKEY) {
                logger.info("getPulseGroup(): My publickey matches genesis node public key - I am genesis node : GENESIS node already configured ");
                //*********** GENESIS NODE CONFIGURED **********/
                //pulseGroups=[newPulseGroup];
                callback(newPulseGroup);
                return;
            } 
            logger.info("getPulseGroup(): Configuring non-genesis node ... ");

            callback(newPulseGroup);
            logger.info("getPulseGroup():- call setWireguard to generate wireguard config for me and genesis node:");
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

getMyPulseGroupObject(GENESIS, GENESISPORT, function (newPulseGroup) {
//    joinPulseGroup("71.202.2.184","65013", function (newPulseGroup) {
    logger.info("callback from my or someone else's pulseGroup="+dump(newPulseGroup));

    //
    //       attach convenience routines to the downloaded pulseGroup assignment
    //
    newPulseGroup.forEachNode = function(callback) {for (var node in this.pulses) callback(node, this.pulses[node]);};
    newPulseGroup.forEachMint = function(callback) {for (var mint in this.mintTable) callback(mint, this.mintTable[mint]);};
    
    //TODO: is this the only place that nodes are added?  I do it manually somewhere...?
    newPulseGroup.addNode = function(geo: string, group: string, ipaddr: string, port: number, publickey: string, version: string, wallet: string) : MintEntry {
        newPulseGroup.deleteNode(ipaddr, port);  //remove any preexisting entries with this ipaddr:port
        var newMint=newPulseGroup.nextMint++;  //get a new mint for new node
        this.pulses[geo + ":" + group] = new PulseEntry(newMint, geo, group, ipaddr, port, VERSION);
        var newNode = new MintEntry(newMint, geo, port, ipaddr, publickey, version, wallet);
        this.mintTable[newMint] = newNode;
        //newPulseGroup.nodeCount++;
        logger.warning("addNode(): added mintEntry and empty pulse entry "+dump(newNode)+dump( this.pulses[geo + ":" + group]));
        newPulseGroup.nodeCount = Object.keys(newPulseGroup.pulses).length;

        return this.mintTable[newMint];
    };

    //
    //  deleteNode() - Genesis node controls population, so delete mintTable, pulse and owl for the mint
    //
    newPulseGroup.deleteNode = function(ipaddr: string, port: number) {
//        console.log(`deleteNode(): ipaddr=${ipaddr} port=${port}`);
        for (var m in newPulseGroup.mintTable) {
            const mintEntry=newPulseGroup.mintTable[m];
//            console.log(`deleteNode(): checking out mintEntry=${dump(mintEntry)} looking for ${ipaddr}`);
            if (mintEntry && m!="0" && m!="1") {  //ignore first mints me and genesis node-e dont delete those
                if (mintEntry.ipaddr==ipaddr && mintEntry.port==port) {
                    logger.warning(`deleteNode(): deleting mint ${mintEntry.mint}`);
//                    console.log(`deleteNode(): DELETEING Mint ${mintEntry.mint}`);
                    delete this.mintTable[mintEntry.mint];  //this shifts all elemenets!!! So mintTable[3] is mint#4 now
//                    console.log(`mintTable after deleteing = ${dump(this.mintTable)}`);
                    //newPulseGroup.mintTable[mintEntry.mint]=null; //we want to preserve the ordering of the nodes (not shift up)
                }
            }
        };
        var deletedMint=-1;
        for (var pulseLabel in this.pulses) {
            const pulseEntry=newPulseGroup.pulses[pulseLabel];
            if (pulseEntry.ipaddr==ipaddr && pulseEntry.port==port) {
                logger.warning("deleteNode: deleting pulse "+pulseLabel);
//                console.log(`deleteNode(): DELETEING Pulse ${pulseEntry.mint}`);

                deletedMint=pulseEntry.mint;
                delete newPulseGroup.pulses[pulseLabel];

            }
        };
        //remnove mint from the group owner's owls list

        if (this.isGenesisNode()) {
            var groupOwnerPulseLabel=newPulseGroup.groupOwner+":"+newPulseGroup.groupName;
            var groupOwnerPulseEntry=newPulseGroup.pulses[groupOwnerPulseLabel];
//            console.log(`deleteNode(): groupOwnerPulseEntry=${dump(groupOwnerPulseEntry)}`);
            if (groupOwnerPulseEntry!=null) {
                var owlEntryAry=groupOwnerPulseEntry.owls.split(",");
                var newOwls="";  //copy all but deleted Owl to control population
                for (var o in owlEntryAry) {
                    if (parseInt(owlEntryAry[o])!=deletedMint) {
                        newOwls+=owlEntryAry[o]+",";
                    } //else console.log(`deleteNode(): deleted owl associated with mint ${deletedMint}`);
                }
            }
        }
        newPulseGroup.nodeCount = Object.keys(newPulseGroup.pulses).length;
    };
    //pulseGroup.pulse = function() {

    //
    //  buildMatrix of objects for each segment - 
    //
    newPulseGroup.buildMatrix=function() {
        //return;//turning off this feature until stable
        var matrix: number[][] = [];
        for (var pulse in newPulseGroup.pulses) {
            const pulseEntry=newPulseGroup.pulses[pulse];
            // console.log("processing "+pulse);
            // newPulseGroup.forEachNode(function(index:string,nodeEntry:PulseEntry) {
            var pulseFreshness=now()-pulseEntry.pulseTimestamp;
            //console.log(`${pulse} pulseFreshness=${pulseFreshness}`);
            if ((now()-pulseEntry.pulseTimestamp) < 2*1000) {  // VALID PULSE
                
                //for each OWLS                 
                var ary=pulseEntry.owls.split(",");      //put all my OWLs into matrix
                for(var owlEntry in ary) {
                    var m=parseInt(ary[owlEntry].split("=")[0]);
                    var owl=NO_OWL;
                    var strOwl=ary[owlEntry].split("=")[1];
                    if (typeof strOwl != "undefined") owl=parseInt(strOwl);
                    if (typeof matrix[m]=="undefined")
                        matrix[m]=[];
                    //console.log("Searching for mint "+m);
                    //console.log(`matrix src ${m} - dst ${nodeEntry.mint} = ${owl}`);
                    matrix[m][pulseEntry.mint]=owl;  //pulse measured to peer
                }
                if (typeof matrix[pulseEntry.mint]=="undefined")
                    matrix[pulseEntry.mint]=[];

                matrix[pulseEntry.mint][newPulseGroup.mintTable[0].mint] = pulseEntry.owl  //pulse measured to me
            } else {                                        //OLD PULSE - CLEAR these entries
                logger.warning(`${pulseEntry.geo} mint#${pulseEntry.mint} has an old pulseTimestamp. Entering NO_OWL for all values to this node`);
                // node did not respond - so we have no data - no entry, should we mark call all NO_OWL
                // newPulseGroup.forEachNode(function(index:string,groupNode:PulseEntry) {
                //    if ((index!="0") && (groupNode.mint!=nodeEntry.mint)) 
                //        matrix[groupNode.mint][nodeEntry.mint]=NO_OWL;  //clear out previously published measurements
                //});

                // if (typeof newPulseGroup.mintTable[0].mint=="undefined")  return console.log("UNDEFINED MINT 0 - too early");
                // console.log(`nodeEntry.mint=${nodeEntry.mint} mymint=${newPulseGroup.mintTable[0].mint}`);

                if (typeof matrix[pulseEntry.mint]=="undefined")
                    matrix[pulseEntry.mint]=[];
                matrix[pulseEntry.mint][newPulseGroup.mintTable[0].mint]=NO_OWL;  //This guy missed his pulse - mark his entries empty
            }
        }

        //for (var s in newPulseGroup.matrix) //INTRUMENTATION POINT
        //    for (var d in newPulseGroup.matrix[s])
        //        console.log(`MATRIX s=${s} d=${d} = ${newPulseGroup.matrix[s][d]}`);
        
        newPulseGroup.matrix=matrix;    //replace existing matrix - 
        //console.log("could publish to subscribers here pulseGroup matrix="+dump(newPulseGroup.matrix));
        
    }

//
//  pulse() - send our OWL measurements to all in the pulseGroup
//
    newPulseGroup.pulse=function() {
        //console.log(`pulse() called newPulseGroup.pulses=${dump(newPulseGroup.pulses)}`);
        var ipary: string[] = [];
        var owls = "";
//        newPulseGroup.forEachNode(function(index: string, pulseEntry: PulseEntryInterface) {
        for (var pulse in newPulseGroup.pulses) {
            var pulseEntry=newPulseGroup.pulses[pulse];
            //console.log(`pulse(): pushing to pulse ${dump(pulseEntry)}`);
            ipary.push(pulseEntry.ipaddr+"_"+ pulseEntry.port);
            pulseEntry.outPulses++;
            
            //**HIGHLIGHT INTERESTING CELLS IN MATRIX CODE */
            var flag="";    //this section flags "interesting" cells to click on and explore
            if ( pulseEntry.owl == NO_OWL) owls+=pulseEntry.mint+",";
            else {
                var medianOfMeasures=median(pulseEntry.history);
                //console.log(`nodeEntry.medianHistory.length=${nodeEntry.medianHistory.length}`);
                if (pulseEntry.medianHistory.length>0) {  //use medianHistory to identify a median to deviate from
                    var medianOfMedians=median(pulseEntry.medianHistory);
                    //var deviation=Math.round(Math.abs(medianOfMedians-medianOfMeasures)*100/medianOfMedians);
                    var deviation=Math.round(Math.abs(medianOfMedians-pulseEntry.owl)*100/medianOfMedians);
                    var delta=Math.abs(medianOfMedians-pulseEntry.owl);
 //TURN ON TO DEBUG FLAGGING                   if (deviation!=0) console.log(`pulse(): geo=${nodeEntry.geo} nodeEntry.owl=${nodeEntry.owl} medianOfMeasures=${medianOfMeasures} medianOfMedians=${medianOfMedians} deviation=${deviation}%`);
//                  if ((nodeEntry.owl>4) && (deviation>DEVIATION_THRESHOLD)) {  //flag if off by 30% from median
                    if (delta>10) {  //flagg if deviation is > 10ms - we can improve that
                        logger.info(`pulse(): Flagging ${pulseEntry.mint}-${newPulseGroup.mintTable[0].mint}=${pulseEntry.owl}  delta=${delta} geo=${pulseEntry.geo} to ${me.geo} nodeEntry.owl=${pulseEntry.owl}@ medianOfMeasures=${medianOfMeasures} medianOfMedians=${medianOfMedians} deviation=${deviation}%`);
                        flag="@" //deviation 30% from the median, flag
                    }
                }
            }
            if (pulseEntry.owl==NO_OWL) owls+=pulseEntry.mint+",";
            else owls+=pulseEntry.mint+"="+pulseEntry.owl+flag+","
       };
        owls=owls.replace(/,+$/, ""); //remove trailing comma 
        var myEntry=newPulseGroup.pulses[GEO+":"+newPulseGroup.groupName];
       //console.log(`pulse(): lookinmg for my entry to pulse: ${GEO}:${newPulseGroup.groupName}`);
       if (myEntry==null) { console.log(`can not find ${GEO}:${newPulseGroup.groupName}`);}
       else { 
            myEntry.seq++;
            var myMint=newPulseGroup.mintTable[0].mint;
            var pulseMessage="0,"+VERSION+","+GEO+","+newPulseGroup.groupName+","+ myEntry.seq +","+newPulseGroup.mintTable[0].bootTimestamp+","+myMint+","+owls;
            //console.log("pulseGroup.pulse(): pulseMessage="+pulseMessage+" to "+dump(ipary));  //INSTRUMENTATION POINT
            sendPulses(pulseMessage,ipary);
        }

        newPulseGroup.timeout(); //and timeout the non-responders
        if ( newPulseGroup.adminControl=='RESYNCH' ) {
            logger.info("Resynching with genesis node...");
            newPulseGroup.syncGenesisPulseGroup();  //fetch new config from genesis
            newPulseGroup.adminControl='';
        }
        newPulseGroup.mintTable[0].state="UP";
        newPulseGroup.mintTable[0].lastPulseTimestamp=now();

        var sleepTime=1000-(now()+1000)%1000;       // start pulse around on the second
        //console.log(`sleepTime=${sleepTime}`); //INSTRUMENTATION POINT - DO NOT DELETE - shows load on node
        setTimeout( newPulseGroup.pulse, sleepTime );
//        setTimeout(newPulseGroup.pulse,newPulseGroup.cycleTime*1000);

    };

    newPulseGroup.isGenesisNode=function():Boolean {
        return newPulseGroup.mintTable[0].geo==newPulseGroup.groupOwner;
    }


    //  two different timeouts
    //  1) update packetLoss counters and clear OWLs in pulseEntry
    //  2) remove nodes that timeout (Genesis manages group population) 
    //      or non-genesis nodes remove the group when genesis node goes away for n=~15 seconds
    //  all pulseTimes are assumed accurate to my local clock
    newPulseGroup.timeout=function() {      //developing here - do not refactor yet
        //var nodeipy=[];
        const startingPulseEntryCount=newPulseGroup.pulses.length;
        for (var m in this.mintTable) {
            //console.log("checking for a pre-existing: "+dump(this.mintTable[m]));
            if ( (m!="0") && m!="1" && this.mintTable[m] && this.mintTable[m].lastPulseTimestamp!=0) {  //ignore mintTable[0]
                var elapsedMSincePulse=(now()-this.mintTable[m].lastPulseTimestamp);
                //console.log(`elapsed ms since last pulse=${elapsedMSincePulse}`);
                if ( elapsedMSincePulse > 2 * newPulseGroup.cycleTime*1000 ) { //timeout after 2 seconds
                    //console.log("m="+m+" elapsedMSincePulse="+elapsedMSincePulse+" clearing OWL in mint entry which missed at least one cycle"+this.mintTable[m].geo);

                    this.mintTable[m].lastOWL=NO_OWL;  //we don't have a valid OWL
                    this.mintTable[m].state="NR";  //We don't know this node's state

                    if (newPulseGroup.isGenesisNode()) { /*GENESIS ONLY*/
                        console.log("m="+m+" I am genesis node not seeing him for elapsedMSincePulse="+elapsedMSincePulse);
                        if (elapsedMSincePulse > 5 * newPulseGroup.cycleTime*1000) { //TIMEOUT MINT after 5 seconds
                            //console.log(`timeout(): DELETE geo=${this.mintTable[m].geo} mint=${this.mintTable[m].mint} NODE with ${elapsedMSincePulse} ms old timestamp `);
                            newPulseGroup.deleteNode(this.mintTable[m].ipaddr, this.mintTable[m].port);
                        }
                    } else { /*  not genesis - only can time out genesis  */
                        var age=now()-newPulseGroup.mintTable[1].lastPulseTimestamp;
                        if (age > 30*1000) {
                            logger.error(`Genesis node disappeared. age of = ${age} ms Exit, our work is done. Exitting. newpulseGorup=${dump(newPulseGroup)}`);
                            process.exit(36);
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
            var pulseEntry=this.pulses[p];
            if ((pulseEntry) && (pulseEntry.pulseTimestamp != 0) && (pulseEntry.mint != 1)) { //don't timeout genesis pulse
                var elapsedMSincePulse=(now()-pulseEntry.pulseTimestamp);
                //console.log(`${this.pulses[p].geo} elapsedSecondsSincePulse=${elapsedSecondsSincePulse}`);
                if (elapsedMSincePulse > 2*newPulseGroup.cycleTime*1000) { //timeout after 2 seconds
                    //console.log(ts()+"timout(): Non-respondong node Clearing OWL in pulse entry "+this.pulses[p].geo+":"+this.groupName);
                    pulseEntry.owl=NO_OWL;
                    pulseEntry.owls="1";
                    pulseEntry.pktDrops++;
                    if (newPulseGroup.isGenesisNode()) {   /*GENESIS ONLY*/
                        //console.log(`I am Genesis Node timing out ${this.pulses[p].geo}`);
                        if ( elapsedMSincePulse > 10 * newPulseGroup.cycleTime*1000) {
                            logger.warning(`timeout() : Genesis DELETING Node ${this.pulses[p].geo} with ${elapsedMSincePulse} ms old timestamp `);
                           // console.log(ts()+"timeout() - Genesis DELETEING PULSE with old timestamp "+this.pulses[p].geo);
                           // console.log(ts()+"timeout() - Genesis DELETEING PULSE with old timestamp "+this.pulses[p].geo);
                           // console.log(ts()+"timeout() - Genesis DELETEING PULSE with old timestamp "+this.pulses[p].geo);
                           // console.log(ts()+"timeout() - Genesis DELETEING PULSE with old timestamp "+this.pulses[p].geo);
                           newPulseGroup.deleteNode(pulseEntry.ipaddr,pulseEntry.port);
                           /*
                           if (newPulseGroup.mintTable[pulseEntry.mint]==null) { //delete this.pulses[p];
                                logger.warning(`DELETEING pulse ${p}`);  //log when timing out to debug
                                delete this.pulses[p];
                            } else {
                                logger.warning(`will delete pulse when mint is gone`);
                            }
                            */

                        }
                    }
                    //delete this.pulses[p];
                }
            }
        }
        
        if (startingPulseEntryCount!=newPulseGroup.pulses.length) {
            logger.info(`timeout(): nodeC0unt Changed from ${startingPulseEntryCount} setting newPulseGroup.nodeCount=${newPulseGroup.pulses.length}`);
        }
        newPulseGroup.nodeCount = Object.keys(newPulseGroup.pulses).length;


        newPulseGroup.buildMatrix();
    }


    newPulseGroup.checkSWversion=function () {
        //console.log("=================================> checkSWversion()");

        if (newPulseGroup.groupOwner==me.geo) 
            return logger.info(`Point your browser to Genesis Node for instrumentation: http://${newPulseGroup.mintTable[0].ipaddr}:${newPulseGroup.mintTable[0].port}`);
        //console.log("checkSWversion newPulseGroup="+dump(newPulseGroup));    
        const url = encodeURI("http://" + newPulseGroup.mintTable[1].ipaddr + ":" + newPulseGroup.mintTable[1].port + "/version?ts="+now()+"&x="+now()%2000);  //add garbage to avoid caches
        //console.log("checkSWversion(): url="+url);

        http.get(url, res => {
            res.setEncoding("utf8");
            let body = "";

            res.on("data", data => {
                body += data;
            });

            res.on('error', function(error) {
                logger.info("checkSWversion():: checkSWversion CAN'T REACH GENESIS NODE"); // Error handling here never triggered TODO
            });

            res.on("end", () => {
                var genesisVersion = JSON.parse(body);
                var mySWversion=MYVERSION(); //find the Build.*
                logger.info(`checkSWversion(): genesis SWversion==${dump(genesisVersion)} MY SW Version=${mySWversion} me.version=${me.version}`);
                if (genesisVersion != mySWversion) {
                    logger.error(`checkSWversion(): NEW SOFTWARE AVAILABLE - GroupOwner said ${genesisVersion} we are running ${mySWversion}. Process exitting`);
                    process.exit(36); //SOFTWARE RELOAD
                }
            });
        });
        setTimeout(newPulseGroup.checkSWversion,CHECK_SW_VERSION_CYCLE_TIME*1000);  //Every 60 seconds check we have the best software
    };

    newPulseGroup.adminControl='';
    //
    //  recvPulses - 
    //
    newPulseGroup.recvPulses=function () {
        recvPulses(me.port, function(incomingPulse: IncomingPulse) {
            //console.log("----------> recvPulses incomingPulse="+dump(incomingPulse));//+" newPulseGroup="+dump(newPulseGroup));
            var incomingPulseEntry=myPulseGroup.pulses[incomingPulse.geo+":"+incomingPulse.group];    
            var incomingPulseMintEntry=newPulseGroup.mintTable[incomingPulse.mint];    // look up the pulse claimed mint

            if (incomingPulseEntry==null || incomingPulseMintEntry==null) {  //show more specifics why pulse is ignored
                    logger.info(`IGNORING ${incomingPulse.geo}:${incomingPulse.group} - we do not have this pulse ${incomingPulse.geo+":"+incomingPulse.group} or mint ${incomingPulse.mint} entry entry`);
                    return;
            }
            
            //pulseGroup owner controls population
            if (newPulseGroup.groupOwner==incomingPulseEntry.geo) {  //group owner pulse here  SECURITY HOLE-more authentiction needed ip:port

                    var owlsAry=incomingPulse.owls.split(",");
                    //addNode/resynch with groupOwner if we don't have this mint, optimize would be fetch only mint we are missing
                    for(var o in owlsAry) {
                        const owlEntry=owlsAry[o];
                        //console.log(" GROUP OWNER Population control checking we have owlEntry="+owlEntry);
                        var mint=parseInt(owlEntry.split("=")[0]);
                        var srcMintEntry=newPulseGroup.mintTable[mint];
                        if (srcMintEntry == null) {  //we do not have this mint in our mintTale
                            logger.info(`Owner announced a  MINT ${mint} we do not have - HACK: re-syncing with genesis node for new mintTable and pulses for its config`);
                            newPulseGroup.syncGenesisPulseGroup(); //HACK: any membership change we need resync
                            return;
                        }
                    }
                    //  deleteNode if its mint is not in announcement
                    for (var pulse in newPulseGroup.pulses) {
                        var myPulseEntry=newPulseGroup.pulses[pulse];
                            //console.log(`ensuring mintEntry.geo=${mintEntry.geo} #${mintEntry.mint} is in the groupOwner annoucnement`);
                            //find each pulse in the group owner announcement or delete/resync
                            var found=false;
 
                            var owlsAry=incomingPulse.owls.split(","); //test probably dont need this
                            //console.log(`owlsAry=${owlsAry} looking for mint #${mymint} --> myPulseEntry=${dump(myPulseEntry)}`);
                            for(var o in owlsAry) {
                                var owlmint=parseInt(owlsAry[o].split("=")[0]);
                                //console.log(`owlmint =${owlmint} mymint=${mymint}`);
                                if (owlmint == myPulseEntry.mint) found=true;
                            }
                            if (!found) {
                                logger.info(`Owner no longer announces  MINT ENTRY ${myPulseEntry.mint} - DELETING mintTable entry, pulseTable entry, and groupOwner owl`);
                                console.log(`Owner no longer announces  MINT ENTRY ${myPulseEntry.mint} - DELETING mintTable entry, pulseTable entry, and groupOwner owl`);

                                newPulseGroup.deleteNode(newPulseGroup.mintTable[myPulseEntry.mint].ipaddr, newPulseGroup.mintTable[myPulseEntry.mint].port);

                                //newPulseGroup.syncGenesisPulseGroup(); //optional.... membership change we need resync

                                    return;
                            }

                    }
            }

            //with miontTable and pulses updated, handle valid pulse

            //console.log(ts()+"recvPulses(): Valid pulse for a mint we know about "+incomingPulse.geo);

            //we expect mintEntry to --> mint entry for this pulse
            //console.log("My pulseEntry for this pulse="+dump(myPulseEntry));
            if (incomingPulseEntry !== undefined) {     
                newPulseGroup.ts=now(); //We got a pulse - update the pulseGroup timestamp

                //copy incoming pulse into my pulse record
                incomingPulseEntry.inPulses++;
                incomingPulseEntry.lastMsg=incomingPulse.lastMsg;
                incomingPulseEntry.pulseTimestamp=incomingPulse.pulseTimestamp;
                incomingPulseEntry.owl=incomingPulse.owl;
                incomingPulseEntry.seq=incomingPulse.seq;
                incomingPulseEntry.owls=incomingPulse.owls;
                incomingPulseEntry.history.push(incomingPulseEntry.owl);
                if (incomingPulseEntry.history.length>60)  //store 60 samples
                    incomingPulseEntry.history.shift();  //drop off the last sample
                var d=new Date(incomingPulseEntry.pulseTimestamp);
                if (d.getSeconds()==0) {
                    incomingPulseEntry.medianHistory.push(median(incomingPulseEntry.history));
                    //console.log(`Wrote MedianHistory median=${median(myPulseEntry.history)} Now myPulseEntry=${dump(myPulseEntry)}`);
                }

                //update mint entry
                incomingPulseMintEntry.lastPulseTimestamp=incomingPulseEntry.pulseTimestamp;  //CRASH mintEntry ==null
                incomingPulseMintEntry.lastOWL=incomingPulseEntry.owl;
                incomingPulseMintEntry.state="UP";
                //console.log("owls="+pulseEntry.owls);

                if (incomingPulseEntry.mint==1) {             //if pulseGroup owner, make sure I have all of his mints
                    //console.log("recvPulse handling owner's pulse and managing population to match his");                            
                    //console.log(`CHECKING SOFTWARE VERSION: My build=(${me.version} vs groupOwner: ${incomingPulse.version}).`);

                    if (incomingPulse.version != me.version) {
                        logger.error(`Group Owner has newer software than we do me: ${me.version} vs genesis: ${incomingPulse.version}). QUit, Rejoin, and reload new SW`);
                        logger.error(`Group Owner has newer software than we do (${me.version} vs ${incomingPulse.version}). QUit, Rejoin, and reload new SW`);
                        logger.error(`Group Owner has newer software than we do (${me.version} vs ${incomingPulse.version}). QUit, Rejoin, and reload new SW`);
                        logger.error(`Group Owner has newer software than we do (${me.version} vs ${incomingPulse.version}). QUit, Rejoin, and reload new SW`);
                        logger.error(`Group Owner has newer software than we do (${me.version} vs ${incomingPulse.version}). QUit, Rejoin, and reload new SW`);
                        process.exit(36); //SOFTWARE RELOAD and RECONNECT
                    }

                    

                    //console.log(`groupOwner tells us there are ${owlCount} nodes in thie pulseGroup and we have ${newPulseGroup.nodeCount}`);
                    //TODO: Also resync if the groupOwner has removed an item
                    //console.log("recvPulses - group owner population is in tact");
                }
//                newPulseGroup.storeOWL(incomingPulse.geo,newPulseGroup.mintTable[0].geo,incomingPulse.owl);  //store pulse latency To me
                newPulseGroup.storeOWL(incomingPulse.geo,newPulseGroup.mintTable[0].geo,incomingPulse.mint);  //store pulse latency To me

            } else {
                logger.warning(`Received pulse but could not find a matching pulseRecord for it. Ignoring until group owner sends us a new mintTable entry for: ${incomingPulse.geo}`);

                //newPulseGroup.fetchMintTable();  //this should be done only when group owner sends a pulse with mint we havn't seen
                                                //maybe also add empty pulse records for each that don't have a pulse record
            }

        });
    };
    
//
//      storeOWL() - store one way latency to file or graphing & history
//
//newPulseGroup.storeOWL=function(src:string,dst:string,owl:number) {
    newPulseGroup.storeOWL=function(src:string,dst:string,srcMint:number) {
        const pulseLabel=src+":"+newPulseGroup.groupName;
        const pulseEntry=newPulseGroup.pulses[pulseLabel];
        if (pulseEntry!=null) {
            var strDataPoints="";  //Format: { label: "22:37:49", y: 10 },
            for (var dp in pulseEntry.medianHistory) strDataPoints+=`{ label: "", y: ${pulseEntry.medianHistory[dp]} },`;
            for (var dp in pulseEntry.history) strDataPoints+=`{ label: "", y: ${pulseEntry.history[dp]} },`;
            console.log(`graph data =${strDataPoints}`);
            grapherStoreOwls(src,dst,strDataPoints);   //store OWL in a way the grapher can parse it
        }
    }

    //
    //syncGenesisPulseGroup-sync this pulseGorup object with genesis node pulseGroup object
    //  copy mint table and update (add/del) pulseObject pulse entries so we match the genesis node
    //
    newPulseGroup.syncGenesisPulseGroup=function () {   //fetch mintTable and pulses from genesis node
        if (newPulseGroup.isGenesisNode()) return logger.info("Genesis node does not sync with itself");
        var url = encodeURI('http://' + newPulseGroup.mintTable[1].ipaddr + ":" + newPulseGroup.mintTable[1].port + "/pulsegroup/"+this.groupName+"/"+newPulseGroup.mintTable[0].mint);
        logger.info(`syncGenesisPulseGroup(): url=${url}`);

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

                if (groupOwnerPulseGroup.groupOwner!=me.geo) {
                    mintTable[0]=newPulseGroup.mintTable[0];  //wbnwbnwbn INSTALL MY mintTable[0]
                }
                newPulseGroup.mintTable=mintTable;  //with us as #0, we have the new PulseGroup mintTable
                //console.log("**** after installing my me entry mintTable="+dump(mintTable));
//                        mintTable.pop(); //pop off the genesis mint0
//                        console.log("****after POP mintTable="+dump(mintTable));

//                        mintTable.push(pulseGroup.me);
//                        console.log("**** after Push() mintTable="+dump(mintTable));


                var pulses=groupOwnerPulseGroup.pulses;
                for (var pulse in pulses) {             //Add all mints that we don't have
                    if (typeof newPulseGroup.pulses[pulse] == "undefined") {
                        logger.info(`syncGenesisPulseGroup(): Adding new pulse entry as my own: ${pulse}`);
                        logger.info(`syncGenesisPulseGroup(): Adding new pulse entry as my own: ${pulse}`);
                        logger.info(`syncGenesisPulseGroup(): Adding new pulse entry as my own: ${pulse}`);
                        logger.info(`syncGenesisPulseGroup(): Adding new pulse entry as my own: ${pulse}`);
                        logger.info(`syncGenesisPulseGroup(): Adding new pulse entry as my own: ${pulse}`);
                        newPulseGroup.pulses[pulse]=pulses[pulse];  //save our new pulse entry
                    }
                }
                for (var pulse in newPulseGroup.pulses) {  //Delete all node we have that the group owner does not
                    if (typeof pulses[pulse] == "undefined") {
                        logger.info(`syncGenesisPulseGroup(): Removing pulse entry that genesis node does not have: ${pulse}`);
                        logger.info(`syncGenesisPulseGroup(): Removing pulse entry that genesis node does not have: ${pulse}`);
                        logger.info(`syncGenesisPulseGroup(): Removing pulse entry that genesis node does not have: ${pulse}`);
                        logger.info(`syncGenesisPulseGroup(): Removing pulse entry that genesis node does not have: ${pulse}`);
                        logger.info(`syncGenesisPulseGroup(): Removing pulse entry that genesis node does not have: ${pulse}`);
                        delete newPulseGroup.pulses[pulse];  //delete this pulse we have but groupOwner does not have
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
    logger.info(`* * * * * * * * * * * * * * * * * * DARP NODE STARTED: pulseGroup=${dump(newPulseGroup)}`);
//        pulseGroup.forEachNode(function(index:string,node:PulseEntry){console.log("pulseNode: "+index+" node="+dump(node));});
//        pulseGroup.forEachMint(function(index:string,mint:MintEntry){console.log("MINT:"+index+" mint="+dump(mint));});
    //console.log("pulseGroup="+dump(pulseGroup));
    logger.info(`Starting pulseGroup ${newPulseGroup.groupName}`);
    newPulseGroup.recvPulses();
    newPulseGroup.pulse();

    //if (!pulseGroup.isGenesisNode) pulseGroups.push(newPulseGroup);
    //if (!pulseGroup.isGenesisNode) pulseGroups.push(newPulseGroup);
    //else
    myPulseGroup=newPulseGroup; 
    myPulseGroups[newPulseGroup.groupName]=newPulseGroup;  //for now genesis node has no others
    setTimeout(newPulseGroup.checkSWversion, 5*1000);  //check that we have the best software

});
//----------------- sender 

/***************** TEST AREA ****************/