"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
/** entry point */
/*  ALPHA  CODE  */
var express = require("express");
var ejs = require("ejs");
var logger_1 = require("./logger");
var lib_1 = require("./lib");
var grapher_1 = require("./grapher");
var pulsegroup_1 = require("./pulsegroup");
var pulsegroups_1 = require("./pulsegroups");
logger_1.logger.setLevel(logger_1.LogLevel.WARNING);
//const MAXNODES=25;   //MAX NODES PER PULSEGROUP - reject after this popiulation size
// Load config
var config = pulsegroup_1.CONFIG; //map to global constants from inital pulseGroup CONFIG creation
// Construct my own pulseGroup for others to connect to
var me = new pulsegroup_1.MintEntry(1, config.GEO, config.PORT, config.IP, config.PUBLICKEY, config.VERSION, config.WALLET, config.BOOTTIMESTAMP); //All nodes can count on 'me' always being present
//const genesis = new MintEntry(1, config.GEO, config.PORT, config.IP, config.PUBLICKEY, config.VERSION, config.WALLET, config.BOOTTIMESTAMP);  //All nodes also start out ready to be a genesis node for others
var pulse = new pulsegroup_1.PulseEntry(1, config.GEO, config.GEO + ".1", config.IP, config.PORT, config.VERSION, config.BOOTTIMESTAMP); //makePulseEntry(mint, geo, group, ipaddr, port, version) 
var myPulseGroup = new pulsegroup_1.PulseGroup(me, me, pulse); //this is where I allow others to connect to me
//myPulseGroups[ config.GEO + ".1" ] = new AugmentedPulseGroup(myPulseGroup);
//    myPulseGroups[pulseGroup.groupName]=new AugmentedPulseGroup(pulseGroup);
//var myPulseGroups: PulseGroups = {};  // TO ADD a PULSE: pulseGroup.pulses["newnode" + ":" + genesis.geo+".1"] = pulse;
//var myPulseGroups = getMyPulseGroups();
logger_1.logger.info("Starting with my own pulseGroup=" + lib_1.dump(myPulseGroup));
// Start instrumentaton web server
var REFRESH = 60; //Every 2 minutes force web page instrumentation refresh
var OWLS_DISPLAYED = 30;
var app = express();
app.set('views', config.DARPDIR + '/views');
app.engine('html', ejs.renderFile);
app.set('view engine', 'ejs');
app.use(express.static(config.DARPDIR + '/assets'));
var server = app.listen(config.PORT, '0.0.0.0', function () {
    //TODO: add error handling here
    var serverAdddress = server.address();
    if (typeof serverAdddress !== 'string' && serverAdddress !== null) {
        var host = serverAdddress.address;
        var port = serverAdddress.port;
        logger_1.logger.info("Express app listening at http://" + host + ":" + port);
    }
    else {
        logger_1.logger.error("Express app initialization failed");
    }
    console.log("UDP server listening on " + config.PORT);
}); //.on('error', console.log);
//
//  / is for instrumentation for ALL pulseGroups
//
app.get('/', function (req, res) {
    res.setHeader('Content-Type', 'text/html');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.render('index.html', {
        now: lib_1.now,
        me: me,
        config: config,
        myPulseGroups: pulsegroups_1.myPulseGroups,
        REFRESH: REFRESH,
        OWLS_DISPLAYED: OWLS_DISPLAYED
    }, function (err, data) {
        if (err) {
            logger_1.logger.error(err.name + " caused rendering of index.html to fail: " + err.message);
        }
        else if (data) {
            res.end(data);
        }
    });
});
//
//  http://191.237.254.39:65013/extra?a=MAZ-SOUTHEASTASIA-00&i=AWS-AP-SOUTHEAST-1B&z=MAZ-CENTRALUS-00
//
app.get('/extra/:src/:intermediary/:dst', function (req, res) {
    res.setHeader('Content-Type', 'text/html');
    res.setHeader("Access-Control-Allow-Origin", "*");
    var dest = req.params.dst;
    var src = req.params.src;
    var intermediary = req.params.intermediary;
    var txt = '';
    txt += grapher_1.grapher(src, dest); //get the HTML to display and show graph
    res.end(txt);
    return;
});
//
//  /version - is showing the config software version for all groups
//
app.get('/version', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    //console.log(`/version returning ${config.VERSION}`);
    res.end(JSON.stringify(config.VERSION));
    return;
});
//
//  /genesis - is showing the config software version for all groups
//
app.get('/genesis', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    //console.log(`/version returning ${config.VERSION}`);
    res.end(JSON.stringify(config.GENESIS));
    return;
});
//
//  /genesisnodelist - for discovery - should be JSON
//
app.get('/darpdocker', function (req, res) {
    res.setHeader('Content-Type', 'application/binary');
    res.setHeader("Access-Control-Allow-Origin", "*");
    var filename = "/etc/wireguard/darpdocker.tgz"; //deliver cached JSON file instead of stringifying many times
    //console.log(`/darpdocker sending contents of ${filename} to ${req.connection.remoteAddress}`);
    var options = {
        //root: path.join(__dirname, 'files'),
        dotfiles: 'deny',
        headers: {
            'x-timestamp': Date.now(),
            'x-sent': true
        }
    };
    res.sendFile(filename, options);
    console.log(lib_1.ts() + ("/darpdocker sent contents of " + filename + " to " + req.connection.remoteAddress));
    return;
});
//
// /pause - not used yet - should be per group
//
app.get('/pause', function (req, res) {
    console.log("PAUSING -- here we would set adminControl on the pulse group to SINGLESTEP");
    return;
});
//
//  findNode
//
function findNode(ipport) {
    var ip = ipport.split(":")[0];
    var port = parseInt(ipport.split(":")[1]);
    for (var pg in pulsegroups_1.myPulseGroups) {
        var pulseGroup = pulsegroups_1.myPulseGroups[pg];
        //var pulseGroup=myPulseGroups[CONFIG.GEO+".1"];
        for (var m in pulseGroup.mintTable) {
            var mintTableEntry = pulseGroup.mintTable[m];
            if (mintTableEntry != null && mintTableEntry.ipaddr == ip && mintTableEntry.port == port) {
                console.log("findNode(): FOUND " + mintTableEntry.geo);
                return mintTableEntry;
            }
        }
    }
    return null;
}
//
//     /join - this message is sent by Genesis node invinting to be potential relay
//             simpler - Genesis node sends as new PG payload (the pulseGroup object)
//
app.get('/join/:pulsegroupaddress', function (req, res) {
    var pulsegroupaddress = req.params.pulsegroupaddress;
    //@wbn@wbn - try a put and just instantiate and start the freeze dried pulsegroup
    console.log("join -- This would be only valid over an encrypted path coming from " + pulsegroup_1.CONFIG.GENESIS);
    //    const configurl = "http://" + req.params.destip + ":" + req.params.destport + 
    if (pulsegroupaddress.indexOf(':') == -1)
        pulsegroupaddress = pulsegroupaddress + ":65013"; //default port
    var configurl = "http://" + pulsegroupaddress +
        "/nodefactory?geo=" + pulsegroup_1.CONFIG.GEO +
        "&port=" + config.PORT +
        "&publickey=" + config.PUBLICKEY +
        "&genesisport=" + config.GENESISPORT +
        "&version=" + config.VERSION +
        "&wallet=" + config.WALLET +
        "&myip=" + config.IP +
        "&ts=" + lib_1.now();
    //console.log(`DISABLED /JOIN ${CONFIG.GEO} /join will execute /nodeFactory on ${pulsegroupaddress} to join ${configurl}`);    //return
    //return;
    if (pulsegroupaddress != config.IP + ":" + config.PORT) { //not me
        //if ( pulseGroupsFind(pulsegroupaddress) ) //don't join if I am already with them
        //if ( findNode(pulsegroupaddress) == null ) { //if we don't already see him
        if (findNode(pulsegroupaddress) == null) { //if our group doesn't already see him
            pulsegroup_1.getPulseGroupURL(configurl); //join this guys group
            console.log("index.ts: /JOINING " + pulsegroup_1.CONFIG.GEO + " " + pulsegroup_1.CONFIG.IP + " /join will execute /nodeFactory on " + pulsegroupaddress + " to join " + configurl); //return
        }
        else {
            console.log("index.ts: NOT /JOINING " + pulsegroup_1.CONFIG.GEO + " " + pulsegroup_1.CONFIG.IP + " "); //return
        }
    }
    else
        console.log("not connecting to myself via /join");
    //    res.redirect( 'http://' + CONFIG.IP+":"+CONFIG.PORT+"/" );
    res.redirect('http://' + pulsegroupaddress + "/");
    return;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(JSON.stringify(lib_1.ts() + "/join pulseGroup with " + configurl));
    return;
});
//
// /stop - stops ALL pulse Groups by exiting 86 - this means kill docker
//
app.get('/stop', function (req, res) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    logger_1.logger.info("EXITTING and Stopping the node request from " + ip);
    lib_1.Log("EXITTING and Stopping the node request from " + ip);
    console.log("#################################### STOP MESSAGE RECEIVED -  EXITTING and Stopping the node request from " + ip);
    console.log("#################################### STOP MESSAGE RECEIVED -  EXITTING and Stopping the node request from " + ip);
    console.log("#################################### STOP MESSAGE RECEIVED -  EXITTING and Stopping the node request from " + ip);
    console.log("#################################### STOP MESSAGE RECEIVED -  EXITTING and Stopping the node request from " + ip);
    console.log("#################################### STOP MESSAGE RECEIVED -  EXITTING and Stopping the node request from " + ip);
    console.log("#################################### STOP MESSAGE RECEIVED -  EXITTING and Stopping the node request from " + ip);
    var referer = req.get('Referer');
    if (referer !== undefined) {
        res.redirect(referer);
    }
    else {
        //TODO
        res.setHeader('Content-Type', 'application/json');
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.end(JSON.stringify("stop"));
    }
    process.exit(86);
});
//
//  /reboot - reboot - stops ALL pulse Groups by exitting -1 - this means reboot/refetch/reload docker
//
app.get('/reboot', function (req, res) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    logger_1.logger.info("/reboot: THIS SHOULD KICK YOU OUT OF DOCKER request from " + ip);
    lib_1.Log("reboot: THIS SHOULD KICK YOU OUT OF DOCKER request from " + ip);
    console.log("#################################### REBOOT MESSAGE RECEIVED -  EXITTING docker requested from " + ip);
    console.log("#################################### REBOOT MESSAGE RECEIVED -  EXITTING docker requested from " + ip);
    console.log("#################################### REBOOT MESSAGE RECEIVED -  EXITTING docker requested from " + ip);
    console.log("#################################### REBOOT MESSAGE RECEIVED -  EXITTING docker requested from " + ip);
    console.log("#################################### REBOOT MESSAGE RECEIVED -  EXITTING docker requested from " + ip);
    console.log("#################################### REBOOT MESSAGE RECEIVED -  EXITTING docker requested from " + ip);
    var referer = req.get('Referer');
    if (referer !== undefined) {
        res.redirect(referer);
    }
    else {
        //TODO
        res.setHeader('Content-Type', 'application/json');
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.end(JSON.stringify("reboot"));
    }
    process.exit(-1);
});
//
//  /reload - refetch/reload the DARP protocol software by exitting 36
//
app.get('/reload', function (req, res) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    logger_1.logger.info("EXITTING to reload the system request from: " + ip);
    lib_1.Log("EXITTING to reload the system request from: " + ip);
    console.log("#################################### RELOAD SOFTWARE MESSAGE RECEIVED -  EXITTING docker requested from " + ip);
    console.log("#################################### RELOAD SOFTWARE MESSAGE RECEIVED -  EXITTING docker requested from " + ip);
    console.log("#################################### RELOAD SOFTWARE MESSAGE RECEIVED -  EXITTING docker requested from " + ip);
    console.log("#################################### RELOAD SOFTWARE MESSAGE RECEIVED -  EXITTING docker requested from " + ip);
    console.log("#################################### RELOAD SOFTWARE MESSAGE RECEIVED -  EXITTING docker requested from " + ip);
    var referer = req.get('Referer');
    if (referer !== undefined) {
        res.redirect(referer);
    }
    else {
        //TODO
        res.setHeader('Content-Type', 'application/json');
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.end(JSON.stringify("reloaded"));
    }
    //
    //  might be possible here to reload by running updateSW and not lose state
    //
    process.exit(36);
});
//
// /asset-manifest - stops the complaining
//
app.get('/asset-manifest.json', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(JSON.stringify({}, null, 2));
    return;
});
//
//  /graph - this should be per pulseGroup
//
app.get('/graph/:src/:dst', function (req, res) {
    res.setHeader('Content-Type', 'text/html');
    res.setHeader("Access-Control-Allow-Origin", "*");
    var dest = req.params.dst;
    var src = req.params.src;
    var txt = '';
    txt += grapher_1.grapher(src, dest); //get the HTML to display and show graph
    res.end(txt);
    return;
});
//
//  /mintTable - BUG this returns pulseGroup - should return only mintTable, but caller uses the fuull pulseGroup pulses and all
//
//  this API should be the heart of the project - request a pulseGroup configuration for yourself (w/paramters), 
//  or update your specific pulseGroup to the group owner's 
app.get(['/mintTable', '/mintTable/:pulsegroup/:mint', '/mintTable/:pulsegroup'], function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    console.log("index.ts: " + req.connection.remoteAddress + " fetching pulseGroup " + req.params.pulsegroup + " " + (req.params.mint || "all"));
    // pulseGroup 
    var pulseGroupName = me.geo + ".1"; //assume 
    if (typeof req.params.pulsegroup != "undefined") {
        pulseGroupName = req.params.pulsegroup;
    }
    for (var pulseGroup in pulsegroups_1.myPulseGroups) {
        if (pulsegroups_1.myPulseGroups[pulseGroup].groupName == pulseGroupName) {
            var mint = 0;
            if (typeof req.params.mint != "undefined") // use our mint 0
                mint = parseInt(req.params.mint); // or send mint0 of caller
            var clonedPulseGroup = JSON.parse(JSON.stringify(pulsegroups_1.myPulseGroups[pulseGroup])); // clone my pulseGroup obecjt 
            if (typeof clonedPulseGroup.mintTable[mint] != "undefined" && clonedPulseGroup.mintTable[mint] != null)
                clonedPulseGroup.mintTable[0] = clonedPulseGroup.mintTable[mint]; // assign him his mint and config
            res.end(JSON.stringify(clonedPulseGroup, null, 2)); // send the cloned group with his mint as mint0
            return; // we sent the more specific
        }
    }
    res.end(JSON.stringify(null));
});
//
//  /pulseGroups /state    <-- this is actually the workhorse
//
var fs = require('fs');
app.get(['/pulsegroups', '/state'], function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    // remove history
    var clonedPulseGroups = JSON.parse(JSON.stringify(pulsegroups_1.myPulseGroups, null, 2));
    for (var i in clonedPulseGroups) {
        var pulseGroup = clonedPulseGroups[i];
        for (var p in pulseGroup.pulses) {
            pulseGroup.pulses[p].history = {};
        }
    }
    var myShortPulseGroups = JSON.stringify(clonedPulseGroups, null, 2);
    res.end(myShortPulseGroups);
    return;
});
//
//  /genesisnodelist - for discovery - should be JSON
//
app.get('/genesisnodelist', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    var filename = "../" + "genesisnodelist.config"; //deliver cached JSON file instead of stringifying many times
    console.log("/genesisnodelist sending contents of " + filename + " - maybe should be JSON formtted");
    try {
        var fileContents = fs.readFileSync(filename);
        //console.log(`filecontents=${fileContents}`);
        res.end(fileContents); //
    }
    catch (err) {
        // Here you get the error when the file was not found,
        // but you also get any other error
        res.end("INTERNAL ERROR - can't find genesisnodelist.config ");
    }
    return;
});
//
//  /me - shorthand for my pulseGroup
//
app.get('/me', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(JSON.stringify(pulsegroups_1.myPulseGroups[me.geo + ".1"], null, 2));
    /*
        //      DO NOT DELETE     CACHING HELPS HERE
        let filename="../"+me.ipaddr+"."+me.port+'.json';  //deliver cached JSON file instead of stringifying many times
        console.log(`/me sending contents of ${filename}`);
        try {
            var fileContents = fs.readFileSync(filename);
            //console.log(`filecontents=${fileContents}`);
    
            res.end(JSON.stringify(JSON.parse(fileContents),null,2)); //CRASH - catch
        } catch (err) {
            // Here you get the error when the file was not found,
            // but you also get any other error
            res.end("INTERNAL ERROR - can't find pulseGroup object"); //CRASH - catch
        }
    */
    return;
});
/*
//
//  /mintTable - should return my pulseGroups[ me.geo + ".1" ]
//
app.get('/oldmintTable', function(req, res) {
    logger.info("fetching '/mintTable' ");
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    try {
        res.end(JSON.stringify(myPulseGroups[me.geo+".1"].mintTable, null, 2));
    } catch(e) {};
    return;
});
*/
function findPublicKey(incomingKey) {
    var myMintTable = pulsegroups_1.myPulseGroups[me.geo + ".1"].mintTable;
    for (var m in myMintTable) {
        if (myMintTable[m] != null && myMintTable[m].publickey == incomingKey)
            return myMintTable[m];
    }
    return null;
}
//
//  /publickey  -  only return if you have it
//
app.get(['/publickey', '/publickey/:publickey'], function (req, res) {
    console.log("fetching '/publickey' searching for " + req.params.publickey);
    if (typeof req.params.publickey == "undefined" || req.params.publickey == "" || req.params.publickey == null) {
        console.log("NULL key searched - sending all mintTable");
        res.setHeader('Content-Type', 'application/json');
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.send(JSON.stringify(pulsegroups_1.myPulseGroups[me.geo + ".1"].mintTable, null, 2));
    }
    else {
        console.log("looking up public key " + req.params.publickey + " in this nmintTable");
        var G = findPublicKey(req.params.publickey);
        if (G == null) {
            console.log("/publickey - could not find publickey " + req.params.publickey);
            return; //do nothing -- silently fail
        }
        //All is well - send the key object they can use to connect directly or to its genesis node.
        res.setHeader('Content-Type', 'application/json');
        res.setHeader("Access-Control-Allow-Origin", "*");
        try {
            console.log("we found public key - option A) return the genesis node that has this public key ");
            var returnedObject = {
                publickey: G.publickey,
                genesisIP: pulsegroups_1.myPulseGroups[me.geo + ".1"].mintTable[1].ipaddr,
                genesisPort: pulsegroups_1.myPulseGroups[me.geo + ".1"].mintTable[1].port,
                destIP: G.ipaddr,
                destPort: G.port
            };
            console.log("returnedObject=" + JSON.stringify(returnedObject, null, 2));
            res.end(JSON.stringify(returnedObject)); // IPADDR : PORT of my genesis node 
        }
        catch (e) { }
        ;
        return;
    }
});
//
//  /lookup  -  only return if you have it
//
app.get(['/lookup/:searchString', '/lookup/', '/lookup/:searchString/:sourceGeo'], function (req, res) {
    console.log("fetching '/lookup' searching for " + req.params.searchString);
    if (typeof req.params.searchString == "undefined" || req.params.searchString == "" || req.params.searchString == null) {
        console.log("NULL key searched - sending all mintTable");
        res.setHeader('Content-Type', 'application/json');
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.send(JSON.stringify(pulsegroups_1.myPulseGroups[me.geo + ".1"].mintTable, null, 2));
        return;
    }
    console.log("looking up search string " + req.params.searchString + " in this mintTable");
    var sourceGeo = "";
    if (typeof req.params.sourceGeo != "undefined") {
        sourceGeo = req.params.sourceGeo;
    }
    var myMintTable = pulsegroups_1.myPulseGroups[me.geo + ".1"].mintTable;
    var searchString = req.params.searchString;
    //var re=new RegExp(searchString,"g")
    for (var m in myMintTable) {
        if (myMintTable[m] != null) {
            console.log("/lookup looking for " + searchString + " from mintEntry " + myMintTable[m].geo + " ");
            if ((myMintTable[m].publickey == searchString) ||
                (myMintTable[m].ipaddr + ":" + myMintTable[m].port == searchString) ||
                (myMintTable[m].geo == searchString) ||
                (myMintTable[m].ipaddr == searchString && myMintTable[m].port == 65013) /* ||  //DEFAULT PORT DEFAULT
            (re.test(myMintTable[m].geo)) */) {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader("Access-Control-Allow-Origin", "*");
                console.log("/lookup FOUND " + searchString + " ");
                /*
                var returnedObject = {  //do we want to add
                    publickey:G.publickey,
                    genesisIP:myPulseGroups[me.geo+".1"].mintTable[1].ipaddr,
                    genesisPort:myPulseGroups[me.geo+".1"].mintTable[1].port,
                    destIP:G.ipaddr,
                    destPort:G.port
                }
                */
                //console.log(`returnedObject=${JSON.stringify(returnedObject,null,2)}`);
                res.end(JSON.stringify(JSON.stringify(myMintTable[m]), null, 2)); // IPADDR : PORT of my genesis node 
                return;
            }
        }
    }
    // We do not have this deztination in our own groups
    // ONLY One Genesis Node should do the GeneisNodeList-wide search
    if (sourceGeo != "" && typeof pulsegroups_1.myPulseGroups[pulsegroup_1.CONFIG.GEO + ".1"].pulses[sourceGeo + ":" + pulsegroup_1.CONFIG.GEO + ".1"] != "undefined") {
        //      ask every node in the GenesisLNodeList
        console.log("/lookup - Here we would ask the GenesisNodeList if they have it in their own mintTable : GNL=" + process.env.GENESISNODELIST);
    }
    else {
        // else return null, that we don't have this search entry
        res.setHeader('Content-Type', 'application/json');
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.end(JSON.stringify({})); // don't have it - might be easier to just ignore the request - this is better UDP
    }
});
//
// nodeFactory - the engine of the system - Genesis node we clone ourselves and set self to the new guy
//
// this way the new guy starts wth our collective (genesis) understanding of counters)
// we also sync counters this with genesis certain times as a hack or defensive measure
// Configuration for node - allocate a mint
//
//  if (destination specified)
//      for each in GenesisNodeList
//          if (node.lookup(destination) ) {
//              return genesisNode.buildPulseGroup(srcPulseGroup,source,destination)
//              
// //buildPulseGroup(PG,source,destination)
//          if (destination is me) blend(source,sourcePG,destination,destinationPG)
// 
app.get('/nodefactory', function (req, res) {
    // additional nodes adding to pulseGroup
    logger_1.logger.info("EXPRESS /nodefactory: config requested with params: " + lib_1.dump(req.query));
    // parse incoming parameters
    var incomingGeo = String(req.query.geo);
    var publickey = String(req.query.publickey);
    var port = Number(req.query.port) || 65013;
    var wallet = String(req.query.wallet) || "";
    var incomingTimestamp = Number(req.query.ts) || 0;
    var incomingBootTimestamp = incomingTimestamp;
    if (typeof incomingTimestamp == "undefined") {
        logger_1.logger.warning("/nodeFactory called with no timestamp");
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            "rc": "-1 /nodeFactory called with no timestamp."
        }));
        return;
    }
    var incomingIP = req.query.myip; // for now we believe the node's IP
    var octetCount = 0;
    if (typeof incomingIP === "string") {
        var octetCount = incomingIP.split(".").length; // but validate as IP, not error msg
    }
    if (octetCount != 4) {
        incomingIP = "noMYIP";
    }
    ;
    var clientIncomingIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (incomingIP == "noMYIP")
        incomingIP = clientIncomingIP;
    if (typeof incomingIP == "undefined")
        return logger_1.logger.error("incomingIP unavailable from geo=" + incomingGeo + " incomingIP=" + incomingIP + " clientIncomingIP=" + clientIncomingIP);
    logger_1.logger.info("incomingIP=" + incomingIP + " clientIncomingIP=" + clientIncomingIP + " req.myip=" + req.query.myip);
    var version = String(req.query.version); ///why do we look at client version param?
    version = lib_1.MYVERSION();
    version = config.VERSION;
    //var myPulseGroup=myPulseGroups[ me.geo + ".1"];  //this is the pulseGroup to add to
    //console.log(`index.ts: myPulseGroup that I can add to is:${dump(myPulseGroup)}`);
    // handle Genesis node case - first to start up
    if (incomingIP == me.ipaddr && (port == config.GENESISPORT)) { // Genesis node instantiating itself - don't need to add anything
        console.log("I AM GENESIS NODE incomingIP=" + incomingIP + " port=" + port + " GENESIS=" + config.GENESIS + " GENESISPORT=" + config.GENESISPORT + " me=" + lib_1.dump(me));
        //Log(ts()+` NEW NODEFACTORY Created GENESIS NODE ${myPulseGroup.groupOwner} : ${myPulseGroup.groupName} ${JSON.stringify(myPulseGroup)}`);
        lib_1.Log("NEW NODEFACTORY Created GENESIS NODE   " + pulsegroup_1.CONFIG.GEO + " : " + (pulsegroup_1.CONFIG.GEO + ".1") + " " + pulsegroup_1.CONFIG.IP + ":" + pulsegroup_1.CONFIG.PORT);
        console.log("NEW NODEFACTORY Created GENESIS NODE    " + pulsegroup_1.CONFIG.GEO + " : " + (pulsegroup_1.CONFIG.GEO + ".1") + " " + pulsegroup_1.CONFIG.IP + ":" + pulsegroup_1.CONFIG.PORT);
        console.log("At this point, we ourselves are GENESIS NODE");
        //myPulseGroups[ me.geo + ".1"]=new AugmentedPulseGroup(myPulseGroup);
        //        myPulseGroup.nodeCount=Object.keys(myPulseGroup.pulses).length;
        //myPulseGroup.rc="SELF"
        //myPulseGroups[ config.GEO + ":" + config.GEO + ".1" ]=myPulseGroup
        //myPulseGroups[ config.GEO + ".1" ]=myPulseGroup
        //@wbnwbnwbn - replace with this
        //addPulseGroup(myPulseGroup);    
        //addPulseGroup(myPulseGroup);   //add a new pulseGroup <-- already started or wouldn't not be able to call this API
        logger_1.logger.info("...........................GENESIS NODE CONFIGURED : ${JSON.stringify(myPulseGroups[ config.GEO + '.1' ],null,2)}");
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(myPulseGroup));
        return;
    }
    //  Or - Handle pulseGroup member case
    logger_1.logger.info("........................ SETTING UP NON-GENESIS PULSE NODE ...................");
    console.log(lib_1.ts() + ("........................ SETTING UP NON-GENESIS PULSE NODE for " + incomingGeo + " to connect to my " + config.GEO + ".1 pulseGroup ..................."));
    if (Object.keys(myPulseGroup.pulses).length >= config.MAXNODES) {
        console.log(lib_1.ts() + ("EXCEEDED MAX NODES (" + myPulseGroup.nodeCount + ">" + config.MAXNODES + ")IN PULSE GROUP - IGNORING REQUEST from " + incomingGeo + " " + incomingIP + " " + clientIncomingIP + " " + req.query.myip));
        lib_1.Log(lib_1.ts() + ("EXCEEDED MAX NODES (" + myPulseGroup.nodeCount + ">" + config.MAXNODES + ")IN PULSE GROUP - IGNORING REQUEST from " + incomingGeo + " " + incomingIP + " " + clientIncomingIP + " " + req.query.myip));
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(null));
        return;
    }
    // First, remove previous instances from this IP:port - one IP:port per pulseGroup-we accept the last
    // TODO - this next block should probably use the deleteNode code instead.
    for (var mint in myPulseGroup.mintTable) {
        if (mint == "0" || mint == "1") {
            // ignore mintTable[0] and minttable[1] - never delete these
            //logger.debug(`looking at mint=${dump(myPulseGroup.mintTable[mint])}`);
        }
        else {
            if ((myPulseGroup.mintTable[mint] != null) && myPulseGroup.mintTable[mint].ipaddr == incomingIP && myPulseGroup.mintTable[mint].port == port) {
                // make sure not do delete me or genesis node
                console.log("deleting previous mint for this node: " + incomingIP + ":" + port + " mint #" + mint + " geo=" + myPulseGroup.mintTable[mint].geo);
                myPulseGroup.mintTable.splice(parseInt(mint));
                //Do we want to set this mint Table entry to null to void its reuse or shifting of mint entries??
            }
        }
    }
    // Add pulseGroup mintEntry and pulseEntry and Clone ourselves as the new pulsegroup CLONE CLONE CLONE
    var newMint = myPulseGroup.nextMint++;
    console.log(incomingGeo + ": mint=" + newMint + " publickey=" + publickey + " version=" + version + " wallet=" + wallet);
    myPulseGroup.pulses[incomingGeo + ":" + myPulseGroup.groupName] = new pulsegroup_1.PulseEntry(newMint, incomingGeo.toString(), myPulseGroup.groupName, String(incomingIP), port, config.VERSION, incomingBootTimestamp);
    logger_1.logger.debug("Added pulse: " + incomingGeo + ":" + myPulseGroup.groupName + "=" + lib_1.dump(myPulseGroup.pulses[incomingGeo + ":" + myPulseGroup.groupName]));
    console.log("Added pulse: " + incomingGeo + ":" + myPulseGroup.groupName + "=" + lib_1.dump(myPulseGroup.pulses[incomingGeo + ":" + myPulseGroup.groupName]));
    // mintTable - first mintTable[0] is always me and [1] is always genesis node for this pulsegroup
    var newNode = new pulsegroup_1.MintEntry(newMint, incomingGeo.toString(), port, String(incomingIP), publickey, version, wallet, incomingBootTimestamp);
    myPulseGroup.mintTable[newMint] = newNode; // we already have a mintTable[0] and a mintTable[1] - add new guy to end mof my genesis mintTable
    logger_1.logger.info("Added mint# " + newMint + " = " + newNode.geo + ":" + newNode.ipaddr + ":" + newNode.port + ":" + newMint + " to " + myPulseGroup.groupName);
    //console.log(`After adding node, pulseGroup=${dump(myPulseGroup)}`);
    myPulseGroup.nodeCount = Object.keys(myPulseGroup.pulses).length;
    //myPulseGroups[ myPulseGroup.groupName ] = myPulseGroup;  //
    //addPulseGroup(myPulseGroup);   //@wbnwbnwbn Add new pulseGroup as an Augmented Pulse Group Object
    //console.log(`********* = = = = = = = = =     myPulseGroups = ${JSON.stringify(myPulseGroups,null,2)}`); 
    //------------------------------  CLONE SELF   --------------------------------------------
    // make a copy of the pulseGroup for the new node and set its passed-in startup variables
    var newNodePulseGroup = JSON.parse(JSON.stringify(myPulseGroup)); // CLONE my pulseGroup object 
    newNodePulseGroup.mintTable[0] = newNode; // assign him his mint and config
    //
    //  Trim from the clone of the genesis Node  @bn=wbnwbnwbnwbnwbnwbnwbn  NEW CODE
    //
    // Here clear the clone's history and median history for each pulse @wbnwbnwbn
    //              clear the pulseTimestamps to 0 as they are in the genesis node's clock anyway 
    //Also clear the mintTable lastOWL and PulseTimestamps
    for (var m in newNodePulseGroup.pulses) {
        newNodePulseGroup.pulses[m].history = newNodePulseGroup.pulses[m].medianHistory = [];
        newNodePulseGroup.pulses[m].owl = 99999; //no measures
        newNodePulseGroup.pulses[m].inPulses = newNodePulseGroup.pulses[m].outPulses = newNodePulseGroup.pulses[m].relayCount = newNodePulseGroup.pulses[m].pktDrops = 0;
        newNodePulseGroup.pulses[m].pulseTimestamp = 0;
        newNodePulseGroup.pulses[m].lastMsg = "";
        newNodePulseGroup.pulses[m].state = "QUARANTINE"; //   ???   mark UP when we receive a pulse from this node?
        newNodePulseGroup.pulses[m].owls = "1"; //   ???   mark UP when we receive a pulse?
    }
    newNodePulseGroup.rc = "child of " + me.geo + "(" + me.ipaddr + ":" + me.port + ")";
    lib_1.Log("NEW NODEFACTORY Created Member NODE   " + newNodePulseGroup.mintTable[0].geo + " : " + newNodePulseGroup.groupName + " " + newNodePulseGroup.mintTable[0].ipaddr + ":" + newNodePulseGroup.mintTable[0].port);
    console.log("NEW NODEFACTORY Created Member NODE   " + newNodePulseGroup.mintTable[0].geo + " : " + newNodePulseGroup.groupName + " " + newNodePulseGroup.mintTable[0].ipaddr + ":" + newNodePulseGroup.mintTable[0].port);
    logger_1.logger.info("* Genesis node created newNodePulseGroup=" + lib_1.dump(newNodePulseGroup));
    //console.log("* Genesis node /nodefactory created newNodePulseGroup="+dump(newNodePulseGroup));
    // send response to pulse group member node
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(newNodePulseGroup)); // send mint:0 mint:1 *mint:N groupEntry *entryN
});
// Initiate the protocol  
//  this is where it all begins - here we start up our own group
// do this also for a group created for children
(function () { return __awaiter(void 0, void 0, void 0, function () {
    var myOriginalPulseGroup, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                myOriginalPulseGroup = myPulseGroup;
                return [4 /*yield*/, pulsegroup_1.getPulseGroup(config)];
            case 1:
                myPulseGroup = _a.sent(); //get config from Geneis node and start it
                //var anchorPulseGroup = await getPulseGroup(config);   //t
                //console.log(`asynch() DARP NODE STARTED: anchor GENESIS=${myPulseGroup.groupOwner} pulseGroup=${dump(myPulseGroup)}`);
                //var augmentedPulseGroup = new AugmentedPulseGroup(myPulseGroup);   //augmented with pulseGroup methods
                //console.log(`augmentedPulseGroup=${JSON.stringify(augmentedPulseGroup,null,2)}`);
                //augmentedPulseGroup.flashWireguard();  // create our wireguard files based on our mint Table
                //augmentedPulseGroup.pulse();
                //augmentedPulseGroup.workerThread();  //start workerthread to asynchronously processes pulse messages
                //setTimeout(augmentedPulseGroup.findEfficiencies,1000);  //find where better paths exist between intermediaries - wait a second 
                //setTimeout(augmentedPulseGroup.checkSWversion, 10 * 1000);  // check that we have the best software
                //setTimeout(augmentedPulseGroup.measurertt, 2 * 1000); // ping across wireguard every other second
                //myPulseGroups[ myPulseGroup.groupName ] = augmentedPulseGroup;     //wire it in started up from self or genesis node
                //addPulseGroup(myPulseGroup);    //create and start this first connetion into the ecosystem
                if (myPulseGroup.groupOwner != pulsegroup_1.CONFIG.GEO) { //if we instantiated someone else's pulse group, also spin up our own
                    //myPulseGroups[ me.geo+".1" ] = new AugmentedPulseGroup(myOriginalPulseGroup); 
                    pulsegroups_1.addPulseGroup(myOriginalPulseGroup); //start up my own pulse group
                    //myPulseGroup=myPulseGroups[ me.geo+".1" ];
                    console.log("******* Also instantiated myPulseGroup Object: You should see two groups - we are *not* GENESIS node");
                    //myPulseGroups[ config.GEO + ".1" ] = new AugmentedPulseGroup(myPulseGroup);
                }
                else {
                    console.log("index.ts:  WE LAUNCHED " + myPulseGroup.groupName + " OUR OWN " + pulsegroup_1.CONFIG.GEO + " PULSE GROUP " + JSON.stringify(pulsegroups_1.myPulseGroups[pulsegroup_1.CONFIG.GEO + ".1"], null, 2));
                }
                myPulseGroup = pulsegroups_1.myPulseGroups[pulsegroup_1.CONFIG.GEO + ".1"];
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.log("index.ts:  error ");
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); })();
/**/
//
//  darp.bash substitutes in proper CODE and CONFIG for new node
//
app.get('/darp.bash', function (req, res) {
    console.log("req.query=", req.query);
    logger_1.logger.info("sending '/darp.bash' to new cadet ");
    res.setHeader('Content-Type', 'text/javascript');
    res.setHeader("Access-Control-Allow-Origin", "*");
    fs.readFile('darp.bash', function (err, data) {
        if (err)
            console.log("darp.bash file unavailable"); //console.log(`sending data ${data}`);
        else {
            console.log("retrieving darp.bash for " + req.connection.remoteAddress + " config.GENESIS=" + config.GENESIS);
            //console.log(`data=${data}`);
            var str = data.toString();
            //here we can take options for initial set up - ?mode=auto
            //option 1 -  use my GENESIS node so private wireguard can be used right away.
            //str=str.replace(/MYGENESISIP/gi, config.GENESIS );
            //option 1a - conditionally configure node connected to my GENESIS . Send darp.bash iff (condition goes here) 
            //option 2 - connect to the ndoe that responds first.
            //          get code from any genesis node on genesislist, but we will use first
            //var genesislist=process.env.GENESISNODELIST||"";
            //var genesisNodes=genesislist.split(",");
            //str=str.replace(/MYGENESISIP/gi, genesisNodes[0] );
            str = str.replace(/MYGENESISIP/gi, "auto");
            str = str.replace(/DOCKERTAG/gi, config.VERSION.split(":")[0]);
            str = str.replace(/GITTAG/gi, config.VERSION.split(":")[1]);
            str = str.replace(/GENESIS_NODE_LIST/gi, process.env.GENESISNODELIST || ""); //inherit GNL
            str = str.replace(/_MY_IP/gi, config.IP || ""); //inherit GNL
            str = str.replace(/_MY_PORT/gi, config.PORT.toString()); //inherit GNL
            //console.log(`genesisNodes[0]=${genesisNodes[0]}   <--- Here I plug in the First Genesis node in list - `);
            //console.log("darp.bash="+str);
            res.send(str);
            //        res.send(data.toString().replace(/__MYGENESISIP__/, config.GENESIS) );
        }
    });
});
