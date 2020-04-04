#!/bin/bash
#			darpwatch.bash - forever loop 
# this goes on the host side to forever run docker
#  ***DE:ETE not sure if needed
echo `date` starting noia docker forever script - first remove existing dockers to start fresh
if [ $# -eq 1 ]; then
	# Delete all containers
	docker rm -f $(docker ps -a -q)
	# Delete all images
	docker rmi -f $(docker images -q)
fi

while :
do
	echo `date` Starting NOIA docker
	docker run -p 65013:65013 -p 65013:65013/udp -p 80:80/udp -v ~/wireguard:/etc/wireguard -e "HOSTNAME="`hostname` -e "WALLET=3BjDVN35cZdsRzyo4Q9VY3LFy1RteNBxPz" -it williambnorton/darp:latest /bin/bash
	rc=$?
	echo `date` $0 Restarting after docker exit with rc=$rc waiting 15 seconds...
	sleep 15
	 
#Delete these lines after development is done - do not delete other system dockers - be specific

done





