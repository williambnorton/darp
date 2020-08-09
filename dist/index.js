"use strict";
/** entry point */
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
var express = require("express");
var ejs = require("ejs");
var logger_1 = require("./logger");
var lib_1 = require("./lib");
var grapher_1 = require("./grapher");
var pulsegroup_1 = require("./pulsegroup");
logger_1.logger.setLevel(logger_1.LogLevel.WARNING);
// Load config
var config = new pulsegroup_1.Config();
// Construct my own pulseGroup for others to connect to
var me = new pulsegroup_1.MintEntry(1, config.GEO, config.PORT, config.IP, config.PUBLICKEY, config.VERSION, config.WALLET); //All nodes can count on 'me' always being present
var genesis = new pulsegroup_1.MintEntry(1, config.GEO, config.PORT, config.IP, config.PUBLICKEY, config.VERSION, config.WALLET); //All nodes also start out ready to be a genesis node for others
var pulse = new pulsegroup_1.PulseEntry(1, config.GEO, config.GEO + ".1", config.IP, config.PORT, config.VERSION); //makePulseEntry(mint, geo, group, ipaddr, port, version) 
var myPulseGroup = new pulsegroup_1.PulseGroup(me, genesis, pulse); //my pulseGroup Configuration, these two me and genesis are the start of the mintTable
var myPulseGroups = {}; // TO ADD a PULSE: pulseGroup.pulses["newnode" + ":" + genesis.geo+".1"] = pulse;
logger_1.logger.info("Starting with my own pulseGroup=" + lib_1.dump(myPulseGroup));
// Start instrumentaton web server
var REFRESH = 120; //Every 2 minutes force refresh
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
}); //.on('error', console.log);
app.get('/', function (req, res) {
    res.setHeader('Content-Type', 'text/html');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.render('index.html', {
        now: lib_1.now,
        me: me,
        config: config,
        myPulseGroups: myPulseGroups,
        REFRESH: REFRESH,
        OWLS_DISPLAYED: OWLS_DISPLAYED
    }, function (err, data) {
        if (err) {
            logger_1.logger.error(err.name + " caused redering of index.html to fail: " + err.message);
        }
        else if (data) {
            res.end(data);
        }
    });
});
app.get('/version', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(JSON.stringify(me.version));
    return;
});
app.get('/stop', function (req, res) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    logger_1.logger.info("EXITTING and Stopping the node request from " + ip);
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
    logger_1.logger.info("/reboot: THIS SHOULD KICK YOU OUT OF DOCKER request from " + ip);
    lib_1.Log("reboot: THIS SHOULD KICK YOU OUT OF DOCKER request from " + ip);
    var referer = req.get('Referer');
    if (referer !== undefined) {
        res.redirect(referer);
    }
    else {
        //TODO
    }
    process.exit(86);
});
app.get('/reload', function (req, res) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    logger_1.logger.info("EXITTING to reload the system request from: " + ip);
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
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(JSON.stringify({}, null, 2));
    return;
});
app.get('/graph/:src/:dst', function (req, res) {
    res.setHeader('Content-Type', 'text/html');
    res.setHeader("Access-Control-Allow-Origin", "*");
    var dest = req.params.dst;
    var src = req.params.src;
    var txt = '';
    txt += grapher_1.grapher(src, dest); //get the HTML to display and show graph
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
app.get('/pulsegroup/:pulsegroup/:mint', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    // pulseGroup 
    if (typeof req.params.pulsegroup != "undefined") {
        for (var pulseGroup in myPulseGroups) {
            if (myPulseGroups[pulseGroup].groupName == req.params.pulsegroup) {
                var mint = 0;
                if (typeof req.params.mint != "undefined") // use our mint 0
                    mint = parseInt(req.params.mint); // or send mint0 of caller
                var clonedPulseGroup = JSON.parse(JSON.stringify(myPulseGroups[pulseGroup])); // clone my pulseGroup obecjt 
                clonedPulseGroup.mintTable[0] = clonedPulseGroup.mintTable[mint]; // assign him his mint and config
                res.end(JSON.stringify(clonedPulseGroup, null, 2)); // send the cloned group with his mint as mint0
                return; // we sent the more specific
            }
        }
        res.end(JSON.stringify(null));
    }
    else {
        logger_1.logger.warning("No pulseGroup specified");
        res.end(JSON.stringify(myPulseGroups, null, 2));
        return;
    }
});
app.get(['/pulsegroups', '/state', '/me'], function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(JSON.stringify(myPulseGroups, null, 2));
    return;
});
app.get('/mintTable', function (req, res) {
    logger_1.logger.info("fetching '/mintTable' ");
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(JSON.stringify(myPulseGroups, null, 2));
    return;
});
// Configuration for node - allocate a mint
app.get('/nodefactory', function (req, res) {
    // additional nodes adding to pulseGroup
    logger_1.logger.info("EXPRESS /nodefactory: config requested with params: " + lib_1.dump(req.query));
    // parse incoming parameters
    var geo = String(req.query.geo);
    var publickey = String(req.query.publickey);
    var port = Number(req.query.port) || 65013;
    var wallet = String(req.query.wallet) || "";
    var incomingTimestamp = req.query.ts;
    if (typeof incomingTimestamp == "undefined") {
        logger_1.logger.warning("/nodeFactory called with no timestamp");
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            "rc": "-1 nodeFactory called with no timestamp."
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
        return logger_1.logger.error("incomingIP unavailable from geo=" + geo + " incomingIP=" + incomingIP + " clientIncomingIP=" + clientIncomingIP);
    logger_1.logger.info("incomingIP=" + incomingIP + " clientIncomingIP=" + clientIncomingIP + " req.myip=" + req.query.myip);
    var version = String(req.query.version);
    // handle Genesis node case - first to start up
    if (incomingIP == me.ipaddr && (port == config.GENESISPORT)) { // Genesis node instantiating itself - don't need to add anything
        console.log("I AM GENESIS NODE incomingIP=" + incomingIP + " port=" + port + " GENESIS=" + config.GENESIS + " GENESISPORT=" + config.GENESISPORT + " me=" + lib_1.dump(me));
        logger_1.logger.info("...........................GENESIS NODE CONFIGURED FINISHED configured...........");
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(myPulseGroup));
        return;
    }
    //  Or - Handle pulseGroup member case
    logger_1.logger.info("........................ SETTING UP NON-GENESIS PULSE NODE ...................");
    // First, remove previous instances from this IP:port - one IP:port per pulseGroup-we accept the last
    // TODO - this next block should probably use the deleteNode code instead.
    for (var mint in myPulseGroup.mintTable) {
        if (mint == "0" || mint == "1") {
            // ignore mintTable[0] and minttable[1] - never delete these
            logger_1.logger.debug("looking at mint=" + lib_1.dump(myPulseGroup.mintTable[mint]));
        }
        else {
            if ((myPulseGroup.mintTable[mint] != null) && myPulseGroup.mintTable[mint].ipaddr == incomingIP && myPulseGroup.mintTable[mint].port == port) {
                // make sure not do delete me or genesis node
                logger_1.logger.info("deleting previous mint for this node: " + incomingIP + ":" + port + " mint #" + mint + " geo=" + myPulseGroup.mintTable[mint].geo);
                myPulseGroup.mintTable.splice(parseInt(mint));
            }
        }
    }
    // Add pulseGroup mintEntry and pulseEntry and Clone ourselves as the new pulsegroup
    var newMint = myPulseGroup.nextMint++;
    logger_1.logger.info(geo + ": mint=" + newMint + " publickey=" + publickey + " version=" + version + " wallet=" + wallet);
    myPulseGroup.pulses[geo + ":" + myPulseGroup.groupName] = new pulsegroup_1.PulseEntry(newMint, geo, myPulseGroup.groupName, String(incomingIP), port, config.VERSION);
    logger_1.logger.debug("Added pulse: " + geo + ":" + myPulseGroup.groupName + "=" + lib_1.dump(myPulseGroup.pulses[geo + ":" + myPulseGroup.groupName]));
    // mintTable - first mintTable[0] is always me and [1] is always genesis node for this pulsegroup
    var newNode = new pulsegroup_1.MintEntry(newMint, geo, port, String(incomingIP), publickey, version, wallet);
    myPulseGroup.mintTable[newMint] = newNode; // we already have a mintTable[0] and a mintTable[1] - add new guy to end mof my genesis mintTable
    logger_1.logger.info("Added mint# " + newMint + " = " + newNode.geo + ":" + newNode.ipaddr + ":" + newNode.port + ":" + newMint + " to " + myPulseGroup.groupName);
    logger_1.logger.info("After adding node, pulseGroup=" + lib_1.dump(myPulseGroup));
    myPulseGroup.nodeCount++;
    // make a copy of the pulseGroup for the new node and set its passed-in startup variables
    var newNodePulseGroup = JSON.parse(JSON.stringify(myPulseGroup)); // clone my pulseGroup object 
    newNodePulseGroup.mintTable[0] = newNode; // assign him his mint and config
    logger_1.logger.info("* Genesis node created newNodePulseGroup=" + lib_1.dump(newNodePulseGroup));
    newNodePulseGroup.adminControl = 'RESYNCH'; //this will force a wireguard re-flash wg config file with this new node
    // send response to pulse group member node
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(newNodePulseGroup)); // send mint:0 mint:1 *mint:N groupEntry *entryN
});
// Initiate the protocol
(function () { return __awaiter(void 0, void 0, void 0, function () {
    var augmentedPulseGroup, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, pulsegroup_1.getPulseGroup(config)];
            case 1:
                myPulseGroup = _a.sent();
                logger_1.logger.info("DARP NODE STARTED: pulseGroup=" + lib_1.dump(myPulseGroup));
                augmentedPulseGroup = new pulsegroup_1.AugmentedPulseGroup(config, myPulseGroup);
                myPulseGroups[myPulseGroup.groupName] = augmentedPulseGroup; // for now genesis node has no others
                augmentedPulseGroup.flashWireguard(); // create our wireguard files based on our mint Table
                augmentedPulseGroup.recvPulses();
                augmentedPulseGroup.pulse();
                setTimeout(augmentedPulseGroup.checkSWversion, 10 * 1000); // check that we have the best software
                setTimeout(augmentedPulseGroup.measurertt, 2 * 1000); // ping across wireguard every other second
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                logger_1.logger.error(error_1);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); })();
