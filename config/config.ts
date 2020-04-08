//
//  config.ts - initialize the redis database with envirnmental variables:
//          HOSTNAME - human readable text name
//          GENESIS - IPaddr or ipaddr:port
//          PUBLICKEY - Public key 
//

//if (! process.env.HOSTNAME || ! process.env.GENESIS || ! process.env.PUBLICKEY) {
if (! process.env.HOSTNAME  ) {
    console.log("No HOSTNAME enviropnmental variable specified ");
    process.env.HOSTNAME=require('os').hostname();
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
    process.env.VERSION="noVersion"
}
if (! process.env.MYIP) {
    console.log("No MYIP enviropnmental variable specified ");
    process.env.MYIP="noMYIP"
}

//  me - my internal state and pointer to genesis
//
import { dump, now } from "../lib/lib";
import { setWireguard } from "../wireguard/wireguard";
//import { getUnpackedSettings } from "http2";
//import { Z_VERSION_ERROR } from "zlib";
var http = require('http');

const pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client
redisClient.flushall();    //clean slate

//console.log("env="+JSON.stringify(process.env,null,2));
var GEO=process.env.HOSTNAME;   //passed into docker
GEO=GEO.toUpperCase().split(".")[0].split(":")[0].split(",")[0].split("+")[0];
var PORT=process.env.PORT||"65013";         //passed into docker
var PUBLICKEY=process.env.PUBLICKEY;
if (!PUBLICKEY)
try {
    PUBLICKEY=require('fs').readFileSync('../wireguard/publickey', 'utf8');
    PUBLICKEY=PUBLICKEY.replace(/^\n|\n$/g, '');
    console.log("pulled PUBLICKEY from publickey file: >"+PUBLICKEY+"<");
} catch (err) {
    console.log("PUBLICKEY lookup failed");
    PUBLICKEY="deadbeef00deadbeef00deadbeef0012";
}

var WALLET=process.env.WALLET || "584e560b06717ae0d76b8067d68a2ffd34d7a390f2b2888f83bc9d15462c04b2";

//GEO=GEO.toString().split('.').split(',');

console.log("CONFIG GENESIS="+process.env.GENESIS+" PORT="+process.env.PORT+" HOSTNAME="+process.env.HOSTNAME+" VERSION="+process.env.VERSION+" MYIP="+process.env.MYIP);
console.log("CONFIG starting with GEO="+GEO+" publickey="+PUBLICKEY+" PORT="+PORT+" WALLET="+WALLET+"");

//  mint:0 is me  and  mint:1 is Genesis node 
redisClient.hmset("mint:0",{
    "mint" : "0",      //set by genesis node
    "geo" : GEO,
    "group": GEO+".1",      //add all nodes to genesis group
    // wireguard configuration details
    "port" : ""+PORT,
    "ipaddr" : process.env.MYIP,   //set by genesis node on connection
    "publickey" : PUBLICKEY,
    //
    "bootTime" : ""+now(),   //So we can detect reboots
    "version" : process.env.VERSION,  //software version
    "wallet" : WALLET,
    "owl": ""   //how long it took this node's last record to reach me
 });

getConfiguration();  //later this should start with just an IP of genesis node 

function getConfiguration() {
    var URL="http://"+process.env.GENESIS+":"+"65013"+"/nodefactory?geo="+GEO+"&port="+PORT+"&publickey="+PUBLICKEY+"&version="+process.env.VERSION+"&wallet="+WALLET+"&myip="+process.env.MYIP+"&ts="+now();
    console.log("CONFIG: getConfiguration()  Fetching URL for config: "+URL);
    //FETCH CONFIG
    var req = http.get(URL, function (res) {
        var data = '', json_data;
        res.on('data', function (stream) {
            data += stream;
        });
        res.on('end', function () {
            //console.log("CONFIG data="+data);
            var config = JSON.parse(data);
            //gME=json;  //set my global variable  for convenience
            console.log("CONFIG from node factory:"+JSON.stringify(config,null,2));

            if ( config.node == "GENESIS") {
                console.log(" GENESIS NODE Instantiated itself");
                redisClient.hset( "mint:0" , "state", "RUNNING" );
            } else {
                console.log(" -----------------------------------------NON-Genesis configuration");
                console.log("CONFIG(): json="+dump(config));


/*
                console.log("setting mint0 to json.mint0="+dump(json.mint0));
                redisClient.hmset("mint:0",json.mint0);
                
                console.log("setting mint1 to json.mint1="+dump(json.mint1));
                redisClient.hmset("mint:1",json.mint1);

                console.log("setting mint:"+json.newNodeMint.mint+" to json.newNodeMint="+json.newNodeMint);
                redisClient.hmset("mint:"+json.newNodeMint.mint,json.newNodeMint);

                var groupEntry=json.genesisGroupEntry.geo+":"+json.genesisGroupEntry.group;
                console.log("setting group entry genesisGroupEntry="+dump(json.genesisGroupEntry));
                redisClient.hmset( groupEntry , json.genesisGroupEntry );

                var nodeEntry=json.mint0.geo+":"+json.genesisGroupEntry.group;
                console.log("setting node entry nodeEntry="+nodeEntry+" entry="+dump(json.newSegmentEntry));
                redisClient.hmset( nodeEntry , json.newSegmentEntry );
*/
                console.log("setting gSRlist="+dump(config.gSRlist));
                redisClient.hmset("gSRlist", config.gSRlist );

                for (var mint in config.mintTable) {
                    var mintEntry=config.mintTable[mint];
                    console.log("add mint:"+mint+" mintEntry="+dump(mintEntry));
                }

                for (var pulse in config.pulses) {
                    var pulseEntry=config.pulses[pulse];
                    console.log("add pulse:"+pulse+" pulseEntry="+dump(pulseEntry));
                }

                //    console.log("genesis done "+json.newSegmentEntry.geo+  ":"+json.newSegmentEntry.group ,   json.newSegmentEntry );
                //    redisClient.hmset( json.newSegmentEntry.geo+  ":"+json.newSegmentEntry.group ,   json.newSegmentEntry );    

                console.log("newSegment done");
            }
        });
    });
}

function Usage() {
    console.log("usage: node config publickey [geo]");
    process.exit( 127 );
}
