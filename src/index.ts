/** entry point */
/*  ALPHA  CODE  */
import express = require('express');
import ejs = require('ejs');
import { logger, LogLevel } from './logger';
import { dump, Log, now } from './lib';
import { grapher } from './grapher';
import { getPulseGroup, AugmentedPulseGroup, Config, MintEntry, PulseEntry, PulseGroup, PulseGroups } from './pulsegroup';


logger.setLevel(LogLevel.WARNING);


// Load config

const config = new Config();


// Construct my own pulseGroup for others to connect to
const me = new MintEntry(1, config.GEO, config.PORT, config.IP, config.PUBLICKEY, config.VERSION, config.WALLET, config.BOOTTIMESTAMP);  //All nodes can count on 'me' always being present
const genesis = new MintEntry(1, config.GEO, config.PORT, config.IP, config.PUBLICKEY, config.VERSION, config.WALLET, config.BOOTTIMESTAMP);  //All nodes also start out ready to be a genesis node for others
var pulse = new PulseEntry(1, config.GEO, config.GEO+".1", config.IP, config.PORT, config.VERSION, config.BOOTTIMESTAMP);    //makePulseEntry(mint, geo, group, ipaddr, port, version) 
var myPulseGroup = new PulseGroup(me, genesis, pulse);  //my pulseGroup Configuration, these two me and genesis are the start of the mintTable
var myPulseGroups: PulseGroups = {};  // TO ADD a PULSE: pulseGroup.pulses["newnode" + ":" + genesis.geo+".1"] = pulse;
logger.info(`Starting with my own pulseGroup=${dump(myPulseGroup)}`);


// Start instrumentaton web server

const REFRESH = 120;  //Every 2 minutes force refresh
const OWLS_DISPLAYED = 30;

var app = express();
app.set('views', config.DARPDIR + '/views');
app.engine('html', ejs.renderFile);
app.set('view engine', 'ejs');
app.use(express.static(config.DARPDIR + '/assets'));

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
    console.log(`UDP server listening on ${config.PORT}`);
}) //.on('error', console.log);

app.get('/', function(req, res) {
    res.setHeader('Content-Type', 'text/html');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.render('index.html', {
        now: now,
        me: me,
        config: config,
        myPulseGroups: myPulseGroups,
        REFRESH: REFRESH,
        OWLS_DISPLAYED: OWLS_DISPLAYED
    }, (err,data) => {
        if (err) {
            logger.error(`${err.name} caused redering of index.html to fail: ${err.message}`);
        } else if (data) {
            res.end(data);
        }
    });
});


//  http://191.237.254.39:65013/extra?a=MAZ-SOUTHEASTASIA-00&i=AWS-AP-SOUTHEAST-1B&z=MAZ-CENTRALUS-00
//
app.get('/extra/:src/:intermediary/:dst', function(req, res) {
    res.setHeader('Content-Type', 'text/html');
    res.setHeader("Access-Control-Allow-Origin", "*");
    var dest=req.params.dst; 
    var src=req.params.src;
    var intermediary=req.params.intermediary;
    var txt='';
    txt+=grapher(src,dest); //get the HTML to display and show graph
    res.end(txt);
    return;
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

 app.get('/asset-manifest.json', function (req, res) {  //I don't know browser complains of this absence
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

const fs = require('fs');
app.get(['/pulsegroups','/state'], function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    let filename=me.ipaddr+"."+me.port+'.json';  //deliver cached JSON file instead of stringifying many times
    //console.log(`sending contents of ${filename}`);
    try {
        var fileContents = fs.readFileSync(filename);
        res.end(fileContents); //CRASH - catch 
    } catch (err) {
        // Here you get the error when the file was not found,
        // but you also get any other error
        res.end("INTERNAL ERROR - can't find pulseGroup object"); //CRASH - catch 
    }

    return;
});

app.get('/me', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    let filename=me.ipaddr+"."+me.port+'.json';  //deliver cached JSON file instead of stringifying many times
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

    return;
});


app.get('/mintTable', function(req, res) {
    logger.info("fetching '/mintTable' ");
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(JSON.stringify(myPulseGroups[me.geo+".1"].mintTable, null, 2)); 
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
    var incomingTimestamp = Number(req.query.ts) || 0;
    
    var incomingBootTimestamp=incomingTimestamp;

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
    console.log("........................ SETTING UP NON-GENESIS PULSE NODE ...................");








    if (myPulseGroup.groupOwner!=me.geo) {
        console.log(`I DO NOT OWN THIS GROUP - REDIRECTING TO my Genesis node... Redirecting /nodeFactory request to my GENESIS NODE ${redirectedURL} `);

        var redirectedURL='http://'+genesis.ipaddr+":"+genesis.port+req.originalUrl;
        console.log(`nodefactory(): if we were not genesis we are redirecting to genesis node nodefactory. redirectURL to genesis=${redirectedURL}`);

        const http = require('http');

        http.get(redirectedURL,(res2) => {
        let body2 = "";

        res2.on("data", (chunk2) => {
            body2 += chunk2;
        });

        res2.on("end", () => {
            console.log(`PROXIED: for caller from redirectedURL`);
            res.end(body2);     //SEND the proxied genesis node config
        });

        }).on("error", (error) => {
            console.error(error.message);
        });
        return;

    } else {
        console.log(`I am Group Owner - answering query myself`);
    }









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
    myPulseGroup.pulses[geo + ":" + myPulseGroup.groupName] = new PulseEntry(newMint, geo, myPulseGroup.groupName, String(incomingIP), port, config.VERSION, incomingBootTimestamp);
    logger.debug(`Added pulse: ${geo}:${myPulseGroup.groupName}=${dump(myPulseGroup.pulses[geo + ":" + myPulseGroup.groupName])}`);
    console.log(`Added pulse: ${geo}:${myPulseGroup.groupName}=${dump(myPulseGroup.pulses[geo + ":" + myPulseGroup.groupName])}`);

    // mintTable - first mintTable[0] is always me and [1] is always genesis node for this pulsegroup
    var newNode = new MintEntry(newMint, geo, port, String(incomingIP), publickey, version, wallet, incomingBootTimestamp);
    myPulseGroup.mintTable[newMint] = newNode;  // we already have a mintTable[0] and a mintTable[1] - add new guy to end mof my genesis mintTable
    
    logger.info(`Added mint# ${newMint} = ${newNode.geo}:${newNode.ipaddr}:${newNode.port}:${newMint} to ${myPulseGroup.groupName}`);
    logger.info(`After adding node, pulseGroup=${dump(myPulseGroup)}`);
    myPulseGroup.nodeCount++;
     
    // make a copy of the pulseGroup for the new node and set its passed-in startup variables
    let newNodePulseGroup = JSON.parse(JSON.stringify(myPulseGroup));  // clone my pulseGroup object 
    newNodePulseGroup.mintTable[0]=newNode;  // assign him his mint and config
    logger.info("* Genesis node created newNodePulseGroup="+dump(newNodePulseGroup));
    console.log("* Genesis node /nodefactory created newNodePulseGroup="+dump(newNodePulseGroup));

    // send response to pulse group member node
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(newNodePulseGroup));  // send mint:0 mint:1 *mint:N groupEntry *entryN
});


// Initiate the protocol

(async () => {
    try {
        myPulseGroup = await getPulseGroup(config);
        logger.info(`DARP NODE STARTED: pulseGroup=${dump(myPulseGroup)}`);
        var augmentedPulseGroup = new AugmentedPulseGroup(config, myPulseGroup);
        myPulseGroups[myPulseGroup.groupName] = augmentedPulseGroup;
        augmentedPulseGroup.flashWireguard();  // create our wireguard files based on our mint Table
        augmentedPulseGroup.pulse();
        augmentedPulseGroup.workerThread();  //start workerthread to asynchronously processes pulse messages
        setTimeout(augmentedPulseGroup.findEfficiencies,1000);  //find where better paths exist between intermediaries - wait a second 
        setTimeout(augmentedPulseGroup.checkSWversion, 10 * 1000);  // check that we have the best software
        setTimeout(augmentedPulseGroup.measurertt, 2 * 1000); // ping across wireguard every other second
    } catch (error) {
        logger.error(error);
    }
})();
