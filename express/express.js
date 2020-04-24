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
//import { pulse } from '../pulser/pulser'
console.log("Starting EXPRESS GENESIS=" + process.env.GENESIS + " PORT=" + process.env.PORT + " HOSTNAME=" + process.env.HOSTNAME + " VERSION=" + process.env.VERSION + " MYIP=" + process.env.MYIP);
var expressRedis = require('redis');
var expressRedisClient = expressRedis.createClient(); //creates a new client
expressRedisClient.flushall(); //clean slate
var express = require('express');
var app = express();
var mintStack = 1;
var DEFAULT_SHOWPULSES = "1";
var DEFAULT_START_STATE = "HOLD"; //for single stepping through network protocol code
//const DEFAULT_START_STATE="RUNNING"; console.log(ts()+"EXPRESS: ALL NODES START IN RUNNING Mode");
//const DEFAULT_START_STATE="HOLD"; console.log(ts()+"EXPRESS: ALL NODES START IN HOLD (no pulsing) Mode");
/****  NODE SITE CONFIGURATION  ****/
//      Environment is way for environment to control the code
if (!process.env.DARPDIR) {
    console.log("No DARPDIR enviropnmental variable specified ");
    process.env.DARPDIR = process.env.HOME + "/darp";
    console.log("DARPDIR defaulted to " + process.env.DARPDIR);
}
if (!process.env.HOSTNAME) {
    console.log("No HOSTNAME enviropnmental variable specified ");
    process.env.HOSTNAME = require('os').hostname().split(".")[0];
    console.log("setting HOSTNAME to " + process.env.HOSTNAME);
}
if (!process.env.GENESIS) {
    console.log("No GENESIS enviropnmental variable specified - setting DEFAULT GENESIS and PORT");
    process.env.GENESIS = "71.202.2.184";
    process.env.PORT = "65013";
}
if (!process.env.PORT) {
    console.log("No PORT enviropnmental variable specified - setting DEFAULT GENESIS PORT");
    process.env.PORT = "65013";
}
if (!process.env.VERSION) {
    console.log("No VERSION enviropnmental variable specified - setting to noVersion");
    process.env.VERSION = lib_1.MYVERSION();
}
console.log(lib_1.ts() + "process.env.VERSION=" + process.env.VERSION);
if (!process.env.MYIP) {
    console.log("No MYIP enviropnmental variable specified ");
    process.env.MYIP = "noMYIP";
    lib_1.MYIP();
}
var PUBLICKEY = process.env.PUBLICKEY;
if (!PUBLICKEY)
    try {
        PUBLICKEY = require('fs').readFileSync('../wireguard/publickey', 'utf8');
        PUBLICKEY = PUBLICKEY.replace(/^\n|\n$/g, '');
        console.log("pulled PUBLICKEY from publickey file: >" + PUBLICKEY + "<");
    }
    catch (err) {
        console.log("PUBLICKEY lookup failed");
        PUBLICKEY = "deadbeef00deadbeef00deadbeef0013";
    }
var GEO = process.env.HOSTNAME; //passed into docker
GEO = GEO.toUpperCase().split(".")[0].split(":")[0].split(",")[0].split("+")[0];
var PORT = process.env.PORT || "65013"; //passed into docker
var WALLET = process.env.WALLET || "584e560b06717ae0d76b8067d68a2ffd34d7a390f2b2888f83bc9d15462c04b2";
//from 
expressRedisClient.hmset("mint:0", "geo", GEO, "port", PORT, "wallet", WALLET, "myip", process.env.MYIP, "version", process.env.VERSION, "hotname", process.env.HOSTNAME, "genesis", process.env.GENESIS, "publickey", PUBLICKEY);
/**** CONFIGURATION SET ****/
expressRedisClient.hgetall("mint:0", function (err, me) {
    console.log("EXPRESS starting with me=" + lib_1.dump(me));
    if (me != null) { }
    else {
        console.log(lib_1.ts() + "EXPRESS NO REDIS");
        process.exit(36);
    }
});
//
//      handleShowState(req,res) - show the node state
//
function handleShowState(req, res) {
    var dateTime = new Date();
    var txt = '<meta http-equiv="refresh" content="' + 30 + '">';
    expressRedisClient.hgetall("mint:0", function (err, me) {
        if (me == null)
            return console.log("handleShowState(): WEIRD: NULL mint:0");
        if (me.state == "HOLD")
            txt = '<meta http-equiv="refresh" content="' + 60 + '">';
        txt += '<html><head>';
        txt += '<script> function startTime() { var today = new Date(); var h = today.getHours(); var m = today.getMinutes(); var s = today.getSeconds(); m = checkTime(m); s = checkTime(s); document.getElementById(\'txt\').innerHTML = h + ":" + m + ":" + s; var t = setTimeout(startTime, 500); } function checkTime(i) { if (i < 10) {i = "0" + i};  return i; } </script>';
        txt += '<link rel = "stylesheet" type = "text/css" href = "http://drpeering.com/noia.css" /></head>';
        txt += '<body>';
        var insert = "";
        expressRedisClient.hgetall("gSRlist", function (err, gSRlist) {
            var lastEntry = "";
            for (var entry in gSRlist)
                lastEntry = entry;
            console.log(lib_1.ts() + "gSRlist=" + lib_1.dump(gSRlist) + " lastEntry=" + lastEntry);
            expressRedisClient.hgetall("gSRlist", function (err, gSRlist) {
                txt += "<table>";
                for (var rowNode in gSRlist) {
                    txt += "<tr>";
                    var rowEntry = rowNode.split(":")[0];
                    var rowMint = gSRlist[rowNode];
                    var rowStack = new Array();
                    txt += '<td>' + '<a href="http://' + "" + '/" target="_blank">' + rowEntry + "(" + rowMint + ")" + '</a></td>';
                    for (var colNode in gSRlist) {
                        var colEntry = colNode;
                        var colMint = gSRlist[colNode];
                        txt += "<td>" + colMint + "-" + rowMint + "" + "</td>";
                        rowStack.unshift({
                            "colMint": colMint,
                            "rowMint": rowMint
                        });
                        if (colNode == lastEntry) {
                            txt += "</tr>";
                            //pop off items of the stack
                        }
                        /*
                        txt += '<td>' +
      
                           var src = entry.geo;;
                           var dst = nodeEntry.geo;
                           var owl=-1;
                           var values = getOWL(src, dst); //any src-dst pair will give us latency
      
                           if (values) owl=values.owl;
                           var id=src+"_"+dst+"_"+group.replace(/\./g,"_");
                           var highlight="";//highlightEff(src,dst,group);
                           if ((owl==0) ||  (src==dst))
                                    txt += '<td id="'+id+'" class="color'+color+" "+highlight+'" bgcolor="#FF0000">' + '<a href="http://' + nodeEntry.ipaddr + ':' + nodeEntry.port + '/graph?dst=' + dst + '&src=' + src + "&group=" + group + '" target="_blank">' + "</a></td>";
                           else
                                    txt += '<td id="'+id+'" class="color '+color+' '+highlight+'">' + '<a href="http://' + nodeEntry.ipaddr + ':' + nodeEntry.port + '/graph?dst=' + dst + '&src=' + src + "&group=" + group + '" target="_blank">' + owl + " ms</a></td>";
      
         */
                    }
                }
            });
        });
        expressRedisClient.hgetall("mint:1", function (err, genesis) {
            if (genesis == null)
                return console.log("handleShowState(): WEIRD: NULL mint:1 genesis");
            if (me.isGenesisNode == 1) {
                //console.log(ts()+"handleShowState() ***** GENESIS");
                insert = 'style="background-color: beige;"';
            }
            txt += '<body onload="startTime()" ' + insert + '>';
            if (me.isGenesisNode == 1)
                txt += '<H2>DARP GENESIS NODE : ' + me.geo + " IP(10.10.0." + me.mint + ') ' + me.ipaddr + ":" + me.port + ' for pulseGroup: ' + me.group + '</H2><BR>';
            else {
                txt += '<h2>DARP pulseGroup Member ' + me.geo + " IP(10.10.0." + me.mint + ")</h1>   <h2> : " + me.ipaddr + ":" + me.port + "</H2>" + "<p>//" + me.version + "//</p>";
                txt += ' under Genesis Node: <a href="http://' + genesis.ipaddr + ":" + genesis.port + '">' + genesis.geo + ":" + genesis.group + "</a>";
            }
            //txt += '<h1>10.10.0.'+me.mint+'</h1>';
            txt += "<br><h2>Connect to me with docker run -p 65013:65013 -p 65013:65013/udp -p 80:80/udp -v ~/wireguard:/etc/wireguard -e GENESIS=" + genesis.ipaddr + " -e HOSTNAME=`hostname`  -e WALLET=auto -it williambnorton/darp:latest</h2>";
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
                    console.log("gSRlist entry=" + lib_1.dump(entry));
                    expressRedisClient.hgetall(entry, function (err, pulseEntry) {
                        txt += "<tr>";
                        //txt+="<p>"+mintEntry.mint+":"+mintEntry.geo+":"+mintEntry.group+"</p>";
                        //console.log(ts()+"handlepulse(): pulseEntry="+dump(pulseEntry));
                        expressRedisClient.hgetall("mint:" + pulseEntry.srcMint, function (err, mintEntry) {
                            //console.log("mintEntry="+dump(mintEntry));
                            if (mintEntry != null) {
                                txt += '<tr class="color' + pulseEntry.group + " " + pulseEntry.geo + ' ' + "INIT" + '">';
                                //txt += "<td>" + mintEntry.mint + "</td>";
                                txt += "<td>10.10.0." + mintEntry.mint + "</td>";
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
                                    txt += "<td>" + "" + "</td>";
                                txt += "<td>" + pulseEntry.version + "</td>";
                                txt += "</tr>";
                            }
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
            SHOWPULSES: "0"
        });
        expressRedisClient.hmset("mint:0", {
            state: "HOLD",
            SHOWPULSES: "0"
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
            adminControl: "PULSE",
            SHOWPULSES: "1"
        });
        expressRedisClient.hmset("mint:0", {
            adminControl: "",
            SHOWPULSES: "1"
        });
        console.log(lib_1.ts() + "pulse(1) somehow here");
        console.log(lib_1.ts() + "One time PULSE SENT");
        //      res.redirect('http://'+me.ipaddr+":"+me.port+"/");
        res.redirect(req.get('referer'));
    });
});
//
//
//
function makeConfig(callback) {
    console.log("makeConfig() ");
    expressRedisClient.hgetall("mint:0", function (err, me) {
        expressRedisClient.hgetall("gSRlist", function (err, gSRlist) {
            console.log("gSRlist=" + lib_1.dump(gSRlist));
            fetchConfig(gSRlist, null, function (config) {
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
    expressRedisClient.hgetall("mint:0", function (err, me) {
        if (me != null) {
            console.log('EXPRESS nodeFactory: config requested with params: ' + lib_1.dump(req.query));
            //console.log("EXPRESS geo="+req.query.geo+" publickey="+req.query.publickey+" query="+JSON.stringify(req.query,null,2)+" port="+req.query.port+" wallet="+req.query.wallet+" version="+req.query.version);
            var geo = req.query.geo;
            var publickey = req.query.publickey;
            var port = req.query.port || 65013;
            var wallet = req.query.wallet || "";
            var incomingTimestamp = req.query.ts;
            var incomingIP = req.query.myip; /// for now we believe the node's IP
            var clientIncomingIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            if (incomingIP == "noMYIP")
                incomingIP = clientIncomingIP;
            if (typeof incomingIP == "undefined")
                return console.log(lib_1.ts() + "***********************ERROR: incomingIP unavailable from geo=" + geo + " inco,ingIP=" + incomingIP + " clientIncomingIP=" + clientIncomingIP);
            ;
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
            //console.log("req="+dump(req));
            var version = req.query.version;
            //console.log("EXPRESS /nodefactory geo="+geo+" publickey="+publickey+" port="+port+" wallet="+wallet+" incomingIP="+incomingIP+" version="+version);
            //console.log("req="+dump(req.connection));
            // On Startup, only accept connections from me, and the test is that we have matching publickeys
            //console.log(ts()+"EXPRESS: mintStack="+mintStack+" publickey="+publickey+" me.publickey="+me.publickey);
            //console.log("EXPRESS: Received connection request from "+geo+"("+incomingIP+")" );
            if ((mintStack == 1 && (publickey == me.publickey)) || (mintStack != 1)) { //check publickey instead!!!!!
                if (geo == "NORTONDARP") {
                    //console.log(ts()+"Filtering"); //this will eventually be a black list or quarentine group
                }
                else {
                    provisionNode(mintStack++, geo, port, incomingIP, publickey, version, wallet, incomingTimestamp, function (config) {
                        //console.log(ts()+"EXPRESS nodeFactory sending config="+dump(config));
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify(config)); //send mint:0 mint:1 *mint:N groupEntry *entryN
                    });
                }
            }
            //} else console.log("EXPRESS: Received pulse from "+geo+"("+incomingIP+") before my genesis node was set up. IGNORING.");
        }
        else
            console.log("EXPRESS has no me out of redis");
    });
});
function makeMintEntry(mint, geo, group, port, incomingIP, publickey, version, wallet, incomingTimestamp) {
    return {
        "mint": "" + mint,
        "geo": geo,
        "group": group,
        // wireguard configuration details
        "port": "" + port,
        "ipaddr": incomingIP,
        "publickey": publickey,
        "state": DEFAULT_START_STATE,
        "bootTime": "" + incomingTimestamp,
        "version": version,
        "wallet": wallet,
        "SHOWPULSES": DEFAULT_SHOWPULSES,
        "owl": "",
        "isGenesisNode": (mint == 1) ? "1" : "0",
        "clockSkew": "" + (lib_1.now() - incomingTimestamp) //=latency + clock delta between pulser and receiver
    };
}
function makePulseEntry(mint, geo, group) {
    return {
        "geo": geo,
        "group": group,
        "seq": "0",
        "pulseTimestamp": "0",
        "srcMint": "" + mint,
        "owls": "1",
        "inOctets": "0",
        "outOctets": "0",
        "inMsgs": "0",
        "outMsgs": "0",
        "pktDrops": "0" //,     //as detected by missed seq#
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
function provisionNode(newMint, geo, port, incomingIP, publickey, version, wallet, incomingTimestamp, callback) {
    //console.log(ts()+"provisionNode(): newMint="+newMint+" geo="+geo);
    expressRedisClient.hgetall("mint:1", function (err, mint1) {
        //create mint and entry as if this was the genesis node
        var mint0 = makeMintEntry(newMint, geo, geo + ".1", port, incomingIP, publickey, version, wallet, incomingTimestamp);
        if (newMint == 1) {
            expressRedisClient.hmset("mint:0", mint0, function (err, reply) {
                expressRedisClient.hmset("mint:1", mint0, function (err, reply) {
                    var mint1 = mint0; //make a copy for readaibility
                    var genesisPulseGroupEntry = makePulseEntry(newMint, geo, geo + ".1");
                    expressRedisClient.hmset(mint1.geo + ":" + mint1.group, genesisPulseGroupEntry, function (err, reply) {
                        expressRedisClient.hmset("gSRlist", mint1.geo + ":" + mint1.group, "1", function (err, reply) {
                            makeConfig(function (config) {
                                //console.log(ts()+"makeConfig");
                                config.mintTable["mint:0"] = mint0; //    Install this new guy's mint0 into config
                                config.rc = "0";
                                config.isGenesisNode = "1";
                                config.ts = lib_1.now(); //give other side a notion of my clock when I sent this
                                //config.isGenesisNode=(config.mintTable["mint:0"].mint==1)
                                //console.log(ts()+"EXPRESS:  Sending config:"+dump(config));
                                callback(config); //parent routine's callback
                            });
                        });
                    }); //Create GENESIS GroupEntry:DEVOPS:DEVOPS.1
                }); //mint:1 is always the GENESIS NODE
            }); //mint:0 always is "me" we are GENESIS NODE
        }
        else {
            expressRedisClient.hgetall("mint:0", function (err, mint0) {
                expressRedisClient.hgetall("mint:1", function (err, mint1) {
                    var mint1 = mint0; //make a copy for readaibility
                    expressRedisClient.hgetall(mint1.geo + ":" + mint1.group, function (err, genesisGroupEntry) {
                        expressRedisClient.hgetall("gSRlist", function (err, gSRlist) {
                            var mintN = makeMintEntry(newMint, geo, mint1.group, port, incomingIP, publickey, version, wallet, incomingTimestamp);
                            expressRedisClient.hmset("mint:" + newMint, mintN, function (err, reply) {
                                var newNodePulseEntry = makePulseEntry(newMint, geo, mint1.group);
                                expressRedisClient.hmset(geo + ":" + mint1.group, mintN, function (err, reply) {
                                    expressRedisClient.hmset("gSRlist", geo + ":" + mint1.group, "" + newMint, function (err, reply) {
                                        var _a, _b, _c;
                                        genesisGroupEntry.owls = genesisGroupEntry.owls + "," + newMint;
                                        var config = {
                                            gSRlist: (_a = {},
                                                _a[mint1.geo + ":" + mint1.group] = "1",
                                                _a[geo + ":" + mint1.group] = "" + newMint,
                                                _a),
                                            mintTable: (_b = {
                                                    "mint:0": mintN,
                                                    "mint:1": mint1
                                                },
                                                _b["mint:" + newMint] = mintN,
                                                _b),
                                            pulses: (_c = {},
                                                _c[mint1.geo + ":" + mint1.group] = genesisGroupEntry,
                                                _c[geo + ":" + mint1.group] = newNodePulseEntry,
                                                _c),
                                            rc: "0",
                                            isGenesisNode: "0",
                                            ts: "" + lib_1.now()
                                        };
                                        //console.log(ts()+"newMint="+newMint+" "+dump(config));
                                        expressRedisClient.hmset(mint1.geo + ":" + mint1.group, "owls", genesisGroupEntry.owls);
                                        //expressRedisClient.hmset(geo+":"+mint1.group, "owls",genesisGroupEntry.owls);
                                        callback(config);
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
    });
}
function addMintToGenesisOWLsList(newMint, callback) {
    console.log(lib_1.ts() + "addMintToGenesisOWLsList");
    expressRedisClient.hgetall("mint:0", function (err, me) {
        var newOWLs = "1";
        if (newMint != 1)
            newOWLs = me.owls + "," + newMint;
        console.log(lib_1.ts() + "newOWLs=" + newOWLs);
        expressRedisClient.hmset([me.geo + ":" + me.group], "owls", newOWLs, function (err, reply) {
            callback(newOWLs);
        });
    });
}
function dumpState() {
    expressRedisClient.hgetall("mint:0", function (err, me) {
        console.log(lib_1.ts() + "dumpState mint:0=" + lib_1.dump(me));
        expressRedisClient.hgetall("mint:1", function (err, genesis) {
            console.log(lib_1.ts() + "dumpState mint:1=" + lib_1.dump(genesis));
            expressRedisClient.hgetall("DEVOPS:DEVOPS.1", function (err, genesisGroup) {
                console.log(lib_1.ts() + "dumpState genesisGroupPulseLabel genesisGroup=" + lib_1.dump(genesisGroup));
                expressRedisClient.hgetall("MAZORE:DEVOPS.1", function (err, OREGroup) {
                    console.log(lib_1.ts() + "dumpState MAZORE:DEVOPS=" + lib_1.dump(OREGroup));
                });
            });
        });
    });
}
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
    }); //.on('error', console.log);
});
