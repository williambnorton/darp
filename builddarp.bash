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
MESSAGE="DARP Protocol with matrix and basic data graphs"
date>"Build."`date +%y%m%d.%H%M`
ls -l Build.*

#
#	The same flow should work on boot darp - simple extensible loop
#
#tsc - updates were not getting through
cd src;tsc *.ts;mv *.js ../dist/; cd ..

git add *.bash
#git add . && git commit -m "$MESSAGE + " && git pull && git push
git add . && git commit -m "$MESSAGE + " && git pull && git push 
echo `date` Completed compiles + git push for `ls Build*`

if [ $# -gt 1 ]; then
docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q)
(sleep 30;echo `date` Starting ~/wireguard wgwatch; cd ~/wireguard; ~/wireguard/wgwatch.bash)& docker run --rm -p 65013:65013 -p 65013:65013/udp -p 80:80/tcp -p 80:80/udp -v ~/wireguard:/etc/wireguard  -e "GENESIS=71.202.2.184"  -e "GENESISPORT=65013" -e "HOSTNAME="`hostname`  -e "WALLET=auto" -it williambnorton/darp:latest 


fi
