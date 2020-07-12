"use strict";
exports.__esModule = true;
var lib_1 = require("../lib/lib");
function grapher(src, dest) {
    console.log("grapher(): src=" + src + " det=" + dest);
    var txt = "\n<!DOCTYPE HTML>\n<meta http-equiv=\"refresh\" content=\"10\">\n<html>\n<head>\n<title>" + src + "-" + dest + "</title> \n<script type=\"text/javascript\" src=\"https://canvasjs.com/assets/script/jquery-1.11.1.min.js\"></script>\n<script type=\"text/javascript\" src=\"https://canvasjs.com/assets/script/jquery.canvasjs.min.js\"></script>\n<script type=\"text/javascript\">\n$(function() {\n\t$(\".chartContainer\").CanvasJSChart({\n\t\ttitle: {\n\t\t\ttext: \"" + src + "-" + dest + "\"\n\t\t},\n\t\taxisY: {\n\t\t\ttitle: \"latency in ms\",\n\t\t\tincludeZero: false\n\t\t},\n\t\taxisX: {\n\t\t\tinterval: 1\n\t\t},\n\t\tdata: [\n\t\t{\n\t\t\ttype: \"line\", //try changing to column, area\n\t\t\ttoolTipContent: \"{label}: {y} ms\",\n\t\t\tdataPoints: [\n                //fetched data from file goes here\n                ";
    var fs = require("fs");
    var myYYMMDD = lib_1.YYMMDD();
    var path = src + "-" + dest + "." + myYYMMDD + '.txt';
    try {
        if (fs.existsSync(path)) {
            //file exists
            var rawSamples = fs.readFileSync(path);
            console.log("rawSamples=" + rawSamples.toString() + " ");
            var secondSamples = rawSamples.toString().split(","); //2 commas per line
            console.log("secondSamples=" + secondSamples + " ");
            var sampleCount = secondSamples.length;
            console.log("secondSamples=" + secondSamples + " secondSamples.length=" + secondSamples.length);
            var j = 0;
            var sixtySamples = [];
            for (var i = sampleCount - 10; i < 10; i++)
                sixtySamples[j++] = "{" + secondSamples[i];
            var newSamples = sixtySamples.join(" ");
            txt += newSamples;
            console.log("sixtySamples length=" + sixtySamples.length + " newSamples: " + newSamples);
            //save only last 60 samples of raw data'
            //fs.writeFile(path, minuteSamples.join(","), function (err) {
            //    if (err) return console.log(err);
            //});
            //console.log(`found / data file ${path}:${txt}`);
        }
        else {
            console.log("could not find live pulseGroup graph data from " + path);
            txt += "/* could not find live pulseGroup graph data from " + path + " */";
        }
    }
    catch (err) {
        return console.error(err);
    }
    txt += "]\n\t\t}\n\t\t]\n\t});\n});\n</script>\n</head>\n<body>\n<div class=\"chartContainer\" style=\"height: 300px; width: 100%;\"></div>\n</body>\n</html>\n";
    //console.log(`txt=${txt}`);
    return txt;
}
exports.grapher = grapher;
//
//  grapherStoreOwl - store the owl sample in a way that can be graphed by the function above
//
function grapherStoreOwl(src, dst, owl) {
    var fs = require('fs');
    var d = new Date();
    var sampleLabel = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
    var filename = src + '-' + dst + '.' + lib_1.YYMMDD() + '.txt';
    var sample = "{ label: \"" + sampleLabel + "\", y: " + owl + " },\n";
    //console.log("storeOwl() About to store sample "+owl+" in ("+filename+") owl measurement:"+sample); //INSTRUMENTATION POINT
    //if (owl > 2000 || owl < 0) {
    //console.log("storeOWL(src=" + src + " dst=" + dst + " owl=" + owl + ") one-way latency out of spec: " + owl + "STORING...0");
    //
    //owl = 0;
    //}
    //var logMsg = "{y:" + owl + "},\n";
    fs.appendFile(filename, sample, function (err) {
        if (err)
            throw err;
        //console.log('Saved!');
    });
}
exports.grapherStoreOwl = grapherStoreOwl;
