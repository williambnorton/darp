#!/bin/bash
#Note that you must run this build from the darp directory
echo `date` compiling typescript into javascript 
rm Build.??????.????
find . -name '*.pid' -delete
MESSAGE="Getting Basic Instant Overlay"
date>"Build."`date +%y%m%d.%H%M`
ls -l "Build."`date +%y%m%d.%H%M`

#tsc config/config && tsc express/express && tsc pulser/pulser && tsc handlepulse/handlepulse && git add . && git commit -m "$MESSAGE + stabliizing base platform for launch" && git push

for file in config express pulser handlepulse wireguard
do
	if [ $file/$file.ts -nt $file/$file.js ]; then
		cd $file
		tsc $file
		cd ..
	fi
done
git add *.bash
git add . && git commit -m "$MESSAGE + stabliizing base platform for launch" && git push
echo `date` Completed compiles + git push for `ls Build*`
