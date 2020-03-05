//
//  config.ts - initialize the redis database
//
//  me - my internal state and pointer to genesis
//
import { dump, now } from "../lib/lib";

var http = require('http');

const pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client

redisClient.flushall();

/*
for (var i=0; i< process.argv.length; i++) {
    console.log("argv["+i+"]="+process.argv[i]);
}
*/
if (process.argv.length>4)
    var WALLET=process.argv[4];
if (process.argv.length>3)
    var GEO=process.argv[3];
if (process.argv.length>2)
    var PUBLICKEY=process.argv[2];
//console.log("env="+JSON.stringify(process.env,null,2));
var GEO=GEO||process.env.HOSTNAME||"DEVOPS";
var PORT=process.env.PORT||"65013";
var PUBLICKEY=PUBLICKEY||process.env.PUBLICKEY || "";
var WALLET=WALLET||process.env.WALLET || "584e560b06717ae0d76b8067d68a2ffd34d7a390f2b2888f83bc9d15462c04b2";

//GEO=GEO.toString().split('.').split(',');

console.log("CONFIG starting with GEO="+GEO+" publickey="+PUBLICKEY+" WALLET="+WALLET+"");

if (PUBLICKEY=="") Usage();

setME();

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
                            console.log("genesis told us :"+JSON.stringify(json,null,2));
                            redisClient.hmset("me", json);
                            
                            return null; //no answer - we have no genesis node IP
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