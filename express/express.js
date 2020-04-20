"use strict";
exports.__esModule = true;
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
var lib_1 = require("../lib/lib");
var pulser_1 = require("../pulser/pulser");
var config_1 = require("../config/config");
var expressRedis = require('redis');
var expressRedisClient = expressRedis.createClient(); //creates a new client
var express = require('express');
var app = express();
console.log(lib_1.ts() + "EXPRESS starting: CYCLETIME=" + config_1.CYCLETIME);
var mintStack = 0;
var DEFAULT_START_STATE = "HOLD";
//const DEFAULT_START_STATE="RUNNING";
if (DEFAULT_START_STATE == "HOLD") {
    console.log(lib_1.ts() + "EXPRESS ALL NODES START IN HOLD (no pulsing) Mode");
    console.log(lib_1.ts() + "EXPRESS ALL NODES START IN HOLD (no pulsing) Mode");
    console.log(lib_1.ts() + "EXPRESS ALL NODES START IN HOLD (no pulsing) Mode");
}
//expressRedisClient.hset
var POLLFREQ = config_1.CYCLETIME * 1000; //how often to send pulse
var REFRESHPAGETIME = config_1.CYCLETIME; //how often to refresh instrumentation web page
function getMatrix() {
    expressRedisClient.subscribe("pulses", function (matrix) {
        console.log(lib_1.ts() + "getMatrix(): matrix=" + lib_1.dump(matrix));
    });
}
//getMatrix();
//
//      handleShowState(req,res) - show the node state
//
function handleShowState(req, res) {
    var dateTime = new Date();
    var txt = '<meta http-equiv="refresh" content="' + REFRESHPAGETIME + '">';
    if (config_1.CYCLETIME < 5)
        txt = '<meta http-equiv="refresh" content="' + 5 + '">';
    expressRedisClient.hgetall("mint:0", function (err, me) {
        if (me == null)
            return console.log("handleShowState(): WEIRD: NULL mint:0");
        if (me.state == "HOLD")
            txt = '<meta http-equiv="refresh" content="' + 15 + '">';
        txt += '<html><head>';
        txt += '<script> function startTime() { var today = new Date(); var h = today.getHours(); var m = today.getMinutes(); var s = today.getSeconds(); m = checkTime(m); s = checkTime(s); document.getElementById(\'txt\').innerHTML = h + ":" + m + ":" + s; var t = setTimeout(startTime, 500); } function checkTime(i) { if (i < 10) {i = "0" + i};  return i; } </script>';
        txt += '<link rel = "stylesheet" type = "text/css" href = "http://drpeering.com/noia.css" /></head>';
        txt += '<body>';
        var insert = "";
        expressRedisClient.hgetall("mint:1", function (err, genesis) {
            if (me.isGenesisNode) {
                //console.log(ts()+"handleShowState() ***** GENESIS");
                insert = 'style="background-color: beige;"';
            }
            txt += '<body onload="startTime()" ' + insert + '>';
            if (me.isGenesisNode)
                txt += '<H2>DARP GENESIS NODE : ' + me.geo + '</H2><BR>';
            //txt += '<h1>10.10.0.'+me.mint+'</h1>';
            txt += '<h1>You are ' + me.geo + "(10.10.0." + me.mint + ")</h1>   <h2> : " + me.ipaddr + ":" + me.port + "</H2>" + "<p>//" + me.version + "//</p>";
            txt += "<p>docker run -p 65013:65013 -p 65013:65013/udp -p 80:80/udp -v ~/wireguard:/etc/wireguard -e GENESIS=" + genesis.ip + " -e HOSTNAME=`hostname`  -e WALLET=auto -it williambnorton/darp:latest</p>";
            if (!me.isGenesisNode)
                txt += ' under Genesis Node: <a href="http://' + genesis.ipaddr + ":" + genesis.port + '">' + genesis.geo + ":" + genesis.group + "</a>";
            txt += "<H2> Refresh every=" + POLLFREQ / 1000 + " seconds</H2>";
            txt += "<H2> with pulseMsgSize=" + me.statsPulseMessageLength + "</H2>";
            //if (JOINOK) txt+='<H2> <  JOINOK  > </H2>';
            //else txt+='<H2>*** NOT JOINOK ***</H2>';
            txt += '<H2> STATE: ' + me.state + ' </H2>';
            if (me.state == "HOLD")
                txt += "<p>Hit %R to RELOAD PAGE DURING HOLD MODE</p>";
            //txt += ' under Genesis Node: <a href="http://'+me.Genesis.split(":")[0]+":"+me.Genesis.split(":")[1]+'">'+me.Genesis.split(":")[0]+":"+me.Genesis.split(":")[1]+"</a>";
            txt += '<div class="right"><p>.......refreshed at ' + dateTime + "</p></div>";
            expressRedisClient.hgetall("gSRlist", function (err, gSRlist) {
                if (err)
                    console.log("gSRlist error");
                //txt+=dump(gSRlist);
                var lastEntry = "";
                for (var entry in gSRlist)
                    lastEntry = entry;
                //console.log("lastEntry="+lastEntry);
                txt += '<table class="gSRlist" border="1">';
                txt += "<th>srcMint</th><th>State</th><th>NodeName</th><th>pulseGroup</th><th>IP Address</th><th>Port #</th><th>publickey</th><th>lastSeq#</th><th>inMsgs</th><th>inOctets</th><th>OWL</th><th>outMsgs</th><th>outOctets</th><th>pktDrops</th><th>....</th><th>bootTime</th><th>ClockSkew</th><th>pulseTimestamp</th><th><---- Last pulse message received</th><th>SW Build</th>";
                for (var entry in gSRlist) {
                    //console.log("gSRlist entry="+dump(entry));
                    expressRedisClient.hgetall(entry, function (err, pulseEntry) {
                        txt += "<tr>";
                        //txt+="<p>"+mintEntry.mint+":"+mintEntry.geo+":"+mintEntry.group+"</p>";
                        //console.log(ts()+"handlepulse(): pulseEntry="+dump(pulseEntry));
                        expressRedisClient.hgetall("mint:" + pulseEntry.srcMint, function (err, mintEntry) {
                            //console.log("mintEntry="+dump(mintEntry));
                            txt += '<tr class="color' + pulseEntry.group + " " + pulseEntry.geo + ' ' + "INIT" + '">';
                            //txt += "<td>" + mintEntry.mint + "</td>";
                            txt += "<td>10.10.0." + mintEntry.mint + "</td>";
                            if (pulseEntry.inMsgs <= 1 || pulseEntry.pulseTimestamp == 0) {
                                mintEntry.state = "OFF-LINE";
                            }
                            else {
                                if (lib_1.now() - pulseEntry.pulseTimestamp > (30 * 1000)) {
                                    //var timeNow=now();
                                    //var lastPulse=timeNow-pulseEntry.pulseTimestamp
                                    //var bootSkew=timeNow-mintEntry.bootTime
                                    //console.log(" bootSkew="+bootSkew+"   timeNow="+timeNow+" pulseEntry.pulseTimestamp="+pulseEntry.pulseTimestamp+" "+"mintEntry.bootTime="+mintEntry.bootTime);
                                    mintEntry.state = "NO_PULSE";
                                }
                            }
                            txt += "<td>" + mintEntry.state + "</td>";
                            txt += '<td>' + '<a href="http://' + mintEntry.ipaddr + ':' + mintEntry.port + '/" target="_blank">' + mintEntry.geo + '</a></td>';
                            txt += '<td><a href="http://' + mintEntry.ipaddr + ':' + mintEntry.port + '/groups" target="_blank">' + pulseEntry.group + "</a></td>";
                            txt += "<td>" + mintEntry.ipaddr + "</td>";
                            txt += "<td>" + '<a href="http://' + mintEntry.ipaddr + ':' + mintEntry.port + '/state" target="_blank">' + mintEntry.port + "</a></td>";
                            txt += "<td>" + mintEntry.publickey.substring(0, 3) + "..." + mintEntry.publickey.substring(mintEntry.publickey.length - 4) + "</td>";
                            txt += "<td>" + pulseEntry.seq + "</td>";
                            txt += "<td>" + pulseEntry.inMsgs + "</td>";
                            txt += "<td>" + pulseEntry.inOctets + "</td>";
                            var pulseGroupOwner = pulseEntry.group.split(".")[0];
                            //if ( (entry.geo!='GENESIS') && (entry.owl==0) && (entry.geo!=me.geo))  txt += '<td class="alert" bgcolor="#909090">' + '<a href="http://' + me.ipaddr + ':' + entry.port + '/graph?dst=' + me.geo + '&src=' + entry.geo + "&group=" + group + '" target="_blank">' + entry.owl + "</a></td>";
                            txt += "<td>" + '<a href="http://' + me.ipaddr + ':' + pulseEntry.port + '/graph?dst=' + me.geo + '&src=' + pulseEntry.geo + "&group=" + pulseEntry.group + '" target="_blank">' + pulseEntry.owl + "</a></td>";
                            txt += "<td>" + pulseEntry.outMsgs + "</td>";
                            txt += "<td>" + pulseEntry.outOctets + "</td>";
                            //txt += "<td>" + pulseEntry.pktDrops + "</td>";
                            txt += "<td>" + (pulseEntry.seq - pulseEntry.inMsgs) + "</td>";
                            var stopButtonURL = "http://" + mintEntry.ipaddr + ":" + mintEntry.port + "/stop";
                            var rebootButtonURL = "http://" + mintEntry.ipaddr + ":" + mintEntry.port + "/reboot";
                            var reloadButtonURL = "http://" + mintEntry.ipaddr + ":" + mintEntry.port + "/reload";
                            var holdButtonURL = "http://" + mintEntry.ipaddr + ":" + mintEntry.port + "/hold";
                            var pulseMsgButtonURL = "http://" + mintEntry.ipaddr + ":" + mintEntry.port + "/pulseMsg";
                            txt += "<td>" + '<FORM>';
                            txt += '<INPUT Type="BUTTON" Value="PULSE1" Onclick="window.location.href=\'' + pulseMsgButtonURL + "'" + '">';
                            txt += '<INPUT Type="BUTTON" Value="RELOAD" Onclick="window.location.href=\'' + reloadButtonURL + "'" + '">';
                            txt += '<INPUT Type="BUTTON" Value="HOLD" Onclick="window.location.href=\'' + holdButtonURL + "'" + '">';
                            txt += '<INPUT Type="BUTTON" Value="STOP" Onclick="window.location.href=\'' + stopButtonURL + "'" + '">';
                            txt += '<INPUT Type="BUTTON" Value="REBOOT" Onclick="window.location.href=\'' + rebootButtonURL + "'" + '">';
                            txt += '<FORM>' + "</td>";
                            //console.log(ts()+"mintEntry.bootTime="+mintEntry.bootTime);
                            var delta = Math.round((lib_1.now() - mintEntry.bootTime) / 1000) + " secs ago";
                            if (mintEntry.bootTime == 0)
                                delta = "";
                            txt += "<td>" + delta + "</td>";
                            //txt += "<td>" + entry.bootTime+ "</td>";
                            console.log(lib_1.ts() + " clockSkew=" + mintEntry.clockSkew + "mintEntry=" + lib_1.dump(mintEntry));
                            if (Math.abs(mintEntry.clockSkew) > 1000)
                                if (Math.abs(mintEntry.clockSkew) > 60000)
                                    txt += "<td>" + Math.round(mintEntry.clockSkew / 60000) + " min</td>";
                                else
                                    txt += "<td>" + Math.round(mintEntry.clockSkew / 1000) + " sec</td>";
                            else
                                txt += "<td>" + mintEntry.clockSkew + " ms</td>";
                            var deltaSeconds = Math.round((lib_1.now() - pulseEntry.pulseTimestamp) / 1000) + " secs ago";
                            if (pulseEntry.pulseTimestamp == 0)
                                deltaSeconds = "";
                            //txt += "<td>" + now()+" "+entry.pulseTimestamp+ "</td>";
                            txt += "<td>" + deltaSeconds + "</td>";
                            if (pulseEntry.lastMsg)
                                txt += "<td>" + "" + pulseEntry.lastMsg.length + " bytes: " + pulseEntry.lastMsg + "</td>";
                            else
                                txt += "<td>" + "<undefined>" + "</td>";
                            txt += "<td>" + pulseEntry.version + "</td>";
                            txt += "</tr>";
                            if (pulseEntry.geo + ":" + pulseEntry.group == lastEntry) {
                                txt += "</table>";
                                //console.log(ts()+"READY TO DUMP HTML: "+txt);
                                txt += "</body></html>";
                                res.setHeader('Content-Type', 'text/html');
                                res.setHeader("Access-Control-Allow-Origin", "*");
                                res.end(txt);
                            }
                            //expressRedisClient.hgetall(entry, function (err,pulseEntry) {
                            // txt+=pulseEntry.geo+":"+pulseEntry.group;
                            //console.log("mintEntry="+dump(mintEntry));
                            //});
                        });
                    });
                }
            });
        });
    });
}
//
//
//
app.get('/state', function (req, res) {
    //console.log("fetching '/state'");
    //handleShowState(req, res);
    makeConfig(function (config) {
        //console.log("app.get('/state' callback config="+dump(config));
        expressRedisClient.hgetall("mint:0", function (err, me) {
            config.mintTable["mint:0"] = me;
            //var html="<html>"
            res.setHeader('Content-Type', 'application/json');
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.end(JSON.stringify(config, null, 2));
            return;
        });
    });
});
//
//
//
app.get('/', function (req, res) {
    //console.log("fetching '/' ");
    handleShowState(req, res);
    return;
});
//
//
//
app.get('/mint/:mint', function (req, res) {
    //console.log("fetching '/mint' state");
    expressRedisClient.hgetall("mint:" + req.params.mint, function (err, mintEntry) {
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
    expressRedisClient.hget("mint:0", "version", function (err, version) {
        //console.log("version="+version);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.end(JSON.stringify(version));
        return;
    });
});
app.get('/stop', function (req, res) {
    //console.log("EXPRess fetching '/state' state");
    console.log("EXITTING and Stopping the node");
    expressRedisClient.hset("mint:0", "state", "STOP"); //handlepulse will exit 86
    res.redirect(req.get('referer'));
});
app.get('/reload', function (req, res) {
    //console.log("EXPRess fetching '/state' state");
    console.log("EXITTING to reload the system");
    expressRedisClient.hset("mint:0", "state", "RELOAD"); //handlepulse will exit 36
    res.redirect(req.get('referer'));
});
app.get('/state', function (req, res) {
    //console.log("EXPRess fetching '/state' state");
    makeConfig(function (config) {
        //console.log("app.get('/state' callback config="+dump(config));
        res.setHeader('Content-Type', 'application/json');
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.end(JSON.stringify(config, null, 2));
    });
    return;
});
//
// 
//
app.get('/me', function (req, res) {
    //res.send('express root dir');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    expressRedisClient.hgetall("mint:0", function (err, me) {
        res.end(JSON.stringify(me, null, 3));
    });
    return;
});
//
//
//
app.get('/hold', function (req, res) {
    expressRedisClient.hgetall("mint:0", function (err, me) {
        expressRedisClient.hmset("mint:" + me.mint, {
            state: "HOLD",
            SHOWPULSE: "0"
        });
        expressRedisClient.hmset("mint:0", {
            state: "HOLD",
            SHOWPULSE: "0"
        });
        console.log(lib_1.ts() + "pulsed - Now in HOLD state - no pulsing and show no one's pulses");
        console.log(lib_1.ts() + "HOLD HOLD HOLD HOLD state - ");
        //      res.redirect('http://'+me.ipaddr+":"+me.port+"/");
        res.redirect(req.get('referer'));
    });
});
//
//
//
app.get('/pulseMsg', function (req, res) {
    expressRedisClient.hgetall("mint:0", function (err, me) {
        expressRedisClient.hmset("mint:" + me.mint, {
            //state : "RUNNING",
            SHOWPULSE: "1"
        });
        expressRedisClient.hmset("mint:0", {
            //state : "RUNNING",
            SHOWPULSE: "1"
        });
        pulser_1.pulse(1);
        console.log(lib_1.ts() + "One time PULSE SENT");
        //      res.redirect('http://'+me.ipaddr+":"+me.port+"/");
        res.redirect(req.get('referer'));
    });
});
//
//
//
function makeConfig(callback) {
    //console.log("getConfig() ");
    expressRedisClient.hgetall("mint:0", function (err, me) {
        expressRedisClient.hgetall("gSRlist", function (err, gSRlist) {
            //console.log("gSRlist="+dump(gSRlist));
            fetchConfig(gSRlist, null, function (config) {
                //console.log("getConfig(): callback config="+dump(config));
                callback(config); //call sender
            });
        });
    });
}
//
//
//
function fetchConfig(gSRlist, config, callback) {
    if (typeof config == "undefined" || config == null) {
        //console.log(ts()+"fetchConfig(): STARTING ECHO: gSRlist="+dump(gSRlist)+" config="+dump(config)+" ");
        config = {
            gSRlist: gSRlist,
            mintTable: {},
            pulses: {},
            entryStack: new Array()
        };
        for (var index in gSRlist) {
            //console.log("pushing "+index);
            config.entryStack.push({ entryLabel: index, mint: gSRlist[index] });
        }
        //onsole.log("entryStack="+dump(config.entryStack));
    }
    //Whether first call or susequent, pop entries until pop fails
    var entry = config.entryStack.pop();
    //console.log("EXPRESS() popped entry="+dump(entry));
    if (entry) {
        var mint = entry.mint;
        var entryLabel = entry.entryLabel;
        expressRedisClient.hgetall("mint:" + mint, function (err, mintEntry) {
            if (err)
                console.log("ERROR: mintEntry=" + mintEntry);
            if (mintEntry)
                config.mintTable["mint:" + mint] = mintEntry; //set the pulseEntries
            //console.log("EXPRESS() mint="+mint+" mintEntry="+dump(mintEntry)+" config="+dump(config)+" entryLabel="+entryLabel);
            //                       MAZORE:DEVOPS.1
            expressRedisClient.hgetall(entryLabel, function (err, pulseEntry) {
                config.pulses[entryLabel] = pulseEntry; //set the corresponding mintTable
                //console.log("EXPRESS() RECURSING entryLabel="+entryLabel+" pulseEntry="+dump(pulseEntry)+" config="+dump(config));
                fetchConfig(gSRlist, config, callback); //recurse until we hit bottom
            });
        });
    }
    else {
        delete config.entryStack;
        //console.log(ts()+"fetchConfig(): returning "+dump(config));
        callback(config); //send the config atructure back
    }
}
//
// nodeFactory
//       Configuration for node - allocate a mint
//
app.get('/nodefactory', function (req, res) {
    //console.log('****EXPRESS; config requested with params: '+dump(req.query));
    //console.log("EXPRESS geo="+req.query.geo+" publickey="+req.query.publickey+" query="+JSON.stringify(req.query,null,2)+" port="+req.query.port+" wallet="+req.query.wallet+" version="+req.query.version);
    var geo = req.query.geo;
    var publickey = req.query.publickey;
    var port = req.query.port || 65013;
    var wallet = req.query.wallet || "";
    var incomingTimestamp = req.query.ts;
    var incomingIP = req.query.myip; /// for now we believe the node's IP
    var octetCount = incomingIP.split(".").length;
    if (typeof incomingTimestamp == "undefined") {
        console.log("/nodeFactory called with no timestamp");
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ "rc": "-1 nodeFactory called with no timestamp. " }));
        return;
    }
    if (octetCount != 4) {
        console.log("EXPRESS(): nodefactory called with bad IP address:" + incomingIP + " returning rc=-1 to config geo=" + geo);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ "rc": "-1 nodeFactory called with BAD IP addr: " + incomingIP }));
        return;
    }
    //var clientIncomingIP=req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    //console.log("req="+dump(req));
    var version = req.query.version;
    console.log("EXPRESS /nodefactory geo=" + geo + " publickey=" + publickey + " port=" + port + " wallet=" + wallet + " incomingIP=" + incomingIP + " version=" + version);
    //console.log("req="+dump(req.connection));
    provisionNode(++mintStack, geo, port, incomingIP, publickey, version, wallet, incomingTimestamp, function (config) {
        //console.log(ts()+"provisionNode gave use config="+dump(config));
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(config)); //send mint:0 mint:1 entry
    });
    /*
    
       var newMint=++mintStack;
       console.log("EXPRESS: Creating a newly minted node: newMint="+newMint)
    
       if (newMint==1)  {   //I AM GENESIS NODE - set my records
          console.log(ts()+"provisioning Genesis Node");
          provisionGenesisNode(newMint,geo,port,incomingIP,publickey,version,wallet, incomingTimestamp, function (config) {
             console.log(ts()+"provisionGenesisNode gave use config="+dump(config));
             res.setHeader('Content-Type', 'application/json');
             res.end(JSON.stringify( config ));
          })
       } else {
          provisionMemberNode(newMint, geo,port,incomingIP,publickey,version,wallet, incomingTimestamp, function (config) {
             console.log(ts()+"provisionMemberNode gave use config="+dump(config));
             res.setHeader('Content-Type', 'application/json');
             res.end(JSON.stringify(config));
          })
       }
       */
});
function provisionNode(newMint, geo, port, incomingIP, publickey, version, wallet, incomingTimestamp, callback) {
    console.log(lib_1.ts() + "provisionNode(): newMint=" + newMint);
    var mint0 = {
        "mint": "" + newMint,
        "geo": geo,
        "group": geo + ".1",
        // wireguard configuration details
        "port": "" + port,
        "ipaddr": incomingIP,
        "publickey": publickey,
        "state": DEFAULT_START_STATE,
        "bootTime": "" + incomingTimestamp,
        "version": version,
        "wallet": wallet,
        "SHOWPULSES": "1",
        "owl": "",
        "isGenesisNode": "1",
        "clockSkew": "" + (lib_1.now() - incomingTimestamp) //=latency + clock delta between pulser and receiver
    };
    if (newMint == 1)
        expressRedisClient.hmset("mint:0", mint0); //we are GENESIS NODE
    expressRedisClient.hgetall("mint:1", function (err, genesis) {
        var _a, _b;
        if (genesis == null) {
            //WE ARE GENESIS NODE
            console.log(lib_1.ts() + "SETTING UP GENESIS NODE");
            console.log(lib_1.ts() + "SETTING UP GENESIS NODE");
            console.log(lib_1.ts() + "SETTING UP GENESIS NODE");
            console.log(lib_1.ts() + "SETTING UP GENESIS NODE");
            console.log(lib_1.ts() + "SETTING UP GENESIS NODE");
            genesis = mint0;
            expressRedisClient.hmset("mint:1", genesis); //mint0==mint 1 for Genesis node a startup
            //create the group entry while we are at it
            var genesisGroupEntry = {
                "geo": geo,
                "group": geo + ".1",
                "seq": "0",
                "pulseTimestamp": "0",
                "srcMint": "1",
                "owls": "1",
                "inOctets": "0",
                "outOctets": "0",
                "inMsgs": "0",
                "outMsgs": "0",
                "pktDrops": "0" //,     //as detected by missed seq#
                //"clockSkew" : ""+(now()-incomingTimestamp) //=latency + clock delta between pulser and receiver
            };
            var genesisGroupLabel = geo + ":" + geo + ".1";
            expressRedisClient.hmset(genesisGroupLabel, genesisGroupEntry);
            expressRedisClient.hmset("gSRlist", (_a = {},
                _a[genesisGroupLabel] = "1",
                _a));
        } //At this point we have mint:0 mint:1 and group Entry defined
        if (newMint != 1) {
            console.log(lib_1.ts() + "SETTING UP NON-GENESIS NODE");
            console.log(lib_1.ts() + "SETTING UP NON-GENESIS NODE");
            console.log(lib_1.ts() + "SETTING UP NON-GENESIS NODE");
            console.log(lib_1.ts() + "SETTING UP NON-GENESIS NODE");
            console.log(lib_1.ts() + "SETTING UP NON-GENESIS NODE");
            mint0.group = genesis.group; // FIX my group to be GENESIS group
            // make entry for geo:genesisGroup  - ALREADY SET!!!!          
            /****
            var mint1={          //mine:1 is GENESIS NODE
                        "mint" : "1",      //overwrite initial mint0 record - we are genesis
                        "geo" : genesis.geo,
                        "group" : genesis.group,  //assigning nodes in this group now
                        // wireguard configuration details
                        "port" : ""+genesis.port,
                        "ipaddr" : genesis.ipaddr,   //set by genesis node on connection
                        "publickey" : genesis.publickey,
                        //
                        "state" : DEFAULT_START_STATE,
                        "bootTime" : ""+now(),   //So we can detect reboots
                        "version" : genesis.version,  //software version
                        "wallet" : genesis.wallet,
                        "owl" : "", //we will get measures from genesis node
                        "clockSkew" : ""+(now()-incomingTimestamp) //=latency + clock delta between pulser and receiver
            }
            ***/
            var newMintRecord = {
                "mint": "" + newMint,
                "geo": geo,
                "group": genesis.group,
                // wireguard configuration details
                "port": "" + port,
                "ipaddr": incomingIP,
                "publickey": publickey,
                //
                "state": DEFAULT_START_STATE,
                "bootTime": "" + incomingTimestamp,
                "version": version,
                "wallet": wallet,
                "owl": "",
                "clockSkew": "" + (lib_1.now() - incomingTimestamp) //=latency + clock delta between pulser and receiver
            };
            // add record to system
            expressRedisClient.hmset(geo + ":" + genesis.group, newMintRecord);
            // add record to gSRlist
            expressRedisClient.hmset("gSRlist", (_b = {}, _b[geo + ":" + genesis.group] = newMint, _b));
        }
        makeConfig(function (config) {
            console.log(lib_1.ts() + "EXPRESS:  -------------------------config done:");
            config.mintTable["mint:0"] = mint0;
            config.rc = "0";
            config.ts = lib_1.now();
            //console.log(ts()+"config="+dump(config));         
            callback(config);
        });
    });
    /*
    makeConfig(function(config) {
       console.log("Genesis config="+JSON.stringify(config, null, 2));
       console.log("* * * * * * * * * * * * * * GENESIS CONFIGURATION COMPLETE * * * * * * * * * * *");
       //expressRedisClient.publish("members","Genesis Started pulseGroup mint:"+genesisGroupEntry.srcMint+" "+genesisGroupEntry.geo+":"+genesisGroupEntry.group)
       console.log(ts()+"EXPRESS: AFTER GENESIS CONFIG: ");
       dumpState();
       console.log(ts()+"EXPRESS: GENESIS CONFIG DONE");
       console.log(ts()+"EXPRESS: GENESIS CONFIG DONE");
       console.log(ts()+"EXPRESS: GENESIS CONFIG DONE");
       console.log(ts()+"EXPRESS: GENESIS CONFIG DONE");
       console.log(ts()+"EXPRESS: GENESIS CONFIG DONE");
       callback({ "node" : "GENESIS", "rc" : "0" });
    });
 */
}
function dumpState() {
    expressRedisClient.hgetall("mint:0", function (err, me) {
        console.log(lib_1.ts() + "mint:0 = me=" + lib_1.dump(me));
        expressRedisClient.hgetall("mint:1", function (err, genesis) {
            console.log(lib_1.ts() + "dumpState mint:1 = genesis=" + lib_1.dump(genesis));
            expressRedisClient.hgetall("DEVOPS:DEVOPS.1", function (err, genesisGroup) {
                console.log(lib_1.ts() + "dumpState genesisGroupPulseLabel genesisGroup=" + lib_1.dump(genesisGroup));
            });
        });
    });
}
/*
function provisionGenesisNode(newMint,geo,port,incomingIP,publickey,version,wallet, incomingTimestamp, callback) {
      
   console.log("* * * * * * * I AM GENESIS NODE * * * * * *");
   var mint0={
      "mint" : "1",      //mint:1 is always genesis node
      "geo" : geo,
      "group" : geo+".1",  //assigning nodes in this group now
      // wireguard configuration details
      "port" : ""+port,
      "ipaddr" : incomingIP,   //set by genesis node on connection
      "publickey" : publickey,
      "state" : DEFAULT_START_STATE,
      "bootTime" : ""+now(),   //So we can detect reboots
      "version" : version,  //software version
      "wallet" : wallet,
      "SHOWPULSES" : "1",
      "owl" : "",   //
      "isGenesisNode" : "1",
      "clockSkew" : ""+(now()-incomingTimestamp) //=latency + clock delta between pulser and receiver
   }
   expressRedisClient.hmset("mint:0",mint0);
   //mint0.mint="1";                redisClient.hset( "mint:0" , "isGenesisNode", "1" );

   expressRedisClient.hmset("mint:1",mint0);
   var genesisGroupEntry={  //one record per pulse - index = <geo>:<group>
      "geo" : geo,            //record index (key) is <geo>:<genesisGroup>
      "group": geo+".1",      //DEVPOS:DEVOP.1 for genesis node start
      "seq" : "0",         //last sequence number heard
      "pulseTimestamp": "0", //last pulseTimestamp received from this node
      "srcMint" : "1",      //Genesis node would send this
      // =
      "owls" : "1",        //Startup - I am the only one here
      //"owls" : getOWLs(me.group),  //owls other guy is reporting
      //node statistics - we measure these ourselves
      //"owl": ""+OWL,   //how long it took this node's last record to reach me
      "inOctets": "0",
      "outOctets": "0",
      "inMsgs": "0",
      "outMsgs": "0",
      "pktDrops": "0"   //,     //as detected by missed seq#
      //"clockSkew" : ""+(now()-incomingTimestamp) //=latency + clock delta between pulser and receiver
   };
   var genesisGroupLabel=geo+":"+geo+".1";
   expressRedisClient.hmset(genesisGroupLabel, genesisGroupEntry);
   expressRedisClient.hmset("gSRlist", {
      [genesisGroupLabel] : "1"
   });
   
   getConfig(function(config) {
      console.log("Genesis config="+JSON.stringify(config, null, 2));
      console.log("* * * * * * * * * * * * * * GENESIS CONFIGURATION COMPLETE * * * * * * * * * * *");
      expressRedisClient.publish("members","Genesis Started pulseGroup mint:"+genesisGroupEntry.srcMint+" "+genesisGroupEntry.geo+":"+genesisGroupEntry.group)
      console.log(ts()+"EXPRESS: AFTER GENESIS CONFIG: ");
      dumpState();
      console.log(ts()+"EXPRESS: GENESIS CONFIG DONE");
      console.log(ts()+"EXPRESS: GENESIS CONFIG DONE");
      console.log(ts()+"EXPRESS: GENESIS CONFIG DONE");
      console.log(ts()+"EXPRESS: GENESIS CONFIG DONE");
      console.log(ts()+"EXPRESS: GENESIS CONFIG DONE");
      callback({ "node" : "GENESIS", "rc" : "0" });
   });
   
}

//
//
//
function provisionMemberNode(newMint, geo, port,incomingIP,publickey,version,wallet, incomingTimestamp, callback) {
   console.log(ts()+"EXPRESS: NON-GENESIS CODE PATH: GENESIS CONFIG: ");
   console.log(ts()+"EXPRESS: NON-GENESIS CODE PATH: GENESIS CONFIG: ");
   console.log(ts()+"EXPRESS: NON-GENESIS CODE PATH: GENESIS CONFIG: ");
   console.log(ts()+"EXPRESS: NON-GENESIS CODE PATH: GENESIS CONFIG: ");
   console.log(ts()+"EXPRESS: NON-GENESIS CODE PATH: GENESIS CONFIG: ");
   dumpState();

   // Genesis Node as mint:1
   expressRedisClient.hgetall("mint:1", function (err,genesis) {  //get GENESIS mint entry
      if ( genesis==null)  {
         console.log(ts()+"EXPRESS NON-GENESIS Calling before genesis node set up...ignoring pulse dumping state:")
         dumpState(); //go see what we have
      } else {
         var genesisGroupLabel=genesis.geo+":"+genesis.group;
         expressRedisClient.hgetall(genesisGroupLabel, function (err,genesisGroup) {  //get
            console.log("working on NON-GENESIS Config");

            // Use the genesis node info to create the config
            var mint0={                //mint:0 is me - who (remote Node) has as 'me'
               "mint" : ""+newMint,      //overwrite initial mint0 record - we are genesis
               "geo" : geo,
               "group" : genesis.group,  //assigning nodes in this group now
               // wireguard configuration details
               "port" : ""+port,
               "ipaddr" : incomingIP,   //set by genesis node on connection
               "publickey" : publickey,
               //
               "state" : DEFAULT_START_STATE,
               "bootTime" : ""+now(),   //So we can detect reboots
               "version" : version,  //software version
               "wallet" : wallet,
               "SHOWPULSES" : "1",
               "owl" : "",          //we will get measures from genesis node
               "clockSkew" : ""+(now()-incomingTimestamp) //=latency + clock delta between pulser and receiver
            }
            
            var mint1={          //mine:1 is GENESIS NODE
               "mint" : "1",      //overwrite initial mint0 record - we are genesis
               "geo" : genesis.geo,
               "group" : genesis.group,  //assigning nodes in this group now
               // wireguard configuration details
               "port" : ""+genesis.port,
               "ipaddr" : genesis.ipaddr,   //set by genesis node on connection
               "publickey" : genesis.publickey,
               //
               "state" : DEFAULT_START_STATE,
               "bootTime" : ""+now(),   //So we can detect reboots
               "version" : genesis.version,  //software version
               "wallet" : genesis.wallet,
               "owl" : "", //we will get measures from genesis node
               "clockSkew" : ""+(now()-incomingTimestamp) //=latency + clock delta between pulser and receiver
            }
            
            var newMintRecord={        //my mint entry
               "mint" : ""+newMint,      //set by genesis node
               "geo" : geo,
               "group" : genesis.group,
               // wireguard configuration details
               "port" : ""+port,
               "ipaddr" : incomingIP,   //set by genesis node on connection
               "publickey" : publickey,
               //
               "state" : DEFAULT_START_STATE,

               "bootTime" : ""+now(),   //So we can detect reboots
               "version" : version,  //software version
               "wallet" : wallet,
               "owl" : "",   //do not measure OWL to self - maybe delete this field to catch err?
               "clockSkew" : ""+(now()-incomingTimestamp) //=latency + clock delta between pulser and receiver
            };

            expressRedisClient.hmset("mint:"+newMint,newMintRecord);
            //expressRedisClient.hmset("mint:"+newMint,newMintRecord);

            // Now for a record of this newNode in the Genesis group
            //get group owner (genesis group) OWLS
            //mintList(expressRedisClient, genesis.group, function(err,owls){
            //expressRedisClient.hgetall(genesisGroupLabel, function(err,genesisGroup))
               //var genesisGroup=genesis.geo+":"+genesis.group;
            var newOwlList=genesisGroup.owls+","+newMint;

               //console.log(ts()+"Genesis.group="+dump(genesisGroup)+" newOwlList="+newOwlList);

            expressRedisClient.hset(genesisGroupLabel, "owls", newOwlList, function (err,reply){
               var justMints=getMints(genesisGroup);
               //console.log(ts()+"err="+err+" justMints="+justMints+" genesisGroup="+dump(genesisGroup));

               var genesisGroupEntry={  //one record per pulse - index = <genesis.geo>:<genesis.group>
                  "geo" : genesis.geo,            //record index (key) is <geo>:<genesisGroup>
                  "group": genesis.group,      //assigning nodes in this group now
                  "seq" : "0",         //last sequence number heard
                  "pulseTimestamp": "0", //last pulseTimestamp received from this node
                  "srcMint" : "1",      //claimed mint # for this node
                  // =
                  "owls" : newOwlList,  //owls other guy is reporting
                  //"owls" : getOWLs(me.group),  //owls other guy is reporting
                  //node statistics - we measure these ourselves
                  "owl": "",   //NO OWL MEASUREMENT HERE (YET)
                  "inOctets": "0",
                  "outOctets": "0",
                  "inMsgs": "0",
                  "outMsgs": "0",
                  "pktDrops": "0"     //as detected by missed seq#
                  //"remoteState": "0"   //and there are mints : owls for received pulses
               };

               //console.log(ts()+"EXPRESS: non-genesis config genesisGroupEntry.owls="+genesisGroupEntry.owls);
               var newSegmentEntry={  //one record per pulse - index = <geo>:<group>
                  "geo" : geo,            //record index (key) is <geo>:<genesisGroup>
                  "group": genesis.group,      //add all nodes to genesis group
                  "seq" : "0",         //last sequence number heard
                  "pulseTimestamp": "0", //last pulseTimestamp received from this node
                  "srcMint" : ""+newMint,      //claimed mint # for this node
                  // =
                  "owls" : "", //justMints,  //owls other guy (this is ME so 0!) is reporting
                  //"owls" : getOWLs(me.group),  //owls other guy is reporting
                  //node statistics - we measure these ourselves
                  "owl": "",   //NO OWL MEASUREMENT HERE (YET)
                  "inOctets": "0",
                  "outOctets": "0",
                  "inMsgs": "0",
                  "outMsgs": "0",
                  "pktDrops": "0"     //as detected by missed seq#
                  //"remoteState": "0"   //and there are mints : owls for received pulses
               };
               //console.log(ts()+"newSegmentEntry="+dump(newSegmentEntry));
               expressRedisClient.hmset( geo+":"+genesis.group, newSegmentEntry );

               SRList(expressRedisClient, function (err, mygSRlist, myOwlList) {
                  //
                  //console.log("EXPRESS: ********** SRList callback - mygSRlist="+mygSRlist+" myOwlList="+myOwlList)+" newMint="+newMint+" geo="+geo+" genesis.group="+genesis.group;
                  //we now have updated gSRlist and updated owls
                  var entryLabel=""+geo+":"+genesis.group;
                  expressRedisClient.hmset( "gSRlist", {
                     [ entryLabel ] : ""+newMint
                  });  //add node:grp to gSRlist
                  // install owls into genesisGroup
               getConfig(function(config) {
                     //console.log("EXPRESS nodeFactory about to send json="+dump(node));
                     config.mintTable["mint:0"]=mint0;   //tell remote their config
                     config.rc="0";
                     //console.log("EXPRESS(): sending new node its config="+dump(config));

                     //console.log("EXPRESS: Node connection established - now rebuild new configuration for witreguard configuration file to allow genesis to sendus stuff");
                     //console.log("EXPRESS nodeFactory done");
               });
               expressRedisClient.publish("members","Genesis ADDED pulseGroup member mint:"+newSegmentEntry.srcMint+" "+newSegmentEntry.geo+":"+newSegmentEntry.group)
               //console.log("EXPRESS(): Non-Genesis config: newMintRecord="+dump(newMintRecord)+" mint0="+dump(mint0)+" mint1="+dump(mint1)+" genesisGroupEntry="+dump(genesisGroupEntry)+" newSegmentEntry="+dump(newSegmentEntry));
               });
            });
         });
      }
   });
}
****/
//
// bind the TCP port for externalizing 
//
expressRedisClient.hget("me", "port", function (err, port) {
    if (!port)
        port = 65013;
    var server = app.listen(port, '0.0.0.0', function () {
        //TODO: add error handling here
        var host = server.address().address;
        var port = server.address().port;
        console.log("Express app listening at http://%s:%s", host, port);
    });
});
