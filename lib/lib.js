//
//  lib.js - common routines in one place
//
const pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client

//
//  SRList() - callback with list of mints/owls for this node
//
function SRList(redisClient,callback) {  
    var mySRList=new Array(), myOwlList=new Array();

    redisClient.hgetall("gSRlist", function(err, gSRlist) {
      if (err) {
              console.log("SRlist(): hgetall gSRlist failed");
      } else {

        //console.log("iterating SRlist(): gSRlist="+dump(gSRlist));
        if (gSRlist) {
            for (i in gSRlist) {
                //console.log("i="+i+" gSRlist[i]="+gSRlist[i]);
                mySRList.push(i);
                myOwlList.push(gSRlist[i]);
            }
            ///console.log("************ Callback Time : "+dump(mySRList)+" -->"+dump(myOwlList));
            //console.log("************ Callback Time : "+mySRList.join(",")+" "+myOwlList.join(","));

            callback(null,mySRList.join(","),myOwlList.join(",")); //send back a CSV list of mints
        }
        //console.log("SRList(): mySRlist="+dump(mySRList));
      }
    });
}

function getMints(SR) {
    var mintList=SR.owls.replace(/=[0-9]*/g,'');
    return mintList;
}

function getOwls(SR) {
    return(SR.owls);
}

function oneTimePulse() {
    pulse();
}

//
//  mintList() - callback with list of mints/owls for this node
//
function mintList(redisClient,SR,callback) {
    //console.log("mintList() : SR="+SR);
    
    //fetch the group mints mint:2 : 2  mint:5 : 5   ....
    redisClient.hgetall(SR, function(err, SR) {
      //console.log("insideIterator");
        if (err) {
              console.log("mintList(): hgetall SR mints "+SR+" failed");
        } else {
          if (SR) {
            //console.log("mintList(): SR="+dump(SR));
            //callback(null,SR.owls.replace(/=[0-9]*,/g,','));
            var owlList=new Array();
            if (SR.owls && SR.owls != "" ) {
//                owlList=SR.owls.replace(/=-?[0-9]*/g,'').split(",").sort(); //could sort here
                owlList=SR.owls.replace(/=-?[0-9]*/g,'').split(",").sort().reverse(); //could sort here
            } 
            //console.log("mintList(): owlList="+owlList);
            callback(null,owlList); //send back a list of mints
          } else {
            console.log("lib.js: ERROR mintList() called with SR==null");
            process.exit(86);
          }
        }
    });
}

/**
 * The "median" is the "middle" value in the list of numbers.
 *
 * @param {Array} numbers An array of numbers.
 * @return {Number} The calculated median value from the specified numbers.
 */
function median(numbers) {
    // median of [3, 5, 4, 4, 1, 1, 2, 3] = 3
    var median = 0, numsLen = numbers.length;
    numbers.sort();
    if (numsLen % 2 === 0 // is even
    ) {
        // average of two middle numbers
        median = (numbers[numsLen / 2 - 1] + numbers[numsLen / 2]) / 2;
    }
    else { // is odd
        // middle number only
        median = numbers[(numsLen - 1) / 2];
    }
    return median;
}
//
//      now() - get milliseconds since 1970
//
function now() {
    var d = new Date();
    return d.getTime();
}
//
//      ts() - simple timeStamp
//
function ts() {
    return new Date().toLocaleTimeString() + " ";
}
//
//      makeYYMMDD() - make YYMMDD string for timestamping
//
function makeYYMMDD() {
    var YYMMDD = new Date().toISOString().substring(2, 10).replace(/-/g, '');
    return YYMMDD;
}
function dump(obj) {
    return JSON.stringify(obj, null, 2);
}
//
//      Log() - save a node away for later defrost, should we lose connection
//
function Log(logMsg, filename) {
    if (typeof filename == "undefined")
        filename = 'NOIA.log';
    var fs = require('fs');
    var d = new Date();
    var YYMMDD = makeYYMMDD();
    ;
    //var filename = filename+'.' + YYMMDD + '.log.txt';
    var filename = filename + '.log';
    logMsg = ts() + logMsg + '\n';
    fs.appendFile(filename, logMsg, function (err) {
        if (err)
            throw err;
        //console.log('Saved!');
    });
}
//
//      checkNoiaSWHash() - fetch software hash to see if we need to reload
//
//      might be better to download and compare fileszie of noia.js instead
//      Note - we do not watch changes in other noia files - noialib, noiaMsgTransport.js
//
function checkNoiaSWHash(URL) {
    if (typeof URL == "undefined") URL="drpeering.com";
    var http = require('http');
    var req = http.get("http://" + URL + "/noiaSR.js", function (res) {
        var data = '';
        res.on('data', function (stream) {
            data += stream;
        });
        res.on('end', function () {
            var noialen = data.length; //length of noia.js
            //console.log("me.noialen="+me.noialen+" noialen="+noialen);
            if (noialen != me.noialen) {
                var dateStamp = new Date();
                console.log(dateStamp + " Exitting do force reload\n\n\n\n\n\n\n\n\n\n");
                process.exit(36);
            }
        });
    });
    req.on('error', function (e) {
        console.log(e.message);
    });
}


/***
//
//  get the necessary genesis data to join the genesis group
//
var http = require('http');
function getGenesis() {
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
                return entry.ipaddr+":"+entry.port+":"+entry.publickey+":"+entry.geo+":"+entry.group+":";
            }
            console.log("no Answer"); //no answer - we have no genesis node IP
            return "";
        });
    });
    req.on('error', function (e) {
        console.log(e.message);
    });
}


function getCodeNconfig() {
    var req = http.get("http://"+me.genesis+"/codenconfig", function (res) {
        var data = '', json_data;
        res.on('data', function (stream) {
            data += stream;
        });
        res.on('end', function () {
            var json = JSON.parse(data);
            console.log("json="+JSON.stringify(json,null,2));
            for (var SR in json) {
                var entry = json[SR];
                //console.log("getGenesisIP(): returning "+entry.ipaddr);
                return entry.ipaddr; //+":"+entry.port;
                console.log("SR=" + SR + " entry=" + JSON.stringify(entry, null, 2));
                // will output a Javascript object
                //var NoiaSWHash=json
                //console.log("NoiaSWHash="+NoiaSWHash+" mySR.NoiaSWHash="+mySR.NoiaSWHash);
            }
            return null; //no answer - we have no genesis node IP
        });
    });
    req.on('error', function (e) {
        console.log(e.message);
    });
}


module.exports.me = {
    "geo" : process.env.GEO,
    "port" : 65013,
    "ipaddr" : "",   //set by genesis node on connection
    "publickey" : process.env.publickey,
     "mint": "",      //set by genesis node
    "bootTime": now(),
    "group": "",
     "pulseGroups" : "",  //list of groups I will pulse
     "genesis" : ""
 }
***/
/**
function list(req, res) {
    var return_dataset = [];
    const expressRedis = require('redis');
    var client = expressRedis.createClient(); //creates a new client
    client.keys('*', function(err, log_list) {
    
        var multi = client.multi();
        var keys = Object.keys(log_list);
        var i = 0;

        keys.forEach(function (l) {
            client.hget(log_list[l], "modified_at", function(e, o) {
                i++;
                if (e) {console.log(e)} else {
                    temp_data = {'key':log_list[l], 'modified_at':o};
                    return_dataset.push(temp_data);
                }

                if (i == keys.length) {
                    res.render('logger/list', {logs:return_dataset});
                }

            });
        });

    });
};
**/
function MYVERSION() {
    const fs = require('fs');

    var darpdir=process.env.DARPDIR;
    darpdir="../"

    //console.log(ts()+"darpdir="+darpdir);
    var files = fs.readdirSync(darpdir).filter(fn => fn.startsWith('Build.'));
    //console.log(ts()+"MYVERSION="+files);
    return files;
}

function MYIP() {
    const http = require('http');

    var options = {
    host: 'ipv4bot.whatismyipaddress.com',
    port: 80,
    path: '/'
    };

    http.get(options, function(res) {
    console.log("status: " + res.statusCode);

    res.on("data", function(chunk) {
        console.log("SETTING MYIP to: " + chunk);
        process.env.MYIP=""+chunk;

    });
    }).on('error', function(e) {
    console.log("error: " + e.message);
    });
}

module.exports = { now: now, ts: ts, dump: dump, Log: Log, checkNoiaSWHash: checkNoiaSWHash, mintList: mintList, SRList:SRList, getMints, getOwls, makeYYMMDD, oneTimePulse, MYIP, MYVERSION  };
