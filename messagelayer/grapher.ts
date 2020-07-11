import {   dump, now, ts, YYMMDD } from '../lib/lib';

export function grapher(src:string,dest:string) {
    console.log(`grapher(): src=${src} det=${dest}`);
var txt=`
<!DOCTYPE HTML>
<html>
<head>
<title>jQuery Line Chart</title> 
<script type="text/javascript" src="https://canvasjs.com/assets/script/jquery-1.11.1.min.js"></script>
<script type="text/javascript" src="https://canvasjs.com/assets/script/jquery.canvasjs.min.js"></script>
<script type="text/javascript">
$(function() {
	$(".chartContainer").CanvasJSChart({
		title: {
			text: "${src}-${dest} latency (in ms)"
		},
		axisY: {
			title: "latency in ms",
			includeZero: false
		},
		axisX: {
			interval: 1
		},
		data: [
		{
			type: "line", //try changing to column, area
			toolTipContent: "{label}: {y} ms",
			dataPoints: [
                //fetch data from file
                `;
    
    
                var fs = require("fs");
    var myYYMMDD=YYMMDD();     
    var path=src+"-"+dest+"."+myYYMMDD+'.txt';
    try {
        if (fs.existsSync(path)) {
                //file exists
                        txt+=fs.readFileSync(path);
                        //console.log(`found / data file ${path}:${txt}`);
        } else {
            console.log("could not find live pulseGroup graph data from "+path);
            txt +=`/* could not find live pulseGroup graph data from ${path} */`
        }
    } catch(err) {
                return console.error(err)
    }


    txt+=`]
		}
		]
	});
});
</script>
</head>
<body>
<div class="chartContainer" style="height: 300px; width: 100%;"></div>
</body>
</html>
`
//console.log(`txt=${txt}`);
return txt
}

//
//  grapherStoreOwl - store the owl sample in a way that can be graphed by the function above
//
export function grapherStoreOwl(src:String,dst:String,owl:Number) {
    var fs = require('fs');
    var d = new Date();
    var sampleLabel=d.getHours()+":"+d.getMinutes()+":"+d.getSeconds();
    var filename = src + '-' + dst + '.' + YYMMDD() + '.txt';
    var sample = `{ label: "${sampleLabel}", y: ${owl} },\n`;
    //console.log("storeOwl() About to store sample "+owl+" in ("+filename+") owl measurement:"+sample); //INSTRUMENTATION POINT

    //if (owl > 2000 || owl < 0) {
        //console.log("storeOWL(src=" + src + " dst=" + dst + " owl=" + owl + ") one-way latency out of spec: " + owl + "STORING...0");
    //
        //owl = 0;
    //}
    //var logMsg = "{y:" + owl + "},\n";
    fs.appendFile(filename, sample, function(err) {
        if (err) throw err;
        //console.log('Saved!');
    });
}