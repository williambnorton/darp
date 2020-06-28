//
  //  checkSEversion() - reload SW if there is new code to be had
  //this is needed because when genesis dies and doesn't know about the peers - peers must reloadSW
  //  TODO: Version is based on date: Build.YYMMDD.HHMMSS
  //      Only listen to genesis pulse version#'s, Ignore all others
  //      And only check SWversion if not gnesis version, and use > comparison

  setTimeout(checkSWversion, SW_CHECK_FREQ * 1000);; // see if we need new SW
  //checkSWversion();
  function checkSWversion() {
    setTimeout(checkSWversion, SW_CHECK_FREQ * 1000);;
    //console.log("checkSWversion() - currentSW="+MYBUILD);
    const http = require("http");
    redisClient.hgetall("mint:0", function(err, me) {
          redisClient.hgetall("mint:1", function(err, genesis) {
              if (err || genesis == null) {
                  console.log("checkSWversion(): WE HAVE NO Genesis Node mint:1 pulse error=" + err + " RELOAD");
                  process.exit(36);
              }
              //
              //  use this opportunity to reboot if group owner is AWOL for 20 seconds
              //

              var elapsedSecondsSinceOwnerPulse=Math.round(  ((now()-genesis.pulseTimestamp)/1000) );
              console.log("elapsedSecondsSinceOwnerPulse="+elapsedSecondsSinceOwnerPulse);
              //TODO: This doesn't work - the genesis node goes away and thenode dies connection refused
              //doen't matter - the reload of software will force a rejoin.
              if (elapsedSecondsSinceOwnerPulse> SW_CHECK_FREQ ) {
                  console.log("HANDLEPULSE(): The Genesis Group went away... elapsedSecondsSinceOwnerPulse > SW_CHECK_FREQ so forcing reload and reconnect");
                  console.log("HANDLEPULSE(): The Genesis Group went away... elapsedSecondsSinceOwnerPulse > SW_CHECK_FREQ so forcing reload and reconnect");
                  console.log("HANDLEPULSE(): The Genesis Group went away... elapsedSecondsSinceOwnerPulse > SW_CHECK_FREQ so forcing reload and reconnect");

                  process.exit(36);
              }
              const url = "http://" + genesis.ipaddr + ":" + genesis.port + "/version";
              //console.log("checkSWversion(): url="+url);
              http.get(url, res => {
                  res.setEncoding("utf8");
                  let body = "";

                  res.on("data", data => {
                      body += data;
                  });

                  res.on('error', function(error) {
                      console.log("HANDLEPULSE: checkSWversion CAN'T REACH GENESIS NODE"); // Error handling here never triggered TODO
                    });

                  res.on("end", () => {
                      var version = JSON.parse(body);
                      
                      //console.log(ts()+"HANDLEPULSE: checkSWversion(): "+" genesis SWversion=="+dump(version)+" currentSW="+MYBUILD);
                      if ((version != me.version) ) {
                          if (me.ipaddr==genesis.ipaddr) return console.log("ignoring this software version - I am genesis node");
                          console.log(ts() + " HANDLEPULSE checkSWversion(): NEW SOFTWARE AVAILABLE - GroupOwner said " + version + " we are running " + me.version + " .......process exitting");
                          process.exit(36); //SOFTWARE RELOAD
                      }
                  });

              });
          });
      });
  }
