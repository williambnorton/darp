#!/bin/bash
#Note that you must run this build from the darp directory
echo `date` compiling typescript into javascript 
rm Build.??????.????
find . -name '*.pid' -delete
MESSAGE="Version 1.0 - basic pulses and instrumentation of OWL Matrix in Redis"
date>"Build."`date +%y%m%d.%H%M`
ls -l "Build."`date +%y%m%d.%H%M`

#tsc config/config && tsc express/express && tsc pulser/pulser && tsc handlepulse/handlepulse && git add . && git commit -m "$MESSAGE + stabliizing base platform for launch" && git push

#
#	The same flow should work on boot darp - simple extensible loop
#
for darpModule in config express pulser handlepulse processpulse wireguard
do
	if [ $darpModule/$darpModule.ts -nt $darpModule/$darpModule.js ]; then
		cd $darpModule
		tsc $darpModule
		cd ..
	fi
done

git add *.bash
git add . && git commit -m "$MESSAGE + stabliizing base platform for launch" && git push
echo `date` Completed compiles + git push for `ls Build*`
