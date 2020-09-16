"use strict";
exports.__esModule = true;
var lib_1 = require("./lib");
var fs = require("fs");
function grapher(src, dest) {
    var myYYMMDD = lib_1.YYMMDD();
    var txt = "\n<!DOCTYPE HTML>\n<meta http-equiv=\"refresh\" content=\"60\">\n<html>\n<head>\n<title>" + src + "-" + dest + " " + myYYMMDD + "</title> \n<script type=\"text/javascript\" src=\"https://canvasjs.com/assets/script/jquery-1.11.1.min.js\"></script>\n<script type=\"text/javascript\" src=\"https://canvasjs.com/assets/script/jquery.canvasjs.min.js\"></script>\n<script type=\"text/javascript\">\n$(function() {\n\t$(\".chartContainer\").CanvasJSChart({\n\t\ttitle: {\n\t\t\ttext: \"" + src + " -----> " + dest + " (" + myYYMMDD + ") }\"\n\t\t},\n\t\taxisY: {\n\t\t\ttitle: \"latency in ms\",\n\t\t\tincludeZero: false\n\t\t},\n\t\taxisX: {\n\t\t\tinterval: 1\n\t\t},\n\t\tdata: [\n\t\t{\n\t\t\ttype: \"line\", //try changing to column, area\n\t\t\ttoolTipContent: \"{label}: {y} ms\",\n\t\t\tdataPoints: [\n                //fetched data from file goes here\n                ";
    var path = src + "-" + dest + "." + myYYMMDD + ".txt";
    try {
        if (fs.existsSync(path)) {
            // file exists
            var data = fs.readFileSync(path, "UTF-8").toString();
            // split the contents by new line
            var lines = data.split(/\r?\n/);
            var last300 = []; // show 5*60 samples - four hours of medianhistory and 1 minute of second by second
            // print all lines
            lines.forEach(function (line) {
                last300.push(line);
                if (last300.length > 300)
                    // 12 5 minute samples=1 last 1 hour of second by second data
                    last300.shift(); // drop first entries
            });
            txt += last300.join("\n");
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
    return txt;
}
exports.grapher = grapher;
function grapherStoreOwls(src, dst, dataPoints) {
    //var d = new Date();
    //var sampleLabel=d.getHours()+":"+d.getMinutes()+":"+d.getSeconds();
    var filename = src + "-" + dst + "." + lib_1.YYMMDD() + ".txt";
    //console.log("storeOwl() About to store sample "+owl+" in ("+filename+") owl measurement:"+sample); //INSTRUMENTATION POINT
    //if (owl > 2000 || owl < 0) {
    //    console.log("storeOWL(src=" + src + " dst=" + dst + " owl=" + owl + ") one-way latency out of spec: " + owl + "STORING...0");
    //    owl = 0;
    //}
    //var logMsg = "{y:" + owl + "},\n";
    //    fs.writeFile(filename, dataPoints, (err) => {
    fs.appendFile(filename, dataPoints + ',', function (err) {
        if (err)
            throw err;
    });
}
exports.grapherStoreOwls = grapherStoreOwls;
