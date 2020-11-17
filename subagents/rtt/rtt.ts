const http = require('http');

function ping(ip, name, callback) {
    var terminal = require('child_process').exec('ping -c 5 -W 5 '+ip);
    terminal.stdout.on('data', function (stdout) {
        var rtt=99999;   //Assume no answer

            var lines=stdout.split(/\r?\n/)
            for (var line in lines) {
                //console.log('line: ' + lines[line]);

                var ary = lines[line].split(" ");
                //console.log("ary="+ary+" ary.length="+ary.length);

                if (ary[2]=="=") {

                    var stats = ary[3];
                    var statsAry = stats.split("/");
                    //console.log("ary="+ary+" ary.length="+ary.length+" statsAry="+statsAry);

                    if (statsAry.length >= 3) {
                        var min=statsAry[0];
                        var avg=statsAry[1];
                        var max=statsAry[2];
                        var stddev=statsAry[3];
                        rtt=avg;
                        //if we have a measure
                        //console.log(`FOUND A MEASUREMENT min=${min} avg=${avg} max=${max}`);

                        //console.log(`-------- > PING RESPONDED rtt() ***** ${name} ${ip} ${rtt} `);
                            //pulseEntry.rtt = rtt;
                        callback(ip,name,rtt,min,max,avg,stddev);
                        return;
                    } else {
                            //console.log(`*******clearing measure to record of pulseEntry.geo=${pulseEntry.geo}`);
                    } 
                } 
            }
//        console.log(`---------- > PING DID NOT RESPOND `);
        callback(ip,name,99999,99999,99999,99999,99999);  //fall through result we didn't find a measurement "bytes" in the output
    });
    
    terminal.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });
    
    terminal.on('exit', function (code) {
        //console.log('child process exited with code ' + code);
    });
}

http.get("http://127.0.0.1:65013/state",(res2) => {
    let  json = "";

    res2.on("data", (chunk2) => {
        json += chunk2;
    });

    res2.on("end", () => {
        var fs = require('fs');
        const pulseGroup=JSON.parse(json);
	    //for ( var pulseGroup in pulseGroups ) {
		for (const node in pulseGroup.pulses) {
            //console.log(`json=${JSON.stringify(pulseGroup.pulses[node],null,2)}`);
    
            //console.log("ping "+pulseGroup.pulses[node].ipaddr);
           // console.log("ping 10.10.0."+pulseGroup.pulses[node].mint);
            var mintIP="10.10."+(pulseGroup.pulses[node].mint/253).toFixed(0)+"."+(pulseGroup.pulses[node].mint%253);
            var publicIP=pulseGroup.pulses[node].ipaddr;
            var name=pulseGroup.pulses[node].geo;
            ping(publicIP, name, function (publicIP, name, rtt, min, avg, max, stddev) {
                switch(rtt) {
                    case 99999: 
                        console.log("PUBLIC INTERNET NO PING RESPONSE callback: publicIP="+publicIP+" name="+name+" rtt="+rtt);
                        fs.unlink(`ip.${publicIP}`, function(err) {});
                        break;
                    default:
                        console.log("PUBLIC INTERNET PING RESPONSE callback: publicIP="+publicIP+" name="+name+" rtt="+rtt);
                        fs.writeFile(`ip.${publicIP}`, rtt, function(err) {
                            if(err) {
                                console.log(err);
                            } 
                        });
                        break;
                }
            })
            ping(mintIP, name, function (mintIP, name, rtt, min, avg, max, stddev) {
                switch(rtt) {
                    case 99999: 
                        console.log("WIREGUARD NO PING RESPONSE callback: publicIP="+mintIP+" name="+name+" rtt="+rtt);
                        fs.unlink(`ip.${mintIP}`, function(err) {});
                        break;
                    default:
                        console.log("WIREGUARD PING RESPONSE callback: publicIP="+mintIP+" name="+name+" rtt="+rtt);
                        fs.writeFile(`ip.${mintIP}`,rtt, function(err) {
                            if(err) {
                                console.log(err);
                            } 
                        });
                        break;
                }
            })
        }
    });
});
/***

            exec(pingCmd, (error: ExecException | null, stdout: string, stderr: string) => {
                    //64 bytes from 10.10.0.1: seq=0 ttl=64 time=0.064 ms
                    var i = stdout.indexOf("100%");
                    if (i >= 0) {
                        if (wgMeasure!=1) {
                            //pulseEntry.rtt = NO_MEASURE; // UNREACHABLE
                            console.log(ts()+`----------------------- > ${wgMeasure} measurertt() ${pulseEntry.geo} ${pulseEntry.ipaddr} did not respond to ping over public Internet end point ${ip}`);
                        
			} else {
                            //pulseEntry.wgrtt = NO_MEASURE; // UNREACHABLE
                            console.log(ts()+`======================= > ${wgMeasure} measurertt() ${pulseEntry.geo} ${pulseEntry.ipaddr} did not respond to ping over encrypted tunnel to ${ip}`);
                        }
                        return;
                    }

                    var ary = stdout.split(" ");
                    var address = ary[8];
                    var octets = address.split(".");
                    var mint = parseInt(octets[2]) * 254 + parseInt(octets[3]); //TODO: we should verify mint here
                    if (ary[6] == "bytes") {
                        //if we have a measure
                        var timeEquals = ary[11];
                        if (typeof timeEquals != "undefined") {
                            var rtt = parseInt(timeEquals.split("=")[1]);
                            //TODO: here we store or clear the rttMatrix element
                            //console.log(`**** address: ${address} to see who replied... measurertt(): ${pulseEntry.geo} rtt = `+rtt);
                            //TODO: store in rttHistory, rttMedian
                            if (wgMeasure!=1) {
                                console.log(ts()+`----------------------- >${wgMeasure} measurertt() ******* ${this.mintTable[0].geo}-${pulseEntry.geo} mint=${pulseEntry.mint} saving measure ${rtt} to record of pulseEntry.geo=${pulseEntry.geo}`);
                                pulseEntry.rtt = rtt;
                            } else {
                                pulseEntry.wgrtt = rtt;
                                console.log(ts()+`======================= >${wgMeasure} measurertt() ******* ${this.mintTable[0].geo}-${pulseEntry.geo} mint=${pulseEntry.mint} saving measure ${rtt} to record of pulseEntry.geo=${pulseEntry.geo}`);

                            }
                        } else {
                            if (wgMeasure!=1) {
                                pulseEntry.rtt = NO_MEASURE;
                                console.log(ts()+`----------------------- >${wgMeasure} measurertt() **  PING RESPONDED    **** measurertt(): ${pulseEntry.geo} ipaddr=${pulseEntry.ipaddr} rtt = ${pulseEntry.rtt}`);
                            } else {
                                pulseEntry.wgrtt = NO_MEASURE;
                                console.log(ts()+`======================= >${wgMeasure} measurertt() **  PING RESPONDED    **** measurertt(): ${pulseEntry.geo} ipaddr=${pulseEntry.ipaddr} rtt = ${pulseEntry.rtt}`);
                            }
                            //console.log(`*******clearing measure to record of pulseEntry.geo=${pulseEntry.geo}`);
                        }
                    }
                }
            );
        }




	//	}
	}
        });

        }).on("error", (error) => {
            console.error(error.message);
        });
*/