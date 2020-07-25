#!/bin/bash
#
#	darpwatch - forever loop making sure our docker is running and running wg-quick when config changes
#
chmod 755 ~/wireguard
while :
do
	./wgwatch.bash &
    docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q);
        echo `date` Starting NOIA docker;
		docker run  -p 65013:65013 -p 65013:65013/udp -v ~/wireguard:/etc/wireguard  -e "GENESIS=$GENESIS"  -e "GENESISPORT=$GENESISPORT" -e "HOSTNAME="`hostname`  -e "WALLET=auto" -it williambnorton/darp:latest
        echo `date` "Docker exitted - rc=$? sleeping 15"
        sleep 15
done
