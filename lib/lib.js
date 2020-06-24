//
//  lib.js - common routines in one place
//


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


function nth_occurrence(string, char, nth) {
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
//      YYMMDD() - make YYMMDD string for timestamping
//
function YYMMDD() {
    var _YYMMDD = new Date().toISOString().substring(2, 10).replace(/-/g, '');
    return _YYMMDD;
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
    //var _YYMMDD = YYMMDD();
    //;
    //var filename = filename+'.' + YYMMDD + '.log.txt';
    var filename = filename + '.log';
    logMsg = ts() + logMsg + '\n';
    fs.appendFile(filename, logMsg, function (err) {
        if (err)
            throw err;
        //console.log('Saved!');
    });
}


function MYVERSION() {
    const fs = require('fs');

    var darpdir=process.env.DARPDIR;
    darpdir="../"

    //console.log(ts()+"darpdir="+darpdir);
    var files = fs.readdirSync(darpdir).filter(fn => fn.startsWith('Build.'));
    //console.log(ts()+"MYVERSION="+files);
    return files;
}
/*
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
*/
module.exports = { nth_occurrence:nth_occurrence, now: now, ts: ts, dump: dump, Log: Log,  YYMMDD, MYVERSION  };
