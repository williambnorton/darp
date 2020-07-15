"use strict";
/** @module lib Common routines in one place */
exports.__esModule = true;
var fs = require("fs");
/**
 * Returns the statistical median of the number array.
 * @param {number[]} numbers An array of numbers.
 * @returns {number} The calculated median value from the specified numbers.
 */
function median(numbers) {
    // median of [3, 5, 4, 4, 1, 1, 2, 3] = 3
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
        filename = 'NOIA.log';
    var d = new Date();
    filename = filename + '.log';
    logMsg = ts() + logMsg + '\n';
    fs.appendFile(filename, logMsg, function (err) {
        if (err)
            throw err;
    });
}
exports.Log = Log;
/**
 * Reads the Build version files and returns their names
 * @returns {string[]} Build version filenames
 */
function MYVERSION() {
    var darpdir = process.env.DARPDIR;
    if (typeof darpdir == "undefined") {
        console.log("MYVERSION(): Environmental variable DARPDIR undefined... EXITTING...");
        process.exit(36); //reload SW - this should not happen
    }
    console.log(darpdir + "==>" + fs.readdirSync(darpdir));
    //    let files = fs.readdirSync(darpdir).filter((fn: string) => { fn.startsWith('Build.') });
    var files = fs.readdirSync(darpdir).forEach(function (fn) {
        console.log("fn=" + fn);
        if (fn.match(/Build/g))
            return fn;
    });
    console.log("MYVERSION(): Exitting - could not find the Build.");
    process.exit(36);
}
exports.MYVERSION = MYVERSION;
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
