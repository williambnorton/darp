#!/bin/bash
#		builddarp.bash - faster than building a docker (5 min) this compiles and pushes
#	so when first node started (called a 'Genesis' node) launches new SW
#	all nodes in the pulsegroup hear about it and reloads to update
#	This ensures all nodes in a pulse group are always running the latest SW so 
#	fewer incompaitibilities to wirry about
echo `date` compiling typescript into javascript 
rm Build.??????.????
find . -name '*.pid' -delete
MESSAGE="Version 0.1 - Moving to platform layer model- messageBus on Redis,stats calc out of browser"
date>"Build."`date +%y%m%d.%H%M`
echo 'var version="'`ls Build*`'";'>Version.js
ls -l Build.*

#tsc config/config && tsc express/express && tsc pulser/pulser && tsc handlepulse/handlepulse && git add . && git commit -m "$MESSAGE + stabliizing base platform for launch" && git push

#
#	The same flow should work on boot darp - simple extensible loop
#
for darpModule in messagelayer config express pulser handlepulse processpulse wireguard
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
