//
//  rtt.ts - a simple batch ping using files to hold latency measures
//
//run this once a minute out of cron
const http = require('http');
var fs = require('fs');

const PINGCOUNT=60;
setTimeout(finish,(PINGCOUNT+1)*1000)

function finish() {
    timeout();  //timeout last nodes
    process.exit();
}

function skulker() {
//console.log(`SKULKING`);
const DIRPATH='./';
fs.readdir( DIRPATH, function( err, files ) {
    if ( err ) return console.log( err );
    //console.log(`files=${files}`);
    files.forEach(function( file ) {
        if (file.indexOf("ip")==0) {
            var filePath = DIRPATH + file;
            fs.stat( filePath, function( err, stat ) {
                if ( err ) return console.log( err );
                //console.log(`filePath=${filePath}`);
                var fileAge=Number(Date.now())-stat.ctime;
                //console.log(`fileAge=${fileAge}`);
                if (fileAge>2000) {
                    //console.log(`DELETEING OLD ping data file ${filePath}`);
                    fs.unlink( filePath, function( err ) {
                        if ( err ) return console.log( err );
                     });
                }
            });
        }
    });
    setTimeout(skulker,1000);
});
}
skulker();
//process.exit();

function ping(ip, name, callback) {
    //var terminal = require('child_process').exec('ping -c 5 -W 5 '+ip);
    var terminal = require('child_process').exec(`ping -c ${PINGCOUNT} `+ip);

    terminal.stdout.on('data', function (stdout) {
            var lines=stdout.split(/\r?\n/)
            for (var line in lines) {
                //console.log('line: ' + lines[line]);

                var ary = lines[line].split(" ");
                //console.log("ary="+ary+" ary.length="+ary.length);

                if (ary.length==8) {
                    callback(ip,name,ary[6].split("=")[1]);
                }
      
            }
        //console.log(`PING DID NOT RESPOND ${ip} ${name} ****************************************`);
        //callback(ip,name);  //fall through result we didn't find a measurement "bytes" in the output
    });
    
    terminal.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });
    
    terminal.on('exit', function (code) {
        //console.log('child process exited with code ' + code);
    });
}
var gNodeAry=[];
function timeout() {
            //Now mark as NO RESPONSE those with times > 1 sec ago
            for (var ip in gNodeAry) {
                //console.log(`timeout() checking node=${ip}`);
                if (    Number(Date.now()) - gNodeAry[ip] > 1000 && typeof(deleted[ip]) == "undefined") {
                    //console.log(`TIMEOUT for ip=${ip} `);
                    fs.unlink(`ip.${ip}`, function(err) {});
                    deleted[ip]="DELETED ALREADY"; 
                }
            }
    //setTimeout(timeout,1000);
}
//var timerID=timeout();
var refreshIntervalId = setInterval(timeout, 1000);

var deleted=[];  // a list of nodes already deleted, so we don't hammer the disk

http.get("http://127.0.0.1:65013/state",(res2) => {
    let  json = "";

    res2.on("data", (chunk2) => {
        json += chunk2;
    });

    res2.on("end", () => {
        const pulseGroup=JSON.parse(json);
	    //for ( var pulseGroup in pulseGroups ) {
        for (const node in pulseGroup.pulses) {
            //console.log(`json=${JSON.stringify(pulseGroup.pulses[node],null,2)}`);
    
            //console.log("ping "+pulseGroup.pulses[node].ipaddr);
           // console.log("ping 10.10.0."+pulseGroup.pulses[node].mint);
            var mintIP="10.10."+(pulseGroup.pulses[node].mint/253).toFixed(0)+"."+(pulseGroup.pulses[node].mint%253);
            var publicIP=pulseGroup.pulses[node].ipaddr;
            var name=pulseGroup.pulses[node].geo;

            gNodeAry[publicIP] = Number(Date.now());
            ping(publicIP, name, function (publicIP, name, rtt) {
                delete gNodeAry[publicIP];
                //console.log("PUBLIC INTERNET PING RESPONSE callback: publicIP="+publicIP+" name="+name+" rtt="+rtt);
                delete deleted[publicIP];
                fs.writeFile(`ip.${publicIP}`, rtt, function(err) {
                    if(err) {
                        console.log(err);
                    } 
                });
            })

            gNodeAry[mintIP]=Number(Date.now());
            ping(mintIP, name, function (mintIP, name, rtt) {
                delete gNodeAry[mintIP];
                delete deleted[mintIP];

                //console.log("WIREGUARD PING RESPONSE callback: publicIP="+mintIP+" name="+name+" rtt="+rtt);
                fs.writeFile(`ip.${mintIP}`,rtt, function(err) {
                    if(err) {
                        console.log(err);
                    } 
                });
            })
        }
    });
});