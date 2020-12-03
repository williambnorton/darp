#!/bin/bash
#		builddarp.bash - faster than building a docker (5 min) this compiles and pushes
#	so when first node started (called a 'Genesis' node) launches new SW
#	all nodes in the pulsegroup hear about it and reloads to update
#	This ensures all nodes in a pulse group are always running the latest SW so 
#	fewer incompaitibilities to wirry about

#if you are in a noia directory you can build and push the code to your own repo
#otherwise, this script does not ap[ply to running nodes - maybe don't put it in docker?
pwd |grep noia
if [ $? -ne 0 ]; then
	echo $0 can not run from a non-development area
	exit 86
fi

echo `date` $0 compiling typescript into javascript 
rm Build.??????.????
find . -name '*.pid' -delete
MESSAGE="DARP Protocol with matrix and basic data graphs"
date>"Build."`date +%y%m%d.%H%M`
BUILD_TAG=`ls Build.*`
ls -l Build.*
rm -f subagents/rtt/ip*

#
#	The same flow should work on boot darp - simple extensible loop
#
#tsc - updates were not getting through
cd src;tsc *.ts;mv *.js ../dist/; cd ..

git add *.bash
#git add . && git commit -m "$MESSAGE + " && git pull && git push
git tag $BUILD_TAG
#git add . && git commit -m "$MESSAGE + " && git pull && git push 
git add . && git commit -m "$MESSAGE + " && git pull && git push 
git push origin
echo `date` Completed compiles + git push for `ls Build*`

#
#	run code on genesis node after build, effectively deploying globally
#
if [ $# -gt 0 ]; then
	echo `date` Using run optio to launch the code on genesis node also 
	docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q)
	#(sleep 30;echo `date` Starting ~/wireguard wgwatch; cd ~/wireguard; ~/wireguard/wgwatch.bash)& docker run --rm -p 65013:65013 -p 65013:65013/udp -p 80:80/tcp -p 80:80/udp -v ~/wireguard:/etc/wireguard  -e "GENESIS=71.202.2.184"  -e "GENESISPORT=65013" -e "HOSTNAME="`hostname`  -e "WALLET=auto" -it williambnorton/darp:latest 
	docker run --rm -p 65013:65013 -p 65013:65013/udp -p 80:80/tcp -p 80:80/udp -v ~/wireguard:/etc/wireguard  -e "GENESIS=71.202.2.184"  -e "GENESISPORT=65013" -e "HOSTNAME="`hostname`  -e "WALLET=auto" -it williambnorton/darp:latest 
fi

exit 0
