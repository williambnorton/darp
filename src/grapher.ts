import { YYMMDD } from "./lib";
import fs = require("fs");

export function grapher(src: string, dest: string) {
    var txt = `
<!DOCTYPE HTML>
<meta http-equiv="refresh" content="60">
<html>
<head>
<title>${src}-${dest}</title> 
<script type="text/javascript" src="https://canvasjs.com/assets/script/jquery-1.11.1.min.js"></script>
<script type="text/javascript" src="https://canvasjs.com/assets/script/jquery.canvasjs.min.js"></script>
<script type="text/javascript">
$(function() {
	$(".chartContainer").CanvasJSChart({
		title: {
			text: "${src}-${dest} median of medians and last 60 seconds}"
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
                //fetched data from file goes here
                `;

    var myYYMMDD = YYMMDD();
    var path = src + "-" + dest + "." + myYYMMDD + ".txt";
    try {
        if (fs.existsSync(path)) {
            // file exists
            const data = fs.readFileSync(path, "UTF-8").toString();
            // split the contents by new line
            const lines = data.split(/\r?\n/);

            var last300: string[] = []; // show 5*60 samples - four hours of medianhistory and 1 minute of second by second
            // print all lines
            lines.forEach((line: string) => {
                last300.push(line);
                if (last300.length > 300)
                    // 12 5 minute samples=1 last 1 hour of second by second data
                    last300.shift(); // drop first entries
            });
            txt += last300.join("\n");
        } else {
            console.log("could not find live pulseGroup graph data from " + path);
            txt += `/* could not find live pulseGroup graph data from ${path} */`;
        }
    } catch (err) {
        return console.error(err);
    }

    txt += `]
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
`;
    return txt;
}

export function grapherStoreOwls(src: String, dst: String, dataPoints: String) {
    //var d = new Date();
    //var sampleLabel=d.getHours()+":"+d.getMinutes()+":"+d.getSeconds();
    var filename = src + "-" + dst + "." + YYMMDD() + ".txt";
    //console.log("storeOwl() About to store sample "+owl+" in ("+filename+") owl measurement:"+sample); //INSTRUMENTATION POINT
    //if (owl > 2000 || owl < 0) {
    //    console.log("storeOWL(src=" + src + " dst=" + dst + " owl=" + owl + ") one-way latency out of spec: " + owl + "STORING...0");
    //    owl = 0;
    //}
    //var logMsg = "{y:" + owl + "},\n";
//    fs.writeFile(filename, dataPoints, (err) => {
    fs.appendFile(filename, dataPoints, (err) => {  //appended asynchronously
            if (err) throw err;
    });
}
