//
//  config.ts - initialize the redis database
//
//  me - my internal state and pointer to genesis
//
import { dump, now } from "../lib/lib";
var http = require('http');

/*
export var gME={    //A cache for convenience so I don't need to 
                    //look to redis for things that don't change
    "geo" : "",     //name or geolocation
    "port" : "",    //external facing port in public Internet
    "ipaddr" : "",   //set by genesis node on connection
    "publickey" : "", //expected input generated from wireguard
    "mint" : "",      //set by genesis node
    "bootTime" : "",   //boot time is when joined the group
    "group": "",       //my group should I create a new one
    "pulseGroups" : "",  //list of groups I will pulse
    "wallet" : "",      //NOIA wallet for authentication/verification
    //genesis connection info
    "genesisIP" : "",   //the one thing we must know
    "genesisPort" : "", //could default to 65013
    "genesisPublickey" : "" //shared with us during config
};
*/

const pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client

redisClient.flushall();


//console.log("env="+JSON.stringify(process.env,null,2));
var GEO=process.env.HOSTNAME||"DEVOPS";
var PORT=process.env.PORT||"65013";
var PUBLICKEY=process.env.PUBLICKEY || "";
var WALLET=process.env.WALLET || "584e560b06717ae0d76b8067d68a2ffd34d7a390f2b2888f83bc9d15462c04b2";

//GEO=GEO.toString().split('.').split(',');

console.log("CONFIG starting with GEO="+GEO+" publickey="+PUBLICKEY+" PORT="+PORT+" WALLET="+WALLET+"");

redisClient.hmset("me", {
    "geo" : GEO,
    "port" : PORT,
    "publickey" : PUBLICKEY,
    "bootTime" : ""+now(),   //boot time is when joined the group
    //genesis connection info
    "genesisIP" : "104.42.192.234",
    "genesisPort" : "65013",
    "wallet" : WALLET
});

redisClient.hmset("genesis",{
    "port" : "65013",               //default
    "ipaddr" : "104.42.192.234"   //set by genesis node on connection
 });

//if (PUBLICKEY=="") Usage();

setMeIP();  //later this should start with just an IP of genesis node 

function setMeIP() {

    redisClient.hgetall("genesis", function (err,genesis) {
        console.log("setMeIP(): genesis="+dump(genesis));
        var URL="http://"+genesis.ipaddr+":"+genesis.port+"/config?geo="+GEO+"&port="+PORT+"&publickey="+PUBLICKEY+"&wallet="+WALLET;
        console.log("Fetching URL for config: "+URL);
        //FETCH CONFIG
        var req = http.get(URL, function (res) {
            var data = '', json_data;
            res.on('data', function (stream) {
                data += stream;
            });
            res.on('end', function () {
                console.log("CONFIG data="+data);
                var json = JSON.parse(data);
                //gME=json;  //set my global variable  for convenuience
                console.log("CONFIG setMeIP(): setting redis && gME with what genesis told us we are:"+JSON.stringify(json,null,2));
                var me=JSON.parse(json);
                redisClient.hmset("me", me);
                console.log("CONFIG setMeIP(): setting redis && gME with what genesis told us we are:"+JSON.stringify(json,null,2));

                redisClient.hmset("me", {
                    "geo" : ""+me.geo,
                    "port" : ""+me.port,
                    "ipaddr" : ""+me.ipaddr,   //set by genesis node on connection
                    "publickey" : ""+me.publickey,
                    "mint" : ""+me.mint,      //set by genesis node
                    "bootTime" : ""+me.bootTime,   //boot time is when joined the group
                    "group": ""+me.group,
                    "pulseGroups" : ""+me.pulseGroups,  //list of groups I will pulse
                    //genesis connection info
                    "genesisIP" : ""+me.genesisIP,
                    "genesisPort" : ""+me.genesisPort,
                    "genesisPublickey" : ""+me.genesisPublickey,
                    //statistics
                    "lastSeq": "0",
                    "pulseTimestamp": "0",
                    "inOctets": "0",
                    "outOctets": "0",
                    "inMsgs": "0",
                    "outMsgs": "0",
                    "owl": "0",
                    "pktDrops": "0",
                    "remoteState": "0"
    
                });  //my assigned identify
            });
        });
    });
}

//
//  get the genesis node and request config from it
//
function setME() {
    var req = http.get("http://drpeering.com/seglist1.json", function (res) {
        var data = '', json_data;
        res.on('data', function (stream) {
            data += stream;
        });
        res.on('end', function () {
            var json = JSON.parse(data);
            //console.log("getGenesisIP(): json="+JSON.stringify(json,null,2));
            for (var SR in json) {
                var entry = json[SR];
//                var HOST=process.env.HOSTNAME||"noName";
//                var PORT=process.env.PORT||"65013";
//                var PUBLICKEY=process.env.PUBLICKEY||"";
//                var GENESIS=entry.ipaddr+":"+entry.port+":"+entry.publickey+":"+entry.geo+":"+entry.geo+'.1'+":";
                //create my "me" record
                /*** 
                redisClient.hmset("me", {
                    "geo" : GEO,
                    "port" : PORT,
                    "ipaddr" : "",   //set by genesis node on connection
                    "publickey" : PUBLICKEY,
                    "mint": "",      //set by genesis node
                    "bootTime": "0",
                    "group": entry.group,
                    "pulseGroups" : entry.group,  //list of groups I will pulse
                    //my genesis
                    "genesisIP" : entry.ipaddr,
                    "genesisPort" : entry.port,
                    "genesisPublickey" : entry.publickey,
                    //statistics
                    "lastSeq": "0",
                    "pulseTimestamp": "0",
                    "inOctets": "0",
                    "outOctets": "0",
                    "inMsgs": "0",
                    "outMsgs": "0",
                    "owl": "0",
                    "pktDrops": "0",
                    "remoteState": "0"
                }); 
                ****/

                redisClient.hmset("genesis", {
                    "geo" : entry.geo,
                    "port" : entry.port,
                    "ipaddr" : entry.ipaddr,   
                    "publickey" : entry.publickey,
                    "mint": entry.mint,
                    "bootTime": entry.bootTime,
                    "group": entry.group,
                    "pulseGroups": entry.group,   //pulse owner:group mints
                    //
                    "genesisIP" : entry.ipaddr,
                    "genesisPort" : entry.port,
                    "genesisPublickey" : entry.publickey,
                    //
                    "lastSeq" : entry.lastSeq,
                    "pulseTimestamp": entry.pulseTimestamp,
                    "inOctets": entry.inOctets,
                    "outOctets": entry.outOctets,
                    "inMsgs": entry.inMsgs,
                    "outMsgs": entry.outMsgs,
                    "owl": entry.owl,
                    "pktDrops": entry.pktDrops,
                    "remoteState": entry.remoteState
                }); 
                
                // get my config from the genesis node
                var req = http.get("http://"+entry.ipaddr+":"+entry.port+"/config?geo="+GEO+"&port="+PORT+"&publickey="+PUBLICKEY, function (res) {
                        var data = '', json_data;
                        res.on('data', function (stream) {
                            data += stream;
                        });
                        res.on('end', function () {
                            var json = JSON.parse(data);
                            //gME=json;  //set my global variable  for convenuience
                            console.log("setting redis && gME with what genesis told us we are:"+JSON.stringify(json,null,2));
                            redisClient.hmset("me", json);  //my assigned identify
                                                        //and starting pulseGroup
                            // if 
                            
                            return null; //done
                        });
                });
                req.on('error', function (e) {
                        console.log(e.message);
                });
                return;
            }
        });
    });
    req.on('error', function (e) {
        console.log(e.message);
    });
}


function Usage() {
    console.log("usage: node config publickey [geo]");
    process.exit( 127 );
}

//module.exports = { me }