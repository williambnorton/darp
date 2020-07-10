"use strict";
exports.__esModule = true;
var lib_1 = require("../lib/lib");
function grapher(src, dest) {
    console.log("grapher(): src=" + src + " det=" + dest);
    var txt = "\n<!DOCTYPE HTML>\n<html>\n<head>\n<title>jQuery Line Chart</title> \n<script type=\"text/javascript\" src=\"https://canvasjs.com/assets/script/jquery-1.11.1.min.js\"></script>\n<script type=\"text/javascript\" src=\"https://canvasjs.com/assets/script/jquery.canvasjs.min.js\"></script>\n<script type=\"text/javascript\">\n$(function() {\n\t$(\".chartContainer\").CanvasJSChart({\n\t\ttitle: {\n\t\t\ttext: \"" + src + "-" + dest + " latency (in ms)\"\n\t\t},\n\t\taxisY: {\n\t\t\ttitle: \"latency in ms\",\n\t\t\tincludeZero: false\n\t\t},\n\t\taxisX: {\n\t\t\tinterval: 1\n\t\t},\n\t\tdata: [\n\t\t{\n\t\t\ttype: \"line\", //try changing to column, area\n\t\t\ttoolTipContent: \"{label}: {y} mm\",\n\t\t\tdataPoints: [\n                //fetch data from file\n                ";
    var fs = require("fs");
    var myYYMMDD = lib_1.YYMMDD();
    var path = src + "-" + dest + "." + myYYMMDD + '.txt';
    try {
        if (fs.existsSync(path)) {
            //file exists
            txt += fs.readFileSync(path);
            console.log("found graph data file " + path + ":" + txt);
        }
        else
            console.log("could not find live pulseGroup graph data from " + path);
    }
    catch (err) {
        return console.error(err);
    }
    txt += "\n\t\t\t\t{ label: \"\",  y: 5.28 },\n\n\t\t\t]\n\t\t}\n\t\t]\n\t});\n});\n</script>\n</head>\n<body>\n<div class=\"chartContainer\" style=\"height: 300px; width: 100%;\"></div>\n</body>\n</html>\n";
    console.log("txt=" + txt);
    return txt;
}
exports.grapher = grapher;
