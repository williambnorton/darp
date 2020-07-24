#!/bin/bash
#
#	dockerwatch - forever loop enabling a forced docker refetch
#
while :
do
	if [ -f /tmp/wgwatch.pid ]; then
		kill `cat /tmp/wireguardwatch.pid`
		rm -f /tmp/wgwatch.pid
		sleep 1
	fi
	./wgwatch.bash &
		echo $$>/tmp/wgwatch.pid
        docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q);
        echo `date` Starting NOIA docker;
		docker run  -p 65013:65013 -p 65013:65013/udp -v ~/wireguard:/etc/wireguard  -e "GENESIS=71.202.2.184"  -e "GENESISPORT=65013" -e "HOSTNAME="`hostname`  -e "WALLET=auto" -it williambnorton/darp:latest
        echo `date` "Docker exitted - rc=$? sleeping 15"
        sleep 15
done
