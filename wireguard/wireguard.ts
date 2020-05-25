//
//  wireguard.ts - configure wireguard conf file in wireguard as darp.pending.conf
//
// ***
import { dump, now, ts } from "../lib/lib";
const WGDIR="/etc/wireguard";  //this is the direcvtory to build and evolve wg config files

const pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client

export function getPublicKey() {
    return require('fs').readFileSync(WGDIR+'/publickey', 'utf8');
}

function wgdump() {
    var wgconfig="";
    try {
        wgconfig=require('fs').readFileSync(WGDIR+'/darp0.conf', 'utf8');
    } catch (err) {
        console.log("wireguard: dumpWGconf() ERROR");
    }
    console.log("wgconfig="+wgconfig);
}

export function setWireguard() {

    //we assume these file were set by configWG
    console.log("setWireguard(): saving mint entry as stanza for each wg connection.");
    var BASECONFIG="";
    try {
        BASECONFIG=require('fs').readFileSync(WGDIR+'/wgbase.conf', 'utf8');
    } catch (err) {
        BASECONFIG="deadbeef00deadbeef00deadbeef0012";
    }

    //console.log("BASECONFIG="+BASECONFIG);
    //# Created by ./configWG.bash Fri Mar 6 20:46:57 UTC 2020
    //[Interface]
    //PrivateKey = CPEQ3Q4tv6MXHhbQEyfw3VdJP5QzBihe4B41ocAm9UE=

    
    var PUBLICKEY;
    try {
        PUBLICKEY=require('fs').readFileSync(WGDIR+'/publickey', 'utf8');
    } catch (err) {
        PUBLICKEY="deadbeef00deadbeef00deadbeef0012";
    }

    //for each group in me.pulseGroups
    console.log(ts()+"Setting up wireguard files ");

    redisClient.hgetall("gSRlist", function (err,gSRlist) { //get each mint in use now
        redisClient.hgetall("mint:0", function (err,me) {
            redisClient.hgetall("mint:1", function (err,genesis) {
                var lastPulse="", addressStanza="", config=new Array();

                addressStanza+="#Individual entries for node: "+me.geo+" "+" mint="+me.mint+" "+ts()+" Genesis bootTimestamp="+genesis.bootTimestamp+" by wireguard.ts\n";
                addressStanza+="Address = 10.10."+Math.round(me.mint/254)+"."+(me.mint%254)+"/16, fd86:ea04:1115::"+me.mint+"/64\n";
                addressStanza+="ListenPort = 80\n";

                for (var entryLabel in gSRlist) lastPulse=entryLabel;  //stop when we get to this entry

                for (var entryLabel in gSRlist) {  //for all currently used mint entries
                    var mint=gSRlist[entryLabel];  //
                    console.log(ts()+"***** Spewing out wireguard config file into /etc/wireguard mint="+mint+" entryLabel="+entryLabel);

                    redisClient.hgetall("mint:"+mint, function (err,mintEntry) {   
                        if ( mintEntry != null ) {
                            var prefix="";
                            var mint=parseInt(mintEntry.mint);  //do not count on mint outside my scope
                            //config[mint]=new Array();
                            if (mintEntry.geo==me.geo) {prefix="#   * me *   "}  //comment my stuff out
                            //console.log(prefix+"------------------- Writing stanza for mint="+mint+" "+mintEntry.geo);
                            console.log(prefix+"mintEntry ="+JSON.stringify(mintEntry,null,2));
                            //config+="\n";                            
                            var myStanza="#\n" + 
prefix+"# "+mintEntry.geo+" can send to us on this channel mint="+ mint+"\n" +
prefix+"[Peer]\n" +
prefix+"PublicKey = "+mintEntry.publickey+"\n" +
prefix+"AllowedIPs = 10.10."+Math.round(me.mint/254)+"."+(me.mint%254)+"/32,fd86:ea04:1115::"+mintEntry.mint+"/128\n" +
prefix+"Endpoint = "+mintEntry.ipaddr+":"+"80"+"\n" +
prefix+"PersistentKeepalive = 25"+"\n\n";

                            config.unshift(myStanza);
                            //console.log("config[mint="+mint+"]="+config[mint]);
                            //console.log("config="+config);
                            //console.log("wireguard(): mintEntry.geo: "+mintEntry.geo);

                            if (mintEntry.geo+":"+mintEntry.group==lastPulse) {
                                //console.log("Got to last pulse "+lastPulse+" - now WRITE the wireguard config stanzas:"+dump(config));
                                //console.log("READY TO WRITE Wireguard file :"+config);

                                var aggregateStanzas="";
                                //console.log("dump config:"+dump(config));
                                for (var stanza=config.pop(); stanza!=null; stanza=config.pop()) {
                                    aggregateStanzas+=stanza;
                                }
                                //console.log("BASECONFIG: " + BASECONFIG);
                                //console.log("addressStanza: " + addressStanza);
                                //console.log("aggregateStanzas: " + aggregateStanzas);
                                
                                const fs = require('fs');
                                fs.writeFile(WGDIR+'/darp0.pending.conf', BASECONFIG+addressStanza+aggregateStanzas, (err) => {
                                    // throws an error, you could also catch it here
                                    if (err) throw err;
                                    console.log("******** wireguard.ts: WRITING wgConfig file: "+WGDIR+"/darp0.conf ");
 
                                    wgdump();                            

                                });
                            }
                            
                        } else {
                            console.log("wireguard: configuring wireguard...ignoring self "+me.geo+" or null mint");
                        }
                    });
                }
                
            });
        });
    });

}

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