/** entry point */
/*  ALPHA  CODE  */
import express = require('express');
import ejs = require('ejs');
import { logger, LogLevel } from './logger';
import { dump, Log, now, ts, MYVERSION } from './lib';
import { grapher } from './grapher';
import { getPulseGroup, getPulseGroupURL, CONFIG, AugmentedPulseGroup, MintEntry, PulseEntry, PulseGroup } from './pulsegroup';
import { myPulseGroups, addPulseGroup } from './pulsegroups';


logger.setLevel(LogLevel.WARNING);
//const MAXNODES=25;   //MAX NODES PER PULSEGROUP - reject after this popiulation size
// Load config

const config=CONFIG;  //map to global constants from inital pulseGroup CONFIG creation

// Construct my own pulseGroup for others to connect to
const me = new MintEntry(1, config.GEO, config.PORT, config.IP, config.PUBLICKEY, config.VERSION, config.WALLET, config.BOOTTIMESTAMP);  //All nodes can count on 'me' always being present
const genesis = new MintEntry(1, config.GEO, config.PORT, config.IP, config.PUBLICKEY, config.VERSION, config.WALLET, config.BOOTTIMESTAMP);  //All nodes also start out ready to be a genesis node for others
var pulse = new PulseEntry(1, config.GEO, config.GEO+".1", config.IP, config.PORT, config.VERSION, config.BOOTTIMESTAMP);    //makePulseEntry(mint, geo, group, ipaddr, port, version) 
var myPulseGroup = new PulseGroup(me, genesis, pulse);  //this is where I allow others to connect to me
//var myPulseGroups: PulseGroups = {};  // TO ADD a PULSE: pulseGroup.pulses["newnode" + ":" + genesis.geo+".1"] = pulse;
//var myPulseGroups = getMyPulseGroups();
logger.info(`Starting with my own pulseGroup=${dump(myPulseGroup)}`);


// Start instrumentaton web server

const REFRESH = 60;  //Every 2 minutes force web page instrumentation refresh
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
            logger.error(`${err.name} caused rendering of index.html to fail: ${err.message}`);
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
    //console.log(`/version returning ${config.VERSION}`);
    res.end(JSON.stringify(config.VERSION));
    return;
 });
 
 app.get('/pause', function(req, res) {
    console.log(`PAUSING -- here we would set adminControl on the pulse group to SINGLESTEP`);
    return;
 });
 
 app.get('/invite/:groupname/:destip/:destport', function(req, res) {

    console.log(`INVITE -- This would be only valid over an encrypted path ${dump(req.params)}`);
    const configurl = "http://" + req.params.destip + ":" + req.params.destport + 
    "/nodefactory?geo=" + req.params.groupname +
    "&port=" + config.PORT +
    "&publickey=" + config.PUBLICKEY +
    "&genesisport=" + config.GENESISPORT +
    "&version=" + config.VERSION +
    "&wallet=" + config.WALLET +
    "&myip=" + config.IP +
    "&ts=" + now();
    
    console.log(`would execute nodeFactory on ${req.params.destip}:${req.params.destport} to join group ${req.params.groupname} ${configurl}`);
    getPulseGroupURL(configurl)
    return;
 });

 app.get('/stop', function(req, res) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    logger.info(`EXITTING and Stopping the node request from ${ip}`);
    Log("EXITTING and Stopping the node request from "+ip);
    console.log("#################################### STOP MESSAGE RECEIVED -  EXITTING and Stopping the node request from "+ip);
    console.log("#################################### STOP MESSAGE RECEIVED -  EXITTING and Stopping the node request from "+ip);
    console.log("#################################### STOP MESSAGE RECEIVED -  EXITTING and Stopping the node request from "+ip);
    console.log("#################################### STOP MESSAGE RECEIVED -  EXITTING and Stopping the node request from "+ip);
    console.log("#################################### STOP MESSAGE RECEIVED -  EXITTING and Stopping the node request from "+ip);
    console.log("#################################### STOP MESSAGE RECEIVED -  EXITTING and Stopping the node request from "+ip);
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
    console.log("#################################### REBOOT MESSAGE RECEIVED -  EXITTING docker requested from "+ip);
    console.log("#################################### REBOOT MESSAGE RECEIVED -  EXITTING docker requested from "+ip);
    console.log("#################################### REBOOT MESSAGE RECEIVED -  EXITTING docker requested from "+ip);
    console.log("#################################### REBOOT MESSAGE RECEIVED -  EXITTING docker requested from "+ip);
    console.log("#################################### REBOOT MESSAGE RECEIVED -  EXITTING docker requested from "+ip);
    console.log("#################################### REBOOT MESSAGE RECEIVED -  EXITTING docker requested from "+ip);

    var referer = req.get('Referer');
    if (referer !== undefined) {
        res.redirect(referer);
    } else {
        //TODO
    }
    process.exit(-1) 
 });
 


 app.get('/reload', function(req, res) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    logger.info(`EXITTING to reload the system request from: ${ip}`)
    Log("EXITTING to reload the system request from: "+ip)
    console.log("#################################### RELOAD SOFTWARE MESSAGE RECEIVED -  EXITTING docker requested from "+ip);
    console.log("#################################### RELOAD SOFTWARE MESSAGE RECEIVED -  EXITTING docker requested from "+ip);
    console.log("#################################### RELOAD SOFTWARE MESSAGE RECEIVED -  EXITTING docker requested from "+ip);
    console.log("#################################### RELOAD SOFTWARE MESSAGE RECEIVED -  EXITTING docker requested from "+ip);
    console.log("#################################### RELOAD SOFTWARE MESSAGE RECEIVED -  EXITTING docker requested from "+ip);

    var referer = req.get('Referer');
    if (referer !== undefined) {
        res.redirect(referer);
    } else {
        //TODO
    }
    //
    //  might be possible here to reload by running updateSW and not lose state
    //
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
    } else {
        logger.warning("No pulseGroup specified");
        res.end(JSON.stringify(myPulseGroups, null, 2));
        return;
    }
});

const fs = require('fs');
app.get(['/pulsegroups','/state'], function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");

    //console.log(`sending JSON stringify of pulseGroups object`);
    res.end(JSON.stringify(myPulseGroups,null,2)); 
    return;
    // cache 
    let filename="../"+me.ipaddr+"."+me.port+'.json';  //deliver cached JSON file instead of stringifying many times
    //console.log(`sending contents of ${filename}`);
    try {
        var fileContents = fs.readFileSync(filename);
        res.end(fileContents); //CRASH - catch 
    } catch (err) {
        // Here you get the error when the file was not found,
        // but you also get any other error
        res.end("INTERNAL ERROR - can't find pulseGroup object me=${me}"); //CRASH - catch 
    }

    return;
});

app.get('/me', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");

    res.end(JSON.stringify(myPulseGroups[me.geo+".1"], null, 2)); 
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


app.get('/mintTable', function(req, res) {
    logger.info("fetching '/mintTable' ");
    res.setHeader('Content-Type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    try {
        res.end(JSON.stringify(myPulseGroups[me.geo+".1"].mintTable, null, 2)); 
    } catch(e) {};
    return;
});

function findPublicKey(incomingKey:string) {
const myMintTable=myPulseGroups[me.geo+".1"].mintTable;

    for (var m in myMintTable) {
        if (myMintTable[m]!=null && myMintTable[m].publickey==incomingKey)
            return myMintTable[m];
    }
    return null;
}
//
//  only return if you have it
//
app.get(['/publickey','/publickey/:publickey'], function(req, res) {
    console.log("fetching '/publickey' searching for "+ req.params.publickey );
    if (typeof req.params.publickey == "undefined" || req.params.publickey=="" || req.params.publickey == null) {
        console.log(`NULL key searched - sending all mintTable`);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.send(JSON.stringify(myPulseGroups[me.geo+".1"].mintTable,null,2));
    } else {
        console.log(`looking up public key ${req.params.publickey} in this nmintTable`);
        var G=findPublicKey(req.params.publickey);
        if (G==null) {
             console.log(`/publickey - could not find publickey ${req.params.publickey}`);
            return;  //do nothing -- silently fail
        }
        //All is well - send the key object they can use to connect directly or to its genesis node.
        res.setHeader('Content-Type', 'application/json');
        res.setHeader("Access-Control-Allow-Origin", "*");
        try {

            console.log(`we found public key - option A) return the genesis node that has this public key `);
            var returnedObject = { 
                publickey:G.publickey,
                genesisIP:myPulseGroups[me.geo+".1"].mintTable[1].ipaddr, 
                genesisPort:myPulseGroups[me.geo+".1"].mintTable[1].port, 
                destIP:G.ipaddr, 
                destPort:G.port
            }
            console.log(`returnedObject=${JSON.stringify(returnedObject,null,2)}`);
            res.end(JSON.stringify(returnedObject)); // IPADDR : PORT of my genesis node 
        } catch(e) {};
        return;
    }
});

// nodeFactory - the engine of the system - Genesis node we clone ourselves and set self to the new guy
// this way the new guy starts wth our collective (genesis) understanding of counters)
// we also sync counters this with genesis certain times as a hack or defensive measure
// Configuration for node - allocate a mint
app.get('/nodefactory', function(req, res) {
    // additional nodes adding to pulseGroup

    logger.info(`EXPRESS /nodefactory: config requested with params: ${dump(req.query)}`);

    // parse incoming parameters
    
    var incomingGeo = String(req.query.geo);
    var publickey = String(req.query.publickey);
    var port = Number(req.query.port) || 65013;
    var wallet = String(req.query.wallet) || "";
    var incomingTimestamp = Number(req.query.ts) || 0;
    
    var incomingBootTimestamp=incomingTimestamp;

    if (typeof incomingTimestamp == "undefined") {
        logger.warning("/nodeFactory called with no timestamp");
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            "rc": "-1 /nodeFactory called with no timestamp."
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
        return logger.error(`incomingIP unavailable from geo=${incomingGeo} incomingIP=${incomingIP} clientIncomingIP=${clientIncomingIP}`);
    logger.info(`incomingIP=${incomingIP} clientIncomingIP=${clientIncomingIP} req.myip=${req.query.myip}`);



    var version = String(req.query.version);   ///why do we look at client version param?

    version=MYVERSION(); 
    version=config.VERSION;




    // handle Genesis node case - first to start up
    if (incomingIP == me.ipaddr && (port==config.GENESISPORT)) {  // Genesis node instantiating itself - don't need to add anything
        console.log(`I AM GENESIS NODE incomingIP=${incomingIP} port=${port} GENESIS=${config.GENESIS} GENESISPORT=${config.GENESISPORT} me=`+dump(me));
        
        //Log(ts()+` NEW NODEFACTORY Created GENESIS NODE ${myPulseGroup.groupOwner} : ${myPulseGroup.groupName} ${JSON.stringify(myPulseGroup)}`);
        Log(`NEW NODEFACTORY Created GENESIS NODE   ${myPulseGroup.mintTable[0].geo} : ${myPulseGroup.groupName} ${myPulseGroup.mintTable[0].ipaddr}:${myPulseGroup.mintTable[0].port}`);
        console.log(`NEW NODEFACTORY Created GENESIS NODE   ${myPulseGroup.mintTable[0].geo} : ${myPulseGroup.groupName} ${myPulseGroup.mintTable[0].ipaddr}:${myPulseGroup.mintTable[0].port}`);
        myPulseGroup.nodeCount=Object.keys(myPulseGroup.pulses).length;
        myPulseGroup.rc="SELF"
        //myPulseGroups[ config.GEO + ":" + config.GEO + ".1" ]=myPulseGroup



        //myPulseGroups[ config.GEO + ".1" ]=myPulseGroup
        //@wbnwbnwbn - replace with this
        //addPulseGroup(myPulseGroup);    



        logger.info("...........................GENESIS NODE CONFIGURED : ${JSON.stringify(myPulseGroups[ config.GEO + '.1' ],null,2)}");
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(myPulseGroup)); 
        
        return;
    }

    //  Or - Handle pulseGroup member case
    logger.info("........................ SETTING UP NON-GENESIS PULSE NODE ...................");
    console.log(ts()+`........................ SETTING UP NON-GENESIS PULSE NODE for ${incomingGeo} to connect to my ${config.GEO}.1 pulseGroup ...................`);





    if ( Object.keys(myPulseGroup.pulses).length >= config.MAXNODES) {
        console.log(ts()+`EXCEEDED MAX NODES (${myPulseGroup.nodeCount}>${config.MAXNODES})IN PULSE GROUP - IGNORING REQUEST from ${incomingGeo} ${incomingIP} ${clientIncomingIP} ${req.query.myip}`);
        Log(ts()+`EXCEEDED MAX NODES (${myPulseGroup.nodeCount}>${config.MAXNODES})IN PULSE GROUP - IGNORING REQUEST from ${incomingGeo} ${incomingIP} ${clientIncomingIP} ${req.query.myip}`);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(null)); 
        return;
    }

    // First, remove previous instances from this IP:port - one IP:port per pulseGroup-we accept the last
    // TODO - this next block should probably use the deleteNode code instead.
    for (var mint in myPulseGroup.mintTable) {
        if (mint=="0" || mint=="1") { 
            // ignore mintTable[0] and minttable[1] - never delete these
            //logger.debug(`looking at mint=${dump(myPulseGroup.mintTable[mint])}`);
        } else {
            if ((myPulseGroup.mintTable[mint] != null) && myPulseGroup.mintTable[mint].ipaddr == incomingIP && myPulseGroup.mintTable[mint].port == port) {
                // make sure not do delete me or genesis node
               console.log(`deleting previous mint for this node: ${incomingIP}:${port} mint #${mint} geo=${myPulseGroup.mintTable[mint].geo}`);
               myPulseGroup.mintTable.splice(parseInt(mint));
                                                        //Do we want to set this mint Table entry to null to void its reuse or shifting of mint entries??
            }
        }
    }

    // Add pulseGroup mintEntry and pulseEntry and Clone ourselves as the new pulsegroup CLONE CLONE CLONE
    var newMint = myPulseGroup.nextMint++;
    console.log(`${incomingGeo}: mint=${newMint} publickey=${publickey} version=${version} wallet=${wallet}`);
    myPulseGroup.pulses[incomingGeo + ":" + myPulseGroup.groupName] = new PulseEntry(newMint, incomingGeo, myPulseGroup.groupName, String(incomingIP), port, config.VERSION, incomingBootTimestamp);
    logger.debug(`Added pulse: ${incomingGeo}:${myPulseGroup.groupName}=${dump(myPulseGroup.pulses[incomingGeo + ":" + myPulseGroup.groupName])}`);
    console.log(`Added pulse: ${incomingGeo}:${myPulseGroup.groupName}=${dump(myPulseGroup.pulses[incomingGeo + ":" + myPulseGroup.groupName])}`);

    // mintTable - first mintTable[0] is always me and [1] is always genesis node for this pulsegroup
    var newNode = new MintEntry(newMint, incomingGeo, port, String(incomingIP), publickey, version, wallet, incomingBootTimestamp);
    myPulseGroup.mintTable[newMint] = newNode;  // we already have a mintTable[0] and a mintTable[1] - add new guy to end mof my genesis mintTable
    
    logger.info(`Added mint# ${newMint} = ${newNode.geo}:${newNode.ipaddr}:${newNode.port}:${newMint} to ${myPulseGroup.groupName}`);
    //console.log(`After adding node, pulseGroup=${dump(myPulseGroup)}`);
    myPulseGroup.nodeCount=Object.keys(myPulseGroup.pulses).length;

    //myPulseGroups[ myPulseGroup.groupName ] = myPulseGroup;  //
    addPulseGroup(myPulseGroup);   //@wbnwbnwbn Add new pulseGroup as an Augmented Pulse Group Object

    console.log(`********* = = = = = = = = =     myPulseGroups = ${JSON.stringify(myPulseGroups,null,2)}`); 
    

    //--------------------------------------------------------------------------
    // make a copy of the pulseGroup for the new node and set its passed-in startup variables
    let newNodePulseGroup = JSON.parse(JSON.stringify(myPulseGroup));  // CLONE my pulseGroup object 
    newNodePulseGroup.mintTable[0]=newNode;  // assign him his mint and config

    //
    //  Trim from the clone of the genesis Node  @bn=wbnwbnwbnwbnwbnwbnwbn  NEW CODE
    //

    // Here clear the clone's history and median history for each pulse @wbnwbnwbn
    //              clear the pulseTimestamps to 0 as they are in the genesis node's clock anyway 
    //Also clear the mintTable lastOWL and PulseTimestamps
    for (var m in newNodePulseGroup.pulses) {
        newNodePulseGroup.pulses[m].history=newNodePulseGroup.pulses[m].medianHistory=[];
        newNodePulseGroup.pulses[m].owl=99999;  //no measures
        newNodePulseGroup.pulses[m].inPulses=newNodePulseGroup.pulses[m].outPulses=newNodePulseGroup.pulses[m].relayCount=newNodePulseGroup.pulses[m].pktDrops=0;
        newNodePulseGroup.pulses[m].pulseTimestamp=0;
        newNodePulseGroup.pulses[m].lastMsg="";
        newNodePulseGroup.pulses[m].state="QUARANTINE";  //   ???   mark UP when we receive a pulse from this node?
        newNodePulseGroup.pulses[m].owls="1";  //   ???   mark UP when we receive a pulse?
    }
    newNodePulseGroup.rc="child of " + me.geo + "(" + me.ipaddr + ":" + me.port + ")"
    Log(`NEW NODEFACTORY Created Member NODE   ${newNodePulseGroup.mintTable[0].geo} : ${newNodePulseGroup.groupName} ${newNodePulseGroup.mintTable[0].ipaddr}:${newNodePulseGroup.mintTable[0].port}`);
    console.log(`NEW NODEFACTORY Created Member NODE   ${newNodePulseGroup.mintTable[0].geo} : ${newNodePulseGroup.groupName} ${newNodePulseGroup.mintTable[0].ipaddr}:${newNodePulseGroup.mintTable[0].port}`);
    logger.info("* Genesis node created newNodePulseGroup="+dump(newNodePulseGroup));
    //console.log("* Genesis node /nodefactory created newNodePulseGroup="+dump(newNodePulseGroup));

    // send response to pulse group member node
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(newNodePulseGroup));  // send mint:0 mint:1 *mint:N groupEntry *entryN
});


// Initiate the protocol  
//  this is where it all begins - here we start up our own group
// do this also for a group created for children
(async () => {
    try {
        var myOriginalPulseGroup=myPulseGroup
        myPulseGroup = await getPulseGroup(config);   //replaces starting myPulseGroup
        //var anchorPulseGroup = await getPulseGroup(config);   //t

        console.log(`asynch() DARP NODE STARTED: anchor GENESIS=${myPulseGroup.groupOwner} pulseGroup=${dump(myPulseGroup)}`);
        var augmentedPulseGroup = new AugmentedPulseGroup(myPulseGroup);   //augmented with pulseGroup methods

        //console.log(`augmentedPulseGroup=${JSON.stringify(augmentedPulseGroup,null,2)}`);
        
        augmentedPulseGroup.flashWireguard();  // create our wireguard files based on our mint Table
        augmentedPulseGroup.pulse();
        //augmentedPulseGroup.workerThread();  //start workerthread to asynchronously processes pulse messages
        setTimeout(augmentedPulseGroup.findEfficiencies,1000);  //find where better paths exist between intermediaries - wait a second 
        setTimeout(augmentedPulseGroup.checkSWversion, 10 * 1000);  // check that we have the best software
        setTimeout(augmentedPulseGroup.measurertt, 2 * 1000); // ping across wireguard every other second

        myPulseGroups[ myPulseGroup.groupName ] = augmentedPulseGroup;     //wire it in


        if (myPulseGroup.groupOwner  != me.geo ) {
            myPulseGroups[ me.geo+".1" ] = new AugmentedPulseGroup(myOriginalPulseGroup);           
            console.log(`index.ts:  WE LAUNCHED OUR OWN PULSE GROUP ${JSON.stringify(myPulseGroups[ me.geo+".1" ],null,2) }`);
        }

        //could clone this new pulseGroup as my own for accepting new connections

        console.log(`index.ts:    launching------>       myPulseGroups=${JSON.stringify(myPulseGroups,null,2)}`);
    } catch (error) {
        logger.error(error);
    }
})();

//
//  darp.bash substitutes in proper CODE and CONFIG for new node
//
app.get('/darp.bash', function(req, res) {
    logger.info("sending '/darp.bash' to new cadet ");
    res.setHeader('Content-Type', 'text/javascript');
    res.setHeader("Access-Control-Allow-Origin", "*");
    fs.readFile('darp.bash', function(err:string, data:string){
        if (err) console.log(`darp.bash file unavailable`);//console.log(`sending data ${data}`);
        else {
            console.log(`retrieving darp.bash config.GENESIS=${config.GENESIS}`);
            //console.log(`data=${data}`);
            var str=data.toString();

            //here we can take options for initial set up - ?mode=auto

            //option 1 -  use my GENESIS node so private wireguard can be used right away.
            //str=str.replace(/MYGENESISIP/gi, config.GENESIS );

            //option 1a - conditionally configure node connected to my GENESIS . Send darp.bash iff (condition goes here) 

            //option 2 - connect to the ndoe that responds first.
            //          get code from any genesis node on genesislist, but we will use first
            var genesislist=process.env.GENESISNODELIST||"";
            var genesisNodes=genesislist.split(",");

            
            //str=str.replace(/MYGENESISIP/gi, genesisNodes[0] );
            str=str.replace(/MYGENESISIP/gi, "auto" );
            str=str.replace(/DOCKERTAG/gi, config.VERSION.split(":")[0] );
            str=str.replace(/GITTAG/gi, config.VERSION.split(":")[1] );
            //console.log(`genesisNodes[0]=${genesisNodes[0]}   <--- Here I plug in the First Genesis node in list - `);

            //console.log("darp.bash="+str);
            res.send( str );
            //        res.send(data.toString().replace(/__MYGENESISIP__/, config.GENESIS) );
        }

    });
});