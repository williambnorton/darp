//
//  nodefactory.ts - Creatre Configuration for joining our  pulseGroup object
//
//
import {   dump,   now,      ts, MYIP, nth_occurrence } from '../lib/lib';
import {   sendPulses, recvPulses } from './pulselayer';

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

var pulseGroup = {                 //my pulseGroup Configuration
    groupName : me.geo+".1",
    groupOwner : me.geo,
    me : {},
    genesis:{},
    mintTable: [
       me
    ],           
    pulses: {               //store statistics for this network segment
        [genesis.geo + ":" + genesis.geo+".1"]: pulse
    },
    rc: 0,
    ts: now(), 
    nodeCount : 1,      //how many nodes in this pulsegroup
    nextMint : 2,      //assign IP. Allocate IP out of 10.10.0.<mint>
    cycleTime : 600,      //pulseGroup-wide setting: number of seconds between pulses

};
pulseGroup.me=me;
pulseGroup.genesis=genesis;
var pulseGroups=[pulseGroup];
//TO ADD a PULSE: pulseGroup.pulses["newnode" + ":" + genesis.geo+".1"] = pulse;
//TO ADD A MINT: pulseGroup.mintTable[36]=me;
//pulseGroup.mintTable=genesis;

//console.log("--------------------------Starting with my own pulseGroup="+dump(pulseGroup));
//pulseGroup.addNode("MAZORE",GEO+".1","104.42.192.234",65013,PUBLICKEY,VERSION,WALLET);
//console.log("-********************** AFTER pulseGroup="+dump(pulseGroup));

//process.exit(36);
app.get('/', function(req, res) {
    //console.log("fetching '/state'");
    //handleShowState(req, res); 
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(JSON.stringify(pulseGroups, null, 2));
    return
});
app.get('/pulseGroup', function(req, res) {
    //console.log("fetching '/pulseGroup'");
    //handleShowState(req, res); 
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(JSON.stringify(pulseGroups, null, 2));
    return
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


    console.log("........................ SETTING UP NON-GENESIS PULSE NODE ...................");
    console.log("........................ SETTING UP NON-GENESIS PULSE NODE ...................");
    console.log("........................ SETTING UP NON-GENESIS PULSE NODE ...................");
    console.log("........................ SETTING UP NON-GENESIS PULSE NODE ...................");
    console.log("........................ SETTING UP NON-GENESIS PULSE NODE ...................");

    //
    //  Add mint and pulse to my pulsegroup
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

    //console.log("BeforeCloning, pulseGroup="+dump(pulseGroup));

    //function makeMintEntry(mint:number, geo:string, port:number, incomingIP:string, publickey:string, version:string, wallet:string):MintEntry {
    
    //make a copy of the pulseGroup for the new node and set its passed-in startup variables
    let newNodePulseGroup = JSON.parse(JSON.stringify(pulseGroup));    
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
    pulseGroups=[pulseGroup];
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
        wallet: wallet     // ** 
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
        owl: -99999,     //delete this when pulseTimestamp is >2 secs old
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
    console.log("http fetch done");
}

//
//
//



/***************** TEST AREA ****************/
if (TEST) {
    //console.log("* * * * * * * * * Starting  pulseGroup="+dump(pulseGroup));

    joinPulseGroup(GENESIS, PORT, function (newPulseGroup) {
//    joinPulseGroup("71.202.2.184","65013", function (newPulseGroup) {
            console.log("callback from my or someone else's pulseGroup="+dump(pulseGroup));
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
                
                if ( nodeEntry.owl == -99999) owls=""+owls+nodeEntry.mint+",";
                else {
                    //if pulseTimestamp within a second (POLLING CYCLE)
                    owls+=""+owls+nodeEntry.mint+"="+nodeEntry.owl+","
                }
            });
            owls=owls.replace(/,+$/, ""); //remove trailing comma 
            var myEntry=newPulseGroup.pulses[GEO+":"+newPulseGroup.groupName];
            var pulseMessage="0,"+VERSION+","+GEO+","+newPulseGroup.groupName+","+ (myEntry.seq++) +","+newPulseGroup.mintTable[0].bootTimestamp+","+myEntry.mint+","+owls;
            console.log("pulseGroup.pulse(): pulseMessage="+pulseMessage+" to "+dump(ipary));
            sendPulses(pulseMessage,ipary);
            setTimeout(newPulseGroup.pulse,newPulseGroup.cycleTime*1000);
        };

        newPulseGroup.getMint=function(mint:number) {
            for (var m in this.mintTable) {
                if (this.mintTable[m].mint==mint) return this.mintTable[m].mint
            }
            return null;
        }

        newPulseGroup.recvPulses=function (){
            recvPulses(me.port,function(incomingPulse:PulseEntry) {
                console.log("recvPulses incomingPulse="+dump(incomingPulse)+" newPulseGroup="+dump(newPulseGroup));
                var pulseEntry=newPulseGroup.pulses[incomingPulse.geo+":"+incomingPulse.group];
                console.log(`My pulseEntry for ${incomingPulse.geo}:${incomingPulse.group}=`+dump(pulseEntry));
                if (typeof pulseEntry == "undefined") {
                    var mintEntry=newPulseGroup.getMint(incomingPulse.mint);
                    if (mintEntry!=null && (mintEntry.geo==incomingPulse.geo)) {
                        console.log("recvPulses - adding entry cause I found s mint for this node: "+incomingPulse.geo+":"+incomingPulse.group);
                        pulseEntry=newPulseGroup.pulses[incomingPulse.geo+":"+incomingPulse.group]=makePulseEntry(incomingPulse.mint, incomingPulse.geo, incomingPulse.group, incomingPulse.ipaddr, incomingPulse.port, incomingPulse.version); 
                    }
                }

                if (pulseEntry!=null) {     //copy incoming pulse into my record
                    pulseEntry.inPulses++;
                    pulseEntry.lastMsg=incomingPulse.lastMsg;
                    pulseEntry.pulseTimestamp=incomingPulse.pulseTimestamp;
                    pulseEntry.owl=incomingPulse.owl;
                    pulseEntry.owls=incomingPulse.owls;
                    //console.log("owls="+pulseEntry.owls);
                    var ary=pulseEntry.owls.split(",");
                    for(var owlEntry in ary) {
                        console.log("processing owls="+pulseEntry.owls+" ary[ownEntry]="+ary[owlEntry]);
                        var m=ary[owlEntry].split("=")[0];
                        console.log("Searching for mint "+m);
                        if (newPulseGroup.getMint(m)==null) {
                            console.log("getMint - no match - syncing with genesis node for config");
                            return newPulseGroup.syncGenesisPulseGroup();
                        }
                    }
                } else {
                    console.log("Received pulse but could not find our pulseRecord for it. Ignoring until group owner sends us a new list: "+incomingPulse.geo);

                    //newPulseGroup.fetchMintTable();  //this should be done only when group owner sends a pulse with mint we havn't seen
                                                    //maybe also add empty pulse records for each that don't have a pulse record
                }

            });
        };

        newPulseGroup.syncGenesisPulseGroup=function () {   //fetch mintTable and pulses from genesis node
            console.log("fetchGenesisPulseGroup()");
            var http = require("http");
            var url = "http://" + newPulseGroup.genesis.ipaddr + ":" + newPulseGroup.genesis.port + "/pulseGroup";
            //console.log("FETCHMINT              fetchMint(): url="+url);
            http.get(url, function (res) {
                res.setEncoding("utf8");
                var body = "";
                res.on("data", function (data) {
                    body += data;
                });
                res.on("end", function () {
                    var groupOwnerPulseGroup = JSON.parse(body);
                    console.log("groupOwnerPulseGroup="+groupOwnerPulseGroup);
                    
                    var mintTable = groupOwnerPulseGroup.mintTable;
                    if (mintTable == null || typeof mintTable.geo == "undefined") {
                        console.log("Genesis node has no mintTable");
                    } else {
                        newPulseGroup.mintTable=mintTable;
                        var pulses=groupOwnerPulseGroup.pulses;
                        for (var pulse in pulses) {
                            var genesisPulseEntry=pulses[pulse];
                            if (typeof newPulseGroup.pulses[pulse] == "undefined") {
                                console.log("saving new pulse entry as my own: "+pulse);
                                newPulseGroup.pulses[pulse]=pulses[pulse];  //save our new pulse entry
                            }
                        }
                        for (var pulse in newPulseGroup.pulses) {
                            var myPulseEntry=newPulseGroup.pulses[pulse];
                            if (typeof pulses[pulse] == "undefined") {
                                console.log("removing pulse entry that genesis node does not have: "+pulse);
                                newPulseGroup.pulses[pulse]=pulses[pulse];  //save our new pulse entry
                            }
                        }
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
        //console.log("pulse():");
        newPulseGroup.recvPulses();
        newPulseGroup.pulse();
        //if (!pulseGroup.isGenesisNode) pulseGroups.push(newPulseGroup);
        //if (!pulseGroup.isGenesisNode) pulseGroups.push(newPulseGroup);
        //else 
        pulseGroups=[newPulseGroup];  //for now genesis node has no others
    });
}
//----------------- sender 

/***************** TEST AREA ****************/