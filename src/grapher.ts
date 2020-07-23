import { YYMMDD } from './lib';
import fs = require('fs');


export function grapher(src:string,dest:string) {
    //console.log(`grapher(): src=${src} det=${dest}`);

    var txt=`
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
			text: "${src}-${dest} ${new Date()}"
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

    var myYYMMDD=YYMMDD();     
    var path=src+"-"+dest+"."+myYYMMDD+'.txt';
    try {
        if (fs.existsSync(path)) {
                //file exists
            const data=fs.readFileSync(path, 'UTF-8').toString();
                // split the contents by new line
            const lines = data.split(/\r?\n/);

            var last300:string[]=[];  //store 600 samples - ten minutes for each peer
            // print all lines
            lines.forEach((line:string) => {
                //console.log("*"+line);
                last300.push(line);
                if (last300.length>300)  //12 5 minute samples=1 last 1 hour of second by second data
                    last300.shift();  //drop first entries
            });
            txt+=last300.join("\n");
            //console.log(`last60=${dump(last60)}`);

            //save only last 60 samples of raw data'*/
            fs.writeFile(path, last300.join("\n"), (err) => {
                if (err) return console.log(err);
            });
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
    fs.appendFile(filename, sample, (err) => {
        if (err) throw err;
        //console.log('Saved!');
    });
}

export function grapherStoreOwls(src:String,dst:String,dataPoints:String) {
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
    fs.appendFile(filename, sample, (err) => {
        if (err) throw err;
        //console.log('Saved!');
    });
}