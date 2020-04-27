//
//  handlePulse - receive incoming pulses and store in redis
//
import { now, ts ,dump, newMint, makeYYMMDD } from '../lib/lib.js';
console.log("Starting HANDLEPULSE GENESIS="+process.env.GENESIS+" PORT="+process.env.PORT+" HOSTNAME="+process.env.HOSTNAME+" VERSION="+process.env.VERSION+" MYIP="+process.env.MYIP);

var SHOWPULSES="0";
const pulseRedis = require('redis');
var redisClient = pulseRedis.createClient(); //creates a new client

var dgram = require('dgram');
var server = dgram.createSocket('udp4');

var MYBUILD="";
var isGenesisNode=false;
redisClient.hgetall("mint:0", function (err,me) {
  console.log("HANDLEPULSE starting with me="+dump(me));
  redisClient.hgetall("mint:1", function (err,genesis) {
    if (me==null){
      console.log(ts()+"HANDLEPULSE started with no genesis mint:1 EXITTING...");
      process.exit(36)
    } else {
      SHOWPULSES=me.SHOWPULSES
      console.log(ts()+"HANDLEPULSE started with genesis="+dump(genesis));
    }
  });
});


console.log(ts()+"handlePulse: Starting");
//
//  mint:0 is me and my configuration, mint:1 is the groupOwner - a Genesis node
//
redisClient.hgetall("mint:0", function (err,me) {
    //console.log("handlePulse(): Configuration  me="+dump(me));
  MYBUILD=me.version;
  isGenesisNode=me.isGenesisNode;
  console.log(ts()+"handlepulse(): Binding pulsePort on UDP port "+me.port);
  server.bind(me.port, "0.0.0.0");
});



//
//  only callback if authenticated
//
function  authenticatedMessage(pulse, callback) {
  redisClient.hgetall("mint:"+pulse.srcMint, function (err,senderMintEntry) {

    if (senderMintEntry==null) {
      console.log("authenticateMessage(): DROPPING We don't have a mint entry for this pulse:"+dump(pulse));
      //callback(null,false);
    } else {
      //simple authentication matches mint to other resources
      if (senderMintEntry.geo==pulse.geo) callback(null, true)
       else {
          console.log("authenticateMessage: unauthenticated packet - geo "+pulse.geo+" did not match our mint table"+dump(pulse)+dump(senderMintEntry.geo));
          //callback(null,false)
       }
    }
  });
}

//
//  message format: 0,56,1583783486546,MAZORE,MAZORE.1,1>1=0,2>1=0
//
//    from pulser.ts:
//var pulseMessage="0,"+me.version+","+me.geo+","+pulseGroup+","+seq+","+now()+","+me.mint+",";  //MAZORE:MAZJAP.1
//
server.on('message', function(message, remote) {
  if (SHOWPULSES=="1") 
    console.log(ts()+"HANDLEPULSE: received pulse "+message.length+" bytes from "+remote.address + ':' + remote.port +' - ' + message);
  var msg=message.toString();
  var ary=msg.split(",");
  //try {
  var pulseTimestamp=ary[5];                  //1583783486546
  var OWL=now()-pulseTimestamp;
  if (OWL<=-999) OWL=-99999;  //we can filter out clocks greater than +/- 99 seconds off
  if (OWL>=999) OWL=99999;    //bad clocks lead to really large OWL pulses 
  var pulseLabel=ary[2]+":"+ary[3];

  var owlsStart=nth_occurrence (msg, ',', 7);   //owls start after the 7th comma
  var owls=msg.substring(owlsStart+1,msg.length-1);

  //console.log(ts()+"handlepulse(): owls="+owls);

  redisClient.hgetall(pulseLabel, function(err, lastPulse) {
    //console.log("oldPulse.inMsgs="+oldPulse.inMsgs+" oldPulse.inOctets"+oldPulse.inOctets);
    redisClient.hgetall("mint:0", function(err, me) {

      if (me.state=="RELOAD") process.exit(36);  //this is set when reload button is pressed in express
      if (me.state=="STOP") process.exit(86);  //this is set when reload button is pressed in express

      if (lastPulse==null) {     //first time we see this entry, include stats to increment
        lastPulse={ "inOctets" : "0", "inMsgs" : "0"}
      }
      if (err) {console.log("ERROR in on.message handling");}
      var pulse={
        version : ary[1],
        geo : ary[2],
        group : ary[3],
        seq : ary[4],
        pulseTimestamp : pulseTimestamp,
        srcMint : ary[6],
        owls : owls,
        owl : ""+OWL,
        lastMsg : msg,
        inOctets : ""+(parseInt(lastPulse.inOctets)+message.length),
        inMsgs : ""+(parseInt(lastPulse.inMsgs)+1)
      };

      authenticatedMessage(pulse, function(err,authenticated) {

      //console.log("*******pulse.version="+pulse.version+" MYBUILD="+MYBUILD+" dump pulse="+dump(pulse));
      if ( pulse.version != MYBUILD ) {
        if (!isGenesisNode) {
          console.log(ts()+" ******** HANDLEPULSE(): NEW SOFTWARE AVAILABLE isGenesisNode="+isGenesisNode+" - GroupOwner said "+pulse.version+" we are running "+MYBUILD+" .......process exitting");
          console.log("Genesis node pulsed us as "+pulse.version+" MYBUILD="+MYBUILD+" dump pulse="+dump(pulse));

          process.exit(36);  //SOFTWARE RELOAD
        }
      };

      redisClient.publish("pulses",msg)
      redisClient.hmset(pulseLabel, pulse);  //store the pulse
      
      //console.log(ts()+"SAVING matrix entries to redis");
      //add to matrix with expiration times
      redisClient.hmset(pulse.group+":"+pulse.srcMint+"-"+me.mint, "owl",pulse.owl);  //store the pulse
      //console.log(ts()+"SAVED my measured OWL to redis");

      var owlsAry=pulse.owls.split(",")
      //console.log(ts()+"owlsAry="+owlsAry);

      for (var measure in owlsAry) {
        //console.log(ts()+"measure="+measure+" owlsAry[measure]="+owlsAry[measure]);

        var srcMint=owlsAry[measure].split("=")[0]
        var owl=owlsAry[measure].split("=")[1]

        if (typeof owl == "undefined") owl="_"
        var owlEntryLabel=pulse.group+":"+srcMint+"-"+me.mint
        //console.log(ts()+"STORING "+owlEntryLabel+" owls="+owls+" srcMint="+srcMint+" owl="+owl);
        //console.log(ts()+"STORING "+owlEntryLabel+"="+owl);

        redisClient.hmset(owlEntryLabel, "owl", owl);  //store the pulse

      }


      redisClient.hmset("mint:"+pulse.srcMint, {
        "owl" : pulse.owl
      });

      //storeOWL(pulse.geo,me.geo,OWL);

      //console.log(ts()+"HANDLEPULSE(): storedOWL "+dump(pulse));
 
    });
  });
  });
});

//
//      storeOWL() - store one way latency to file or graphing & history
//
function storeOWL(src, dst, owl) {
  var fs = require('fs');
  var d = new Date();
  var YYMMDD = makeYYMMDD();
  var filename = process.env.DARPDIR+"/"+src + '-' + dst + '.' + YYMMDD + '.txt';
  var logMsg = "{ x: new Date('" + d + "'), y: " + owl + "},\n";
  //console.log("About to file("+filename+") log message:"+logMsg);

  //if (owl > 2000 || owl < 0) {
          //console.log("storeOWL(src=" + src + " dst=" + dst + " owl=" + owl + ") one-way latency out of spec: " + owl + "STORING...0");
//
          //owl = 0;
  //}
  //var logMsg = "{y:" + owl + "},\n";
  fs.appendFile(filename, logMsg, function(err) {
          if (err) throw err;
          //console.log('Saved!');
  });
}

function nth_occurrence (string, char, nth) {
  var first_index = string.indexOf(char);
  var length_up_to_first_index = first_index + 1;

  if (nth == 1) {
      return first_index;
  } else {
      var string_after_first_occurrence = string.slice(length_up_to_first_index);
      var next_occurrence = nth_occurrence(string_after_first_occurrence, char, nth - 1);

      if (next_occurrence === -1) {
          return -1;
      } else {
          return length_up_to_first_index + next_occurrence;  
      }
  }
}

//
//  checkSEversion() - reload SW if there is new code to be had
//this is needed because when genesis dies and doesn't know about the peers - peers must reloadSW
//
//setTimeout(checkSWversion,20*1000);; // see if we need new SW
checkSWversion();
function checkSWversion() {
  setTimeout(checkSWversion,20*1000);;
  //console.log("checkSWversion() - currentSW="+MYBUILD);
  const http = require("http");
  redisClient.hgetall("mint:1",function (err,genesis) {
    if (err || genesis==null) {
      console.log("checkSWversion(): WE HAVE NO Genesis Node mint:1 pulse error="+err+" RELOAD");
      process.exit(36);
    }
    const url = "http://"+genesis.ipaddr+":"+genesis.port+"/version";
    //console.log("checkSWversion(): url="+url);
    http.get(url, res => {
      res.setEncoding("utf8");
      let body = "";
  
      res.on("data", data => {
        body += data;
      });
  
      res.on("end", () => {
        var version = JSON.parse(body);
        //console.log("HANDLEPULSE: checkSWversion(): genesis SWversion=="+dump(version)+" currentSW="+MYBUILD);
        if ( version != MYBUILD && !isGenesisNode ) {
           console.log(ts()+" HANDLEPULSE checkSWversion(): NEW SOFTWARE AVAILABLE - GroupOwner said "+version+" we are running "+MYBUILD+" .......process exitting");
           process.exit(36);  //SOFTWARE RELOAD
        }
      });

    });
  });
}

//
// listen for incoming pulses and convert into redis commands
//
server.on('listening', function() {
  var address = server.address();

 console.log(ts()+"");
 console.log(ts()+"");
 console.log(ts()+'UDP Server listening for pulses on ' + address.address + ':' + address.port);
 console.log(ts()+"");
 console.log(ts()+"");
 
});

process.on('SIGTERM', () => {
  console.info('handlePulse SIGTERM signal received.');
  process.exit(36);
});
