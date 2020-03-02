//
//  config.ts - initialize the redis database
//
//  me - my internal state and pointer to genesis
//
import { dump, now } from "../lib/lib";

const pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client

redisClient.flushall();

//
//  get the necessary genesis data to join the genesis group
//
var http = require('http');
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
                redisClient.hmset("me", {
                    "geo" : process.env.HOSTNAME||"noName",
                    "port" : process.env.PORT||"65013",
                    "ipaddr" : "",   //set by genesis node on connection
                    "publickey" : process.env.PUBLICKEY||"",
                    "mint": "",      //set by genesis node
                    "bootTime": now(),
                    "group": entry.group,
                    "genesis" : entry.ipaddr+":"+entry.port+":"+entry.publickey+":"+entry.geo+":"+entry.group+":",
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
                // get the genesis node
                redisClient.hgetall('me', function (err, me) {
                    if (err) {
                        console.log("CONFIG ERROR");
                    } else {
                        console.log('me='+dump(me));
                    } 
                    console.log("Either we are Genesis or we have Genesis configured");    
                    console.log("1) Fetch codenconfig from genesis to set my external ipaddr and port");    
                    console.log("Either we are Genesis or we have Genesis configured - fetch codenconfig to set the rest");    
                });
                return;
            }
        });
    });
    req.on('error', function (e) {
        console.log(e.message);
    });
}
setME();

console.log("config DONE");

