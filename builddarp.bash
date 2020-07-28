#!/bin/bash
#		builddarp.bash - faster than building a docker (5 min) this compiles and pushes
#	so when first node started (called a 'Genesis' node) launches new SW
#	all nodes in the pulsegroup hear about it and reloads to update
#	This ensures all nodes in a pulse group are always running the latest SW so 
#	fewer incompaitibilities to wirry about

pwd |grep noia
if [ $? -ne 0 ]; then
	echo $0 can not run from a non-development area
	exit 86
fi
echo `date` compiling typescript into javascript 
rm Build.??????.????
find . -name '*.pid' -delete
MESSAGE="DARP Protocol encrypted mesh w/basic data graphs"

date>"Build."`date +%y%m%d.%H%M`
ls -l Build.*

#
#	The same flow should work on boot darp - simple extensible loop
#
#tsc - updates were not getting through
cd src;tsc *.ts;mv *.js ../dist/; cd ..

git add *.bash
#git add . && git commit -m "$MESSAGE + " && git pull && git push
echo `date` Before git push ls: `ls -l`
git add . && git commit -m "$MESSAGE + " && git pull && git push
echo `date` Completed compiles + git push for `ls Build*`
