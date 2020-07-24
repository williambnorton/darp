#!/bin/bash
#			darpwatch.bash - forever loop around fetching a new docker
#
#  
echo `date` starting noia docker forever script - this is removing ALL existing dockers to start fresh

while :
do
	docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q);	
	echo `date` Starting NOIA docker;docker run --rm -p 65013:65013 -p 65013:65013/udp -v ~/wireguard:/etc/wireguard  -e "GENESIS=71.202.2.184" . -e "GENESISPORT=65013" -e "HOSTNAME="`hostname`  -e "WALLET=auto" -it williambnorton/darp:latest 
	echo `date` "Docker exitted - rc=$rc sleeping 15"
	sleep 15
done








