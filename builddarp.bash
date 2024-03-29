#!/bin/bash
#		builddarp.bash - faster than building a docker (5 min) this compiles and pushes
#	so when first node started (called a 'Genesis' node) launches new SW
#	all nodes in the pulsegroup hear about it in a pulse and reload to update
#	This ensures all nodes in a pulse group are always running the latest SW so 
#	fewer incompaitibilities to worry about

#if you are in a noia directory you can build and push the code to your own repo
#otherwise, this script does not ap[ply to running nodes - maybe don't put it in docker?
pwd |grep Development
if [ $? -ne 0 ]; then
	echo $0 can not run from a non-development area
	exit 86
fi

echo `date` $0 compiling typescript into javascript 
rm Build.??????.????
find . -name '*.pid' -delete
MESSAGE="DARP Protocol Tinkering"
START=`date +%s`

date>"Build."`date +%y%m%d.%H%M`
BUILD_TAG=`ls Build.*`
echo `date` BUILDTAG=$BUILD_TAG
ls -l Build.*
rm -f subagents/rtt/ip*

#
#
#	The same flow should work on boot darp - simple extensible loop
#
# build then copy compiled code into dist directory
cd src;tsc *.ts;mv *.js ../dist/; cd ..


echo EXITTING NOW
exit 3

git add . && git commit -m "$MESSAGE" && git pull && git push 

git push origin :latest

git tag -f latest
git tag $BUILD_TAG
git push origin --tags

echo `date`" Completed git push for latest and $BUILD_TAG "

END=`date +%s`
DELTA=`expr $END - $START`
DELTA_MIN=`expr $DELTA / 60`
echo `date` Building New `ls Build*` DARP for Docker `ls Docker.*` took $DELTA seconds

#
#	run code on genesis node after build, effectively deploying globally
#
if [ $# -eq 0 ]; then
	say "[[ volm 0.10 ]] Bill, build DARP reloading network"
	curl http://52.53.222.151:65013/reload 2>&1 >/dev/null
fi
exit 0
