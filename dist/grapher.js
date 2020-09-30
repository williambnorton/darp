"use strict";
exports.__esModule = true;
var lib_1 = require("./lib");
var fs = require("fs");
function grapher(src, dest) {
    var myYYMMDD = lib_1.YYMMDD();
    var txt = "\n<!DOCTYPE HTML>\n<meta http-equiv=\"refresh\" content=\"60\">\n<html>\n<head>\n<title>" + src + "-" + dest + " " + myYYMMDD + "</title> \n<script type=\"text/javascript\" src=\"https://canvasjs.com/assets/script/jquery-1.11.1.min.js\"></script>\n<script type=\"text/javascript\" src=\"https://canvasjs.com/assets/script/jquery.canvasjs.min.js\"></script>\n<script type=\"text/javascript\">\n$(function() {\n\t$(\".chartContainer\").CanvasJSChart({\n\t\ttitle: {\n\t\t\ttext: \"" + src + " -> " + dest + " " + myYYMMDD + " \"\n\t\t},\n\t\taxisY: {\n\t\t\ttitle: \"latency in ms\",\n\t\t\tincludeZero: false\n\t\t},\n\t\taxisX: {\n\t\t\tinterval: 1\n\t\t},\n\t\tdata: [\n\t\t{\n\t\t\ttype: \"line\", //try changing to column, area\n\t\t\ttoolTipContent: \"{label}: {y} ms\",\n\t\t\tdataPoints: [\n                //fetched data from file goes here\n                ";
    //    var path = src + "-medians" + myYYMMDD + ".txt";
    var path = "../" + src + "-" + dest + ".medianHistory.json"; //once a minute peel off the median history and store for later grapher calls
    console.log("grapher(): src=" + src + " - " + dest + " reading path=" + path);
    try {
        if (fs.existsSync(path)) {
            // file exists
            var data = fs.readFileSync(path, "UTF-8").toString();
            // split the contents by new line
            var dataPoints = JSON.parse(data);
            //console.log(`grapher() ${path} exists data=${data}`);
            var x = 0;
            var t = new Date();
            var timeStamp = t.getTime();
            console.log("grapher(): dataPoint count=" + dataPoints.length);
            //We know the last 60 are second-by second measures
            //Before that are median measures
            for (var d in dataPoints) {
                if (dataPoints.length - x < 60 * 5)
                    txt += "{ x : " + ++x + ", y : " + dataPoints[d] + " },";
            }
            //            var last300: string[] = []; // show 5*60 samples - four hours of medianhistory and 1 minute of second by second
            //            // print all lines
            //            lines.forEach((line: string) => {
            //                last300.push(line);
            //                if (last300.length > 300)
            //                    // 12 5 minute samples=1 last 1 hour of second by second data
            //                    last300.shift(); // drop first entries
            //            });
            //            txt += last300.join("\n");
            //console.log(`going to send txt=${txt}`);
        }
        else {
            console.log("could not find live pulseGroup graph data from " + path);
            txt += "/* grapher() could not find live pulseGroup graph data from " + path + " */";
        }
    }
    catch (err) {
        return console.error(err);
    }
    txt += "]\n\t\t}\n\t\t]\n\t});\n});\n</script>\n</head>\n<body>\n<div class=\"chartContainer\" style=\"height: 300px; width: 100%;\"></div>\n</body>\n</html>\n";
    console.log("grapher returning txt=" + txt);
    return txt;
}
exports.grapher = grapher;
function grapherStoreOwls(src, dst, dataPoints) {
    return; //This created 5MB of measures! Use the cached last medians instead for graphing, and raw pulses 
    //var d = new Date();
    //var sampleLabel=d.getHours()+":"+d.getMinutes()+":"+d.getSeconds();
    var filename = "../" + src + "-" + dst + "." + lib_1.YYMMDD() + ".txt"; //filepath assumes running in /dist folder
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
