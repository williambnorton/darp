"use strict";
exports.__esModule = true;
//
//  wireguard.ts - configure wireguard conf file in wireguard as darp.pending.conf
//
var lib_1 = require("../lib/lib");
var pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client
function getPublicKey() {
    return require('fs').readFileSync(process.env.DARPDIR + '/etc/wireguard/publickey', 'utf8');
}
exports.getPublicKey = getPublicKey;
function wgdump() {
    var wgconfig = "";
    try {
        wgconfig = require('fs').readFileSync(process.env.DARPDIR + '/etc/wireguard/wg0.conf', 'utf8');
    }
    catch (err) {
        console.log("wireguard: dumpWGconf() ERROR");
    }
    console.log("wgconfig=:" + wgconfig);
}
function setWireguard() {
    //we assume these file were set by configWG
    console.log("setWireguard(): saving mint entry as stanza for each wg connection.");
    var BASECONFIG = "";
    try {
        BASECONFIG = require('fs').readFileSync(process.env.DARPDIR + '/etc/wireguard/wg0.conf', 'utf8');
    }
    catch (err) {
        BASECONFIG = "deadbeef00deadbeef00deadbeef0012";
    }
    //# Created by ./configWG.bash Fri Mar 6 20:46:57 UTC 2020
    //[Interface]
    //PrivateKey = CPEQ3Q4tv6MXHhbQEyfw3VdJP5QzBihe4B41ocAm9UE=
    var PUBLICKEY;
    try {
        PUBLICKEY = require('fs').readFileSync(process.env.DARPDIR + '/etc/wireguard/publickey', 'utf8');
    }
    catch (err) {
        PUBLICKEY = "deadbeef00deadbeef00deadbeef0012";
    }
    /*****
    var cursor = '0';     // DEVOPS:* returns all of my pulseGroups
    redisClient.scan(cursor, 'MATCH', "mint:*", 'COUNT', '1000', function(err, reply ){
      if (err){
          throw err;
      }
      //console.log("pulser(): myPulseGroups="+dump(pulseGroups));

      cursor = reply[0];
      if (cursor === '0'){
          // reply[1] is an array of matched keys: me.geo:*
          var mintTable=reply[1]; //[0] is the cursor returned
          //console.log( "We need to pulse each of these SRs="+SRs);
            var config="";   //our config
          for (var i in mintTable) {
              var mintEntry=mintTable[i];
              console.log("wireguard - setting stanza for mintEntry=:"+dump(mintEntry));

              //redisClient.hgetall("mint:"+mint, function (err,mintEntry) {
                console.log("Writing stanza for mint="+mintEntry.geo);
                    console.log("mintTableEntry ="+JSON.stringify(mintEntry,null,2));
                    config+="/n[Peer]/n";
                    config+="PublicKey = "+mintEntry.publickey+"/n";
                    config+="AllowedIPs = 10.10.0."+mintEntry.mint+"/n";
                    config+="Endpoint = "+mintEntry.ipaddr;
                    config+="PersistentKeepalive = 25"+"/n";
                    console.log("config=:"+config);
               // if (mintEntry.geo+":"+mintEntry.group==lastPulse) {
                 //   console.log("Got to last pulse - now writeout the config file:"+config);
                //}
                //});

          }
        } else {
            console.log("wireguard: scan returned non-zero cursor:");
            process.exit(86);
        }
    });
***/
    //for each group in me.pulseGroups
    console.log("Setting up wireguard files ");
    redisClient.hgetall("gSRlist", function (err, gSRlist) {
        redisClient.hgetall("mint:0", function (err, me) {
            redisClient.hgetall("mint:1", function (err, genesis) {
                var lastPulse = "", config = "";
                for (var entryLabel in gSRlist)
                    lastPulse = entryLabel;
                for (var entryLabel in gSRlist) {
                    var mint = gSRlist[entryLabel];
                    console.log(lib_1.ts() + "spewing out wireguard config file into ~/darp/etc/wireguard");
                    redisClient.hgetall("mint:" + mint, function (err, mintEntry) {
                        console.log("Writing stanza for mint=" + mintEntry.geo);
                        console.log("mintTableEntry =" + JSON.stringify(mintEntry, null, 2));
                        config += "\n[Peer]\n";
                        config += "PublicKey = " + mintEntry.publickey + "\n";
                        config += "AllowedIPs = 10.10.0." + mintEntry.mint + "\n";
                        config += "Endpoint = " + mintEntry.ipaddr + "\n";
                        config += "PersistentKeepalive = 25" + "\n";
                        console.log("config=" + config);
                        console.log("wireguard(): mintEntry.geo: ");
                        if (mintEntry.geo + ":" + mintEntry.group == lastPulse) {
                            console.log("Got to last pulse - now writeout the config file:" + config);
                            console.log("SHOULD WRITE :" + BASECONFIG + "\n" + config);
                            var fs = require('fs');
                            fs.writeFile(process.env.DARPDIR + '/etc/wireguard/wg0.conf', BASECONFIG + "\n" + config, function (err) {
                                // throws an error, you could also catch it here
                                if (err)
                                    throw err;
                                console.log("wireguaerd: about to dump wgConfig file::");
                                wgdump();
                            });
                        }
                    });
                }
            });
        });
    });
}
exports.setWireguard = setWireguard;
/*

    console.log("pulseGroups="+pulseGroups);
    var config="";  // we will add this to the base wireguard config
    var ary=pulseGroups.split(" ");
    for (var i=0; i< ary.length; i++) {
        var group=ary[i];
        //  for each mint in group.mints
        console.log("getting mints for group="+group);
        redisClient.lrange(group+".mints",0,-1, function (err,mints) {
        console.log("found mints="+mints);
            //if (mintAry!=null) {
                console.log("mints="+JSON.stringify(mints,null,2));
                //var mintAry=mints.split(",");
                for (var j=0; j<mints.length; j++) {
                    var mint=mints[j];
                    // find mint:publickey:ipaddr:port for wireguard stanze
                    console.log("Writing stanza for mint="+mint);
                    redisClient.hgetall("mint:"+mint, function (err,mintTableEntry) {
                        console.log("mintTableEntry ="+JSON.stringify(mintTableEntry,null,2));
                        config+="/n[Peer]/n";
                        config+="PublicKey = "+mintTableEntry.publickey+"/n";
                        config+="AllowedIPs = 10.10.0."+mintTableEntry.mint+"/n";
                        config+="Endpoint = "+mintTableEntry.ipaddr;
                        config+="PersistentKeepalive = 25"+"/n";
/***
                        "mint" : ""+newMint,
                        "geo" : me.geo,
                        "ipaddr" : incomingIP,
                        "port" : ""+me.port,
                        "publickey" : ""+me.publickey,
                        "wallet" : ""+me.wallet
**/
/**
                        converted to
                        #PulseGroup Peer devops
[Peer]
PublicKey = ziIzC9q6qnbAuhMz3S96GCITbmsb4rZbN7MRYWfow3o=
AllowedIPs = 10.10.0.3/32
Endpoint = 71.202.2.184:80
PersistentKeepalive = 25


                    });

                }
            //}
        });
    }
    //write wireguard config to /etc/wireguard/darp.pending.conf for installation outside the docker
    console.log("Generated wireguard config: "+BASECONFIG+config);
})

}
*/
//setWireguard();
