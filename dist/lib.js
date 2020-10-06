"use strict";
/** @module lib Common routines in one place */
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
var fs = require("fs");
/**
 * Returns the statistical median of the number array.
 * @param {number[]} numbers An array of numbers.
 * @returns {number} The calculated median value from the specified numbers.
 */
function median(incomingNumbers) {
    // median of [3, 5, 4, 4, 1, 1, 2, 3] = 3
    var numbers = __spreadArrays(incomingNumbers); //don't sort the actual data set
    var median = 0, numsLen = numbers.length;
    numbers.sort();
    if (numsLen % 2 === 0) {
        // if it is even, average of two middle numbers
        median = (numbers[numsLen / 2 - 1] + numbers[numsLen / 2]) / 2;
    }
    else {
        // if it is odd, middle number only
        median = numbers[(numsLen - 1) / 2];
    }
    return median;
}
exports.median = median;
/**
 * Returns nth index of a specific charachter in a given string.
 * @param {string} string A string to search in.
 * @param {string} char A character to search for.
 * @param {number} nth An occurence of the character to search for.
 * @returns {number} An index of character in the string
 */
function nth_occurrence(string, char, nth) {
    var first_index = string.indexOf(char);
    var length_up_to_first_index = first_index + 1;
    if (nth == 1) {
        return first_index;
    }
    else {
        var string_after_first_occurrence = string.slice(length_up_to_first_index);
        var next_occurrence = nth_occurrence(string_after_first_occurrence, char, nth - 1);
        if (next_occurrence === -1) {
            return -1;
        }
        else {
            return length_up_to_first_index + next_occurrence;
        }
    }
}
exports.nth_occurrence = nth_occurrence;
/**
 * Returns milliseconds since 1970
 * @returns {number} Miliseconds
 */
function now() {
    var d = new Date();
    return d.getTime();
}
exports.now = now;
/**
 * Returns human readable timezone-aware datetime with appended space
 * @returns {string} Timestamp within local timezone
 */
function ts() {
    return new Date().toLocaleTimeString() + " ";
}
exports.ts = ts;
/**
 * Returns YYMMDD string
 * @returns {string} Date in YYMMDD format
 */
function YYMMDD() {
    var _YYMMDD = new Date().toISOString().substring(2, 10).replace(/-/g, '');
    return _YYMMDD;
}
exports.YYMMDD = YYMMDD;
/**
 * Return JSON string
 * @param {object} obj Object to convert to JSON
 * @returns {string} Stringified object
 */
function dump(obj) {
    return JSON.stringify(obj, null, 2);
}
exports.dump = dump;
/**
 * Saves a data backup into disk, should we lose connection
 * @param {string} logMsg Log message to save
 * @param {string} filename Log file
 */
function Log(logMsg, filename) {
    if (typeof filename == "undefined")
        filename = 'DARP.log';
    var wgdir = process.env.WGDIR; //created by bootdarp
    filename = wgdir + "/" + filename + '.log';
    console.log("Logging " + logMsg + " into " + filename);
    logMsg = ts() + logMsg + '\n';
    fs.appendFile(filename, logMsg, function (err) {
        if (err)
            throw err;
    });
}
exports.Log = Log;
/**
 * Returns the Build version
 * @returns {string} Build version
 */
function MYVERSION() {
    var darpdir = process.env.DARPDIR;
    var darpBuild = null; //we set this in the readir call
    if (typeof darpdir == "undefined") {
        console.log("MYVERSION(): Environmental variable DARPDIR undefined... EXITTING...");
        process.exit(36); //reload SW - this should not happen
    }
    fs.readdirSync(darpdir).forEach(function (fn) {
        var Build = fn.match(/Build.*/);
        if (Build !== null) {
            darpBuild = Build[0];
        }
    });
    return darpBuild;
}
exports.MYVERSION = MYVERSION;
function mint2IP(mint) {
    var octet3 = Math.round(mint / 254);
    var octet4 = mint % 254;
    return "10.10." + octet3 + "." + octet4;
}
exports.mint2IP = mint2IP;
/*
export function MYIP() {
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
    }).on('error', function(err) {
        console.log("error: " + err.message);
    });
}
*/ 
