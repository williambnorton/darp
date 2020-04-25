//
// express.ts - set up the "me" and connect to the network by getting config from the genesis node
//
// incoming environmental variables:
//    GENESIS - IP of Genesis node
//    MYIP - my measured IP address
//    DARPDIR - where the code and config reside
//    VERSION - of software running
//    HOSTNAME - human readable text name - we use this for "geo"
//    PUBLICKEY - Public key 
//
import { dump, now, mintList, SRList, ts, getMints, getOwls, dumpState, oneTimePulse, MYIP, MYVERSION } from '../lib/lib';
import { callbackify } from 'util';
//import { pulse } from '../pulser/pulser'
console.log("Starting EXPRESS GENESIS="+process.env.GENESIS+" PORT="+process.env.PORT+" HOSTNAME="+process.env.HOSTNAME+" VERSION="+process.env.VERSION+" MYIP="+process.env.MYIP);

const expressRedis = require('redis');
var expressRedisClient = expressRedis.createClient(); //creates a new client

expressRedisClient.flushall();    //clean slate

var express = require('express');
var app = express();

var mintStack=1;
const DEFAULT_SHOWPULSES="1"
const DEFAULT_START_STATE="SINGLESTEP";  //for single stepping through network protocol code
//const DEFAULT_START_STATE="RUNNING"; console.log(ts()+"EXPRESS: ALL NODES START IN RUNNING Mode");
//const DEFAULT_START_STATE="SINGLESTEP"; console.log(ts()+"EXPRESS: ALL NODES START IN SINGLESTEP (no pulsing) Mode");
/****  NODE SITE CONFIGURATION  ****/

//      Environment is way for environment to control the code
if (! process.env.DARPDIR  ) {
   console.log("No DARPDIR enviropnmental variable specified ");
   process.env.DARPDIR=process.env.HOME+"/darp"
   console.log("DARPDIR defaulted to "+process.env.DARPDIR);
}

if (! process.env.HOSTNAME  ) {
   console.log("No HOSTNAME enviropnmental variable specified ");
   process.env.HOSTNAME=require('os').hostname().split(".")[0];
   console.log("setting HOSTNAME to "+process.env.HOSTNAME);
}

if (! process.env.GENESIS  ) {
   console.log("No GENESIS enviropnmental variable specified - setting DEFAULT GENESIS and PORT");
   process.env.GENESIS="71.202.2.184"
   process.env.PORT="65013"
}
if (! process.env.PORT) {
   console.log("No PORT enviropnmental variable specified - setting DEFAULT GENESIS PORT");
   process.env.PORT="65013"
}
if (! process.env.VERSION) {
   console.log("No VERSION enviropnmental variable specified - setting to noVersion");
   process.env.VERSION=MYVERSION()
}
console.log(ts()+"process.env.VERSION="+process.env.VERSION);
if (! process.env.MYIP) {
   console.log("No MYIP enviropnmental variable specified ");
   process.env.MYIP="noMYIP"
   MYIP();
}
var PUBLICKEY=process.env.PUBLICKEY;
if (!PUBLICKEY)
try {
    PUBLICKEY=require('fs').readFileSync('../wireguard/publickey', 'utf8');
    PUBLICKEY=PUBLICKEY.replace(/^\n|\n$/g, '');
    console.log("pulled PUBLICKEY from publickey file: >"+PUBLICKEY+"<");
} catch (err) {
    console.log("PUBLICKEY lookup failed");
    PUBLICKEY="deadbeef00deadbeef00deadbeef0013";
}

var GEO=process.env.HOSTNAME;   //passed into docker
GEO=GEO.toUpperCase().split(".")[0].split(":")[0].split(",")[0].split("+")[0];
var PORT=process.env.PORT||"65013";         //passed into docker
var WALLET=process.env.WALLET || "584e560b06717ae0d76b8067d68a2ffd34d7a390f2b2888f83bc9d15462c04b2";
//from 
expressRedisClient.hmset("mint:0","geo",GEO,"port",PORT,"wallet",WALLET,"myip",process.env.MYIP,"version",process.env.VERSION,"hotname",process.env.HOSTNAME,"genesis",process.env.GENESIS,"publickey",PUBLICKEY);

/**** CONFIGURATION SET ****/

expressRedisClient.hgetall("mint:0", function (err,me) {
   console.log("EXPRESS starting with me="+dump(me));
   if (me!=null){}
   else {
       console.log(ts()+"EXPRESS NO REDIS");
       process.exit(36)
   }
});


//
//
//
function getMintTableEntries(callback) {
   console.log(ts()+"EXPRESS getMintTableEntries()");
   var mintEntryStack=new Array();
   var lastMintEntry="";
   expressRedisClient.hgetall("gSRlist", function (err,gSRlist) { 
      for (var pulse in gSRlist) lastMintEntry=pulse;

      for (var label in gSRlist) {
         expressRedisClient.hgetall("mint:"+gSRlist[label],function (err,mintEntry) {
            console.log(ts()+"label="+label+" mintEntry "+gSRlist[label]+"="+dump(mintEntry));
            mintEntryStack.push(mintEntry);
            console.log(ts()+"EXPRESS(): getMintTableEntries label="+label+" lastMintEntry="+lastMintEntry);
            if (label==lastMintEntry) 
               callback(mintEntryStack)
         })
      }
   });
}
//
//
//
function getPulseRecordEntries(callback) {
   //console.log(ts()+"EXPRESS getPulseRecords()");
   var pulseEntryStack=new Array();
   var lastPulseEntry="";
   expressRedisClient.hgetall("gSRlist", function (err,gSRlist) { 
      for (var pulse in gSRlist) lastPulseEntry=pulse;
      //console.log(ts()+"getPulseRecords(): gSRlist="+dump(gSRlist)+" lastPulseEntry="+lastPulseEntry);

      for (var pulse in gSRlist) {
         //console.log(ts()+"getPulseRecords(): **** Processing pulse. About to push for "+pulse+" gSRlist[pulse]="+dump(gSRlist[pulse]));
         expressRedisClient.hgetall(pulse,function (err,pulseEntry) {
            //console.log(ts()+"getPulseRecords(): pulseEntry="+dump(pulseEntry));

            pulseEntryStack.push(pulseEntry);
            if (pulse==lastPulseEntry) 
               callback(pulseEntryStack)
         })
      }
   });
}

function getPulseRecordTable(callback) {
   console.log(ts()+"getPulseRecordTable() Starting");

   var txt='<br><h2>pulseTable</h2><table border="1">';
   txt+="<tr>"
   txt+="<th>geo</td>"
   txt+="<th>group</td>"
   txt+="<th>seq</td>"
   txt+="<th>pulseTimestamp</td>"
   txt+="<th>srcMint</td>"
   txt+="<th>owls</td>"
   txt+="<th>inOctets</td>"
   txt+="<th>outOctets</td>"
   txt+="<th>inMsgs</td>"
   txt+="<th>pktDrops</td>"
   txt+="</tr>"
   getPulseRecordEntries(function (pulseRecords) {
      console.log(ts()+"getPulseRecordEntries() brought us "+dump(pulseRecords));

      for (var i in pulseRecords) {
         var pulseEntry=pulseRecords[i]
         //console.log(ts()+"pulseRecordTable(): Working on pulse="+pulse+" pulseRecords[pulse]="+dump(pulseRecords[pulse]));
         txt+="<tr>"
         txt+="<td>"+pulseEntry.geo+"</th>"
         txt+="<td>"+pulseEntry.group+"</th>"
         txt+="<td>"+pulseEntry.seq+"</th>"
         txt+="<td>"+pulseEntry.pulseTimestamp+"</th>"
         txt+="<td>"+pulseEntry.srcMint+"</th>"
         txt+="<td>"+pulseEntry.owls+"</th>"
         txt+="<td>"+pulseEntry.inOctets+"</th>"
         txt+="<td>"+pulseEntry.outOctets+"</th>"
         txt+="<td>"+pulseEntry.inMsgs+"</th>"
         txt+="<td>"+pulseEntry.pktDrops+"</th>"
         txt+="</tr>"
      }
      txt+="</table>";
      callback(txt);
   })

}
//
//
// wbnwbnwbn
function getMintTable(callback) {
   console.log(ts()+"getMintTable() Starting");
   var txt='<br><h2>mintTable</h2><table border="1">';
   txt+="<tr>"
   txt+="<th>mint</th>"
   txt+="<th>geo</th>"
   txt+="<th>port</th>"
   txt+="<th>ipaddr</th>"
   txt+="<th>publickey</th>"
   txt+="<th>state</th>"
   txt+="<th>bootTime</th>"
   txt+="<th>version</th>"
   txt+="<th>wallet</th>"
   txt+="<th>SHOWPULSES</th>"
   txt+="<th>owl</th>"
   txt+="<th>isGenesisNode</th>"
   txt+="<th>clockSkew</th>"
   txt+="<th>CONTROLS</th>"

   txt+="</tr>"

   getMintTableEntries(function (mintTable) {
      console.log(ts()+"getMintTableEntries(): gave array ="+dump(mintTable));

      for (var i in mintTable) {
         var mintEntry=mintTable[i]
         txt+="<tr>"
         txt+="<td>"+mintEntry.mint+"</td>"
         txt+="<td>"+mintEntry.geo+"</td>"
         txt+="<td>"+mintEntry.port+"</td>"
         txt+="<td>"+mintEntry.ipaddr+"</td>"
         txt+="<td>"+mintEntry.publickey+"</td>"
         txt+="<td>"+mintEntry.state+"</td>"
         txt+="<td>"+mintEntry.bootTime+"</td>"
         txt+="<td>"+mintEntry.version+"</td>"
         txt+="<td>"+mintEntry.wallet+"</td>"
         txt+="<td>"+mintEntry.SHOWPULSES+"</td>"
         txt+="<td>"+mintEntry.owl+"</td>"
         txt+="<td>"+mintEntry.isGenesisNode+"</td>"
         txt+="<td>"+mintEntry.clockSkew+"</td>"

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

         txt+="</tr>"
      }
      
      txt+="</table>";
      callback(txt);  //return HTML TABLE of Mint Entries
   })

}

function display(callback) {
var txt="";

   getPulseRecordTable(function(myPulseRecordTable) {
      console.log(ts()+"getPulseRecords(): pulseRecords="+myPulseRecordTable);
      txt+=myPulseRecordTable;
      getMintTable(function (myMintTable) {
         console.log(ts()+"getmintTable(): myMintTable="+myMintTable);
         txt+=myMintTable
         callback(txt)
      })
   })
}

//
//      handleShowState(req,res) - show the node state
//
function handleShowState(req, res) {

   var dateTime = new Date();
   var txt = '<meta http-equiv="refresh" content="' + 30 + '">';

   expressRedisClient.hgetall("mint:0", function (err,me) {
      if (me==null) return console.log("handleShowState(): WEIRD: NULL mint:0");
      if (me.state=="SINGLESTEP") txt = '<meta http-equiv="refresh" content="' + 60 + '">';
      txt += '<html><head>';
   
      txt += '<script> function startTime() { var today = new Date(); var h = today.getHours(); var m = today.getMinutes(); var s = today.getSeconds(); m = checkTime(m); s = checkTime(s); document.getElementById(\'txt\').innerHTML = h + ":" + m + ":" + s; var t = setTimeout(startTime, 500); } function checkTime(i) { if (i < 10) {i = "0" + i};  return i; } </script>';
      txt += '<link rel = "stylesheet" type = "text/css" href = "http://drpeering.com/noia.css" /></head>'
      
      txt += '<body>';
      var insert="";

      //
      // Make Matrix
      //
      display(function (html) {
         txt+=html;
         txt += "</body></html>";
                        
         res.setHeader('Content-Type', 'text/html');
         res.setHeader("Access-Control-Allow-Origin", "*");
         console.log(ts()+"EXPRESS() ShowState About to send: "+txt);
         res.end(txt);
      });
   })
}

//
//
//
app.get('/state', function (req, res) {
   //console.log("fetching '/state'");
   //handleShowState(req, res);
   makeConfig(function(config) {
      //console.log("app.get('/state' callback config="+dump(config));
      expressRedisClient.hgetall("mint:0", function(err, me) {
         config.mintTable["mint:0"]=me;
         //var html="<html>"
         res.setHeader('Content-Type', 'application/json');
         res.setHeader("Access-Control-Allow-Origin", "*");
         res.end(JSON.stringify(config, null, 2));
         return
      });
   })
});

//
//
//
app.get('/', function (req, res) {
   //console.log("fetching '/' ");
   handleShowState(req, res);
   return
});
//
//
//
app.get('/mint/:mint', function (req, res) {
   //console.log("fetching '/mint' state");

   expressRedisClient.hgetall("mint:"+req.params.mint, function(err, mintEntry) {
      res.end(JSON.stringify(mintEntry, null, 2));
      return;
   });
});

//
// used by members to see if SW needs updating -
// This also serves to retrieve members that we lost from reboot
//
app.get('/version', function (req, res) {
   //console.log("EXPRESS fetching '/version'");
   expressRedisClient.hget("mint:0","version",function(err,version){
      //console.log("version="+version);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.end(JSON.stringify(version));
      return;
   })
});
app.get('/stop', function (req, res) {
   //console.log("EXPRess fetching '/state' state");
   console.log("EXITTING and Stopping the node");
   expressRedisClient.hset("mint:0","state","STOP");  //handlepulse will exit 86
   res.redirect(req.get('referer'));

});

app.get('/reload', function (req, res) {
   //console.log("EXPRess fetching '/state' state");
   console.log("EXITTING to reload the system")
   expressRedisClient.hset("mint:0","state","RELOAD");  //handlepulse will exit 36
   res.redirect(req.get('referer'));

});

app.get('/state', function (req, res) {
   //console.log("EXPRess fetching '/state' state");
   makeConfig(function(config) {
      //console.log("app.get('/state' callback config="+dump(config));
      res.setHeader('Content-Type', 'application/json');
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.end(JSON.stringify(config, null, 2));
   })
   return;
});
//
// 
//
app.get('/me', function (req, res) {
   //res.send('express root dir');
   res.setHeader('Content-Type', 'application/json');
   res.setHeader("Access-Control-Allow-Origin", "*");
   expressRedisClient.hgetall("mint:0", function (err,me){
      res.end(JSON.stringify(me, null, 3));
   });
   return;
})

//
//
//
app.get('/SINGLESTEP', function (req, res) {
   expressRedisClient.hgetall( "mint:0", function (err,me) {
      expressRedisClient.hmset( "mint:"+me.mint, {
         state : "SINGLESTEP",
         SHOWPULSES : "0"
      });
      expressRedisClient.hmset( "mint:0", {
         state : "SINGLESTEP",
         SHOWPULSES : "0"
      });
      console.log(ts()+"pulsed - Now in SINGLESTEP state - no pulsing and show no one's pulses");
      console.log(ts()+"SINGLESTEP SINGLESTEP SINGLESTEP SINGLESTEP state - ");
//      res.redirect('http://'+me.ipaddr+":"+me.port+"/");
      res.redirect(req.get('referer'));

   });
});
//
//
//
app.get('/pulseMsg', function (req, res) {
   expressRedisClient.hgetall( "mint:0", function (err,me) {
      expressRedisClient.hmset( "mint:"+me.mint, {
         adminControl : "PULSE",
         SHOWPULSES : "1"
      });
      expressRedisClient.hmset( "mint:0", {
         adminControl : "",
         SHOWPULSES : "1"
      });
      console.log(ts()+"pulse(1) somehow here");
      
      console.log(ts()+"One time PULSE SENT");
//      res.redirect('http://'+me.ipaddr+":"+me.port+"/");
      res.redirect(req.get('referer'));

   });


});



//
// nodeFactory
//       Configuration for node - allocate a mint
//
app.get('/nodefactory', function (req, res) {
   console.log(ts()+"NODEFACTORY");
   console.log(ts()+"NODEFACTORY");
   console.log(ts()+"NODEFACTORY");
   console.log(ts()+"NODEFACTORY");
   console.log(ts()+"NODEFACTORY");
   console.log(ts()+"NODEFACTORY");
   expressRedisClient.hgetall("mint:0", function (err,me) {
      if (me!=null) {
         console.log('EXPRESS nodeFactory: config requested with params: '+dump(req.query));
         //console.log("EXPRESS geo="+req.query.geo+" publickey="+req.query.publickey+" query="+JSON.stringify(req.query,null,2)+" port="+req.query.port+" wallet="+req.query.wallet+" version="+req.query.version);
         var geo=req.query.geo;
         var publickey=req.query.publickey;
         var port=req.query.port||65013;
         var wallet=req.query.wallet||"";
         var incomingTimestamp=req.query.ts;

         var incomingIP=req.query.myip;  /// for now we believe the node's IP
         var clientIncomingIP=req.headers['x-forwarded-for'] || req.connection.remoteAddress;
         if (incomingIP=="noMYIP") incomingIP=clientIncomingIP;
         if (typeof incomingIP == "undefined") 
            return console.log(ts()+"***********************ERROR: incomingIP unavailable from geo="+geo+" inco,ingIP="+incomingIP+" clientIncomingIP="+clientIncomingIP );;
         var octetCount=incomingIP.split(".").length;

         if (typeof incomingTimestamp == "undefined") {
            console.log("/nodeFactory called with no timestamp");
            res.setHeader('Content-Type', 'application/json');   
            res.end(JSON.stringify({ "rc" : "-1 nodeFactory called with no timestamp. "}));
            return;
         }
         if (octetCount!=4) {
            console.log("EXPRESS(): nodefactory called with bad IP address:"+incomingIP+" returning rc=-1 to config geo="+geo);
            res.setHeader('Content-Type', 'application/json');   
            res.end(JSON.stringify({ "rc" : "-1 nodeFactory called with BAD IP addr: "+incomingIP }));
            return;
         }

         //console.log("req="+dump(req));
         var version=req.query.version;
         //console.log("EXPRESS /nodefactory geo="+geo+" publickey="+publickey+" port="+port+" wallet="+wallet+" incomingIP="+incomingIP+" version="+version);
         //console.log("req="+dump(req.connection));
         // On Startup, only accept connections from me, and the test is that we have matching publickeys
         console.log(ts()+"EXPRESS: mintStack="+mintStack+" publickey="+publickey+" me.publickey="+me.publickey);
         console.log("EXPRESS: Received connection request from "+geo+"("+incomingIP+")" );
         if ((mintStack==1 && (publickey==me.publickey)) || (mintStack!=1)) {   //check publickey instead!!!!!
            if (geo=="NORTONDARP") {
               //console.log(ts()+"Filtering"); //this will eventually be a black list or quarentine group
            } else {
               provisionNode(mintStack++,geo,port,incomingIP,publickey,version,wallet, incomingTimestamp, function (config) {
               //console.log(ts()+"EXPRESS nodeFactory sending config="+dump(config));
               res.setHeader('Content-Type', 'application/json');   
               res.end(JSON.stringify( config ));  //send mint:0 mint:1 *mint:N groupEntry *entryN
               }) 
            }
         }
         //} else console.log("EXPRESS: Received pulse from "+geo+"("+incomingIP+") before my genesis node was set up. IGNORING.");
      } else console.log("EXPRESS has no me out of redis");
   });
});

//
//
//
function makeConfig(callback) {
   console.log("makeConfig() ");

   expressRedisClient.hgetall("mint:0", function(err, me) {
      expressRedisClient.hgetall("gSRlist", function(err,gSRlist) {
         console.log("gSRlist="+dump(gSRlist));
         fetchConfig(gSRlist, null, function(config) {
            //console.log("getConfig(): callback config="+dump(config));
            callback(config); //call sender
         });
      });
   });
}

//
// Fills ofig structure with gSRlist and all associated mints and pulseEnries
//
function fetchConfig(gSRlist, config, callback) {
   if (typeof config == "undefined" || config==null) {
      //console.log(ts()+"fetchConfig(): STARTING ECHO: gSRlist="+dump(gSRlist)+" config="+dump(config)+" ");
      config={
         gSRlist : gSRlist,
         mintTable : {},
         pulses : {},
         entryStack : new Array()             
      }
      for (var index in gSRlist) {
         //console.log("pushing "+index);
         config.entryStack.push({ entryLabel:index, mint:gSRlist[index]})
      }
      //onsole.log("entryStack="+dump(config.entryStack));
   }
   //Whether first call or susequent, pop entries until pop fails
   var entry=config.entryStack.pop();
   //console.log("EXPRESS() popped entry="+dump(entry));
   if (entry) {
      var mint=entry.mint;
      var entryLabel=entry.entryLabel;
      expressRedisClient.hgetall("mint:"+mint, function (err,mintEntry) {   
         if (err) console.log("ERROR: mintEntry="+mintEntry)                     
         if (mintEntry) config.mintTable["mint:"+mint] = mintEntry;  //set the pulseEntries
         //console.log("EXPRESS() mint="+mint+" mintEntry="+dump(mintEntry)+" config="+dump(config)+" entryLabel="+entryLabel);
         //                       MAZORE:DEVOPS.1
         expressRedisClient.hgetall(entryLabel, function (err,pulseEntry) {
            config.pulses[entryLabel] = pulseEntry;  //set the corresponding mintTable
            //console.log("EXPRESS() RECURSING entryLabel="+entryLabel+" pulseEntry="+dump(pulseEntry)+" config="+dump(config));
            fetchConfig(gSRlist,config,callback);  //recurse until we hit bottom
         });
      });
   } else {
      delete config.entryStack;
      //console.log(ts()+"fetchConfig(): returning "+dump(config));
      callback(config);  //send the config atructure back
   }
}

function makeMintEntry(mint,geo,group,port,incomingIP,publickey,version,wallet, incomingTimestamp) {
   return {    //mint:0 is always "me"
      "mint" : ""+mint,      //mint:1 is always genesis node
      "geo" : geo,
      "group" : group,  //assigning nodes in this group now
      // wireguard configuration details
      "port" : ""+port,
      "ipaddr" : incomingIP,   //set by genesis node on connection
      "publickey" : publickey,
      "state" : DEFAULT_START_STATE,
      "bootTime" : ""+incomingTimestamp,   //RemoteClock on startup
      "version" : version,  //software version
      "wallet" : wallet,
      "SHOWPULSES" : DEFAULT_SHOWPULSES,
      "owl" : "",   //
      "isGenesisNode" : (mint==1)?"1":"0",
      "clockSkew" : ""+(now()-incomingTimestamp) //=latency + clock delta between pulser and receiver
   }
}

function makePulseEntry(mint,geo,group) {
   return  {  //one record per pulse - index = <geo>:<group>
      "geo" : geo,            //record index (key) is <geo>:<genesisGroup>
      "group": group,      //DEVPOS:DEVOP.1 for genesis node start
      "seq" : "0",         //last sequence number heard
      "pulseTimestamp": "0", //last pulseTimestamp received from this node
      "srcMint" : ""+mint,      //Genesis node would send this 
      "owls" : "1",        //Startup - I am the only one here
      "inOctets": "0",
      "outOctets": "0",
      "inMsgs": "0",
      "outMsgs": "0",
      "pktDrops": "0"   //,     //as detected by missed seq#
   };
}

//
// For Genesis node, create
//       mint:0 mint:1 genesisGeo:genesisGroup & add to gSRlist
// For Non-Genesis, create
//
//       mint:0 mint:1 *mint:N genesisGeo:genesisGroup *geoN:genesisGroup and update gSRlist and genesis OWLs
//                         '*' means for non-Genesis nodes
//                         
function provisionNode(newMint,geo,port,incomingIP,publickey,version,wallet, incomingTimestamp, callback) {
   //console.log(ts()+"provisionNode(): newMint="+newMint+" geo="+geo);

   expressRedisClient.hgetall("mint:1", function (err, mint1) {
      //create mint and entry as if this was the genesis node
      var mint0=makeMintEntry( newMint,geo,geo+".1",port,incomingIP,publickey,version,wallet, incomingTimestamp )
      if (newMint==1) {
         expressRedisClient.hmset("mint:0",mint0, function (err,reply){
            expressRedisClient.hmset("mint:1",mint0, function (err,reply){
               var mint1=mint0; //make a copy for readaibility
               var genesisPulseGroupEntry=makePulseEntry( newMint, geo, geo+".1" );      
               expressRedisClient.hmset(mint1.geo+":"+mint1.group, genesisPulseGroupEntry, function (err,reply){  // genesisGroupPulseEntry
                  expressRedisClient.hmset("gSRlist",mint1.geo+":"+mint1.group,"1", function (err,reply){ //Add our Genesis Group Entry to the gSRlist
                     makeConfig(function (config) {
                        //console.log(ts()+"makeConfig");
                        config.mintTable["mint:0"]=mint0;  //    Install this new guy's mint0 into config
                        config.rc="0";
                        config.isGenesisNode="1";
                        config.ts=now();  //give other side a notion of my clock when I sent this
                        //config.isGenesisNode=(config.mintTable["mint:0"].mint==1)
                        //console.log(ts()+"EXPRESS:  Sending config:"+dump(config));
                        callback(config);   //parent routine's callback
                     })
                  });
               }); //Create GENESIS GroupEntry:DEVOPS:DEVOPS.1
            }); //mint:1 is always the GENESIS NODE
         }); //mint:0 always is "me" we are GENESIS NODE
      }
      else {
         expressRedisClient.hgetall("mint:0", function (err,mint0){
            expressRedisClient.hgetall("mint:1", function (err,mint1){
               var mint1=mint0; //make a copy for readaibility
               expressRedisClient.hgetall(mint1.geo+":"+mint1.group, function (err,genesisGroupEntry){
                  expressRedisClient.hgetall("gSRlist", function (err,gSRlist){ //Add our Genesis Group Entry to the gSRlist
 
                     var mintN=makeMintEntry( newMint,geo,mint1.group,port,incomingIP,publickey,version,wallet, incomingTimestamp )
                     expressRedisClient.hmset("mint:"+newMint, mintN, function (err,reply){
                        var newNodePulseEntry=makePulseEntry(newMint,geo,mint1.group)
                        expressRedisClient.hmset(geo+":"+mint1.group, mintN, function (err,reply){
                           expressRedisClient.hmset("gSRlist",geo+":"+mint1.group,""+newMint, function (err,reply){ //Add our Entry to the genesisGroup in gSRlist
                              genesisGroupEntry.owls=genesisGroupEntry.owls+","+newMint
                              var config={
                                 gSRlist : {
                                    [mint1.geo+":"+mint1.group] : "1",
                                    [geo+":"+mint1.group] : ""+newMint
                                 },                                 
                                 mintTable : {
                                    "mint:0" : mintN,
                                    "mint:1" : mint1,
                                    ["mint:"+newMint] : mintN
                                 },
                                 pulses : {
                                    [mint1.geo+":"+mint1.group] : genesisGroupEntry,
                                    [geo+":"+mint1.group] : newNodePulseEntry
                                 },
                                 rc : "0",
                                 isGenesisNode : "0",
                                 ts : ""+now()
                              }

                              //console.log(ts()+"newMint="+newMint+" "+dump(config));
                           
                              expressRedisClient.hmset(mint1.geo+":"+mint1.group, "owls",genesisGroupEntry.owls);
                              //expressRedisClient.hmset(geo+":"+mint1.group, "owls",genesisGroupEntry.owls);

                              callback(config)
                              /*
                              makeConfig(function (config) {

                                 console.log(ts()+"makeConfig");
                                 config.mintTable["mint:0"]=mint0;  //    Install this new guy's mint0 into config
                                 config.rc="0";
                                 config.ts=now();  //give other side a notion of my clock when I sent this
                                 //config.isGenesisNode=(config.mintTable["mint:0"].mint==1)
                                 console.log(ts()+"EXPRESS:  Sending config:"+dump(config));
                                 callback(config);   //parent routine's callback
                              })
                              */
                           });
                        });
                     });
                  });
               }); //Create GENESIS GroupEntry:DEVOPS:DEVOPS.1
            }); //mint:1 is always the GENESIS NODE
         }); //mint:0 always is "me" we are GENESIS NODE
      }

      //if (newMint==1) expressRedisClient.hmset("mint:1",mint0); //mint:1 is always the GENESIS NODE
      //if (newMint==1) expressRedisClient.hmset(mint1.geo+":"+mint1.group,mint1); //Create GENESIS GroupEntry:DEVOPS:DEVOPS.1
      //if (newMint==1) expressRedisClient.hmset("gSRlist",mint1.geo+":"+mint1.group,"1"); //Add our Genesis Group Entry to the gSRlist
/**
      //      "isGenesisNode" : "1",
      var mintN=makeMintEntry( newMint,geo,geo+".1",port,incomingIP,publickey,version,wallet, incomingTimestamp )

      if (mint1==null) {         //  GENESIS NODE BEING FORMED - 
         console.log(ts()+"SETTING OURSELVES UP AS GENESIS NODE");

         mint1=mint0;            //Genesis mint:1 is mint:0 (me)
         expressRedisClient.hmset("mint:1",mint1);  //create mint:1 as clone of mint:0

         //create the group entry while we are at it
         
         expressRedisClient.hmset([geo+":"+geo+".1"], genesisPulseGroupEntry); 
         expressRedisClient.hmset("gSRlist", geo+":"+geo+".1", "1");
         console.log(ts()+"At this point we should have mint:0 mint:1 and group Entry defined... newMint="+newMint);
         expressRedisClient.hgetall("mint:0", function(err,mint0) { console.log("mint0="+dump(mint0));});
         expressRedisClient.hgetall("mint:1", function(err,mint1) { console.log("mint1="+dump(mint1));});
         expressRedisClient.hgetall("DEVOPS:DEVOPS.1", function(err,mint1) { console.log("DEVOPS:DEVOPS.1="+dump(mint1));});
      }  //At this point we have mint:0 mint:1 and group Entry defined <-- this is enough for genesi node
      
      //                      Non-Genesis Node - create the newGeo:genesisGroup entry and add to gSRlist
      ////       mint:0 mint:1 *mint:N genesisGeo:genesisGroup *geoN:genesisGroup and update gSRlist and genesis OWLs

      if (newMint!=1) {
         console.log(ts()+"SETTING UP NON-GENESIS NODE to connect with Genesis Node: "+mint1.group);
         console.log(ts()+"At this point we should have mint:0 mint:1 and group Entry defined... newMint="+newMint);
         expressRedisClient.hgetall("mint:0", function(err,mint0) { console.log("mint0="+dump(mint0));});
         expressRedisClient.hgetall("mint:1", function(err,mint1) { console.log("mint1="+dump(mint1));});
         expressRedisClient.hgetall("DEVOPS:DEVOPS.1", function(err,mint1) { console.log("DEVOPS:DEVOPS.1="+dump(mint1));});
         mint0.group=mint1.group;  //adjust this node mint:0 to be part of genesis group
         mintN=makeMintEntry( newMint,geo,mint1.group,port,incomingIP,publickey,version,wallet, incomingTimestamp )
         expressRedisClient.hmset("mint:"+newMint,mintN);
         expressRedisClient.hmset("gSRlist", mint1.group, ""+newMint);

         var newMintPulseGroupEntry=makePulseEntry( newMint, geo, mint1.group );
         expressRedisClient.hmset([geo+":"+mint1.group], newMintPulseGroupEntry); 
      }
      expressRedisClient.hgetall("DEVOPS:DEVOPS.1", function(err,genesisGroupEntry) { 
         console.log("DEVOPS:DEVOPS.1="+dump(mint1));});

         console.log(ts()+"genesis newOWLs="+newOWLs);
         var newOWLs="1";
         if (newMint!=1) newOWLs=genesisGroup.owls+","+newMint

         makeConfig(function (config) {
            console.log(ts()+"makeConfig");
            config.mintTable["mint:0"]=mint0;  //nstall this new guy's mint0
            config.rc="0";
            config.ts=now();
            //config.isGenesisNode=(config.mintTable["mint:0"].mint==1)
            console.log(ts()+"EXPRESS:  Sending config:"+dump(config));
            callback(config);   //parent routine's callback
         })
      //console.log(ts()+"EXPRESS: after makeConfig");
      **/
   })
}

function addMintToGenesisOWLsList(newMint, callback) {
   console.log(ts()+"addMintToGenesisOWLsList");
   expressRedisClient.hgetall("mint:0",function(err,me) {
      var newOWLs="1";
      if (newMint!=1) newOWLs=me.owls+","+newMint
      console.log(ts()+"newOWLs="+newOWLs);
      expressRedisClient.hmset([me.geo+":"+me.group],"owls",newOWLs, function (err,reply) {
         callback(newOWLs);
      }); 
   });
}

function dumpState() {
    expressRedisClient.hgetall("mint:0",function(err,me) {
       console.log(ts()+"dumpState mint:0="+dump(me));
       expressRedisClient.hgetall("mint:1",function(err,genesis) {
          console.log(ts()+"dumpState mint:1="+dump(genesis));
          expressRedisClient.hgetall("DEVOPS:DEVOPS.1",function(err,genesisGroup) {
            console.log(ts()+"dumpState genesisGroupPulseLabel genesisGroup="+dump(genesisGroup));
            expressRedisClient.hgetall("MAZORE:DEVOPS.1",function(err,OREGroup) {
                console.log(ts()+"dumpState MAZORE:DEVOPS="+dump(OREGroup));
             })
          })
       })
    })
 }
//
// bind the TCP port for externalizing 
//
expressRedisClient.hget("me","port",function (err,port){
   if (!port) port=65013;
   var server = app.listen(port,'0.0.0.0', function () {
         //TODO: add error handling here
      var host = server.address().address
      var port = server.address().port  
      console.log("Express app listening at http://%s:%s", host, port)
   }) //.on('error', console.log);

});

