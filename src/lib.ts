/** @module lib Common routines in one place */

import fs = require('fs');


/**
 * Returns the statistical median of the number array.
 * @param {number[]} numbers An array of numbers.
 * @returns {number} The calculated median value from the specified numbers.
 */
export function median(incomingNumbers: number[]): number {
    // median of [3, 5, 4, 4, 1, 1, 2, 3] = 3
    var numbers=[...incomingNumbers]; //don't sort the actual data set
    var median = 0, numsLen = numbers.length;
    
    numbers.sort();
    if (numsLen % 2 === 0) {
        // if it is even, average of two middle numbers
        median = (numbers[numsLen / 2 - 1] + numbers[numsLen / 2]) / 2;
    } else {
        // if it is odd, middle number only
        median = numbers[(numsLen - 1) / 2];
    }
    return median;
}

/**
 * Returns nth index of a specific charachter in a given string.
 * @param {string} string A string to search in.
 * @param {string} char A character to search for.
 * @param {number} nth An occurence of the character to search for.
 * @returns {number} An index of character in the string
 */
export function nth_occurrence(string: string, char: string, nth: number): number {
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

/**
 * Returns milliseconds since 1970
 * @returns {number} Miliseconds
 */
export function now(): number {
    var d = new Date();
    return d.getTime();
}

/**
 * Returns human readable timezone-aware datetime with appended space
 * @returns {string} Timestamp within local timezone
 */
export function ts(): string {
    return new Date().toLocaleTimeString() + " ";
}

/**
 * Returns YYMMDD string
 * @returns {string} Date in YYMMDD format
 */
export function YYMMDD(): string {
    var _YYMMDD = new Date().toISOString().substring(2, 10).replace(/-/g, '');
    return _YYMMDD;
}

/**
 * Return JSON string
 * @param {object} obj Object to convert to JSON
 * @returns {string} Stringified object
 */
export function dump(obj: object): string {
    return JSON.stringify(obj, null, 2);
}

/**
 * Saves to NODE disk /root/darp/DARP.log by default
 * @param {string} logMsg Log message to save
 * @param {string} filename Log file
 */
export function Log(logMsg: string, filename?: string) {
    if (typeof filename == "undefined")
        filename = 'DARP';
    //let root = process.env.HOME+"/darp";  //created by bootdarp
    let root = process.env.WGDIR;  //created by bootdarp <---NEW

    filename = root+"/"+filename + '.log';
    //console.log(ts()+`Log(): Logging ${logMsg} into ${filename}`);
    logMsg = ts() + logMsg + '\n';
    fs.appendFile(filename, logMsg, (err) => {
        if (err)
            throw err;
    });
}

/**
 * Returns the Build version
 * @returns {string} Build version
 */
export function MYVERSION(): string {
    let darpdir = process.env.DARPDIR;
    var darpBuild = null;  //we set this from Build. file contents
    var dockerBuild = null;  //we set this from Docker. file contents
    if (typeof darpdir == "undefined") {
        console.log(`MYVERSION(): Environmental variable DARPDIR undefined... EXITTING...`);
        process.exit(36); //reload SW - this should not happen
    }
    fs.readdirSync(darpdir).forEach((fn: string) => { 
        const Build=fn.match(/Build\..*/);
        if (Build !== null) {
            darpBuild=Build[0];
        }
    });
    fs.readdirSync(darpdir).forEach((fn: string) => { 
        const Docker=fn.match(/Docker\.[0-9][0-9][0-9][0-9][0-9][0-9]\.[0-9][0-9][0-9][0-9]/);
        if (Docker !== null) {
            dockerBuild=Docker[0];
        }
    });
    //console.log(`MYVERSION() returning ${dockerBuild}:${darpBuild}`);
    return dockerBuild+":"+darpBuild;
}

export function mint2IP(mint:number):string {
    const octet3=Math.round(mint/254);
    const octet4=mint%254;
    return `10.10.${octet3}.${octet4}`
}

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