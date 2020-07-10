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
			toolTipContent: "{label}: {y} mm",
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
                        console.log(`found graph data file ${path}:${txt}`);
        } else 
            console.log("could not find live pulseGroup graph data from "+path);
    } catch(err) {
                return console.error(err)
    }


                txt+=`
				{ label: "",  y: 5.28 },

			]
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
console.log(`txt=${txt}`);
return txt
}