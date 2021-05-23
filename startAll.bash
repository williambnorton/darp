#!/bin/bash
if [ $# -ne 1 ]; then
	echo "usage: $0 selector"
	echo 'leverage your neming convention here'
	echo "Example: startAll AWS-AP"
	echo "Example: startAll US"
	exit 1
fi

rm -f /tmp/x
#
#	start all Genesis nodes that match first
#
for node in `cat genesisnodelist.config | grep "$1" | grep -v '#'|grep ,GENESIS`   #don't allow name 'GENESIS' to be selected
do
	ip=`echo $node|awk -F, '{print $1}'`
	port=`echo $node|awk -F, '{print $2}'`
	name=`echo $node|awk -F, '{print $3}'`

	if [ -f /tmp/x ]; then

		echo `date` $0 working on $name
		if [ "$ip" != "" -a "$port" != "" -a "$name" != "" ]; then
			echo $0 | grep start >/dev/null   #Is this a startAll.bash or stopAll.bash ?
			if [ $? -eq 0 ]; then
				echo  `date` "LAUNCHING GENESIS NODE /tmp/$$ ~/scripts/USR1 ubuntu@$ip $name $ip $port & "
				~/scripts/USR1 ubuntu@$ip $name $ip $port  &
				#(~/scripts/USR1 ubuntu@$ip $name $ip $port 2>&1 ) >>/tmp/x  &
			else 
				echo  `date` "REBOOTING GENESIS NODE /tmp/$$ ~/scripts/USR1 ubuntu@$ip $name $ip $port & "
				echo ~/scripts/USR2 ubuntu@$ip $name $ip $port 
				~/scripts/USR2 ubuntu@$ip $name $ip $port >>/tmp/x & 
			fi
		fi
	else 
		echo FIRST GENESIS NODE 
		echo FIRST GENESIS NODE >/tmp/x
		 echo "ssh -i ~/PEM/$name.pem ubuntu@$ip" '(sleep 30; docker run -p 80:80 -d williambnorton/srwan ) & (sleep 30; docker run --network="host" --restart=on-failure:10 --cap-add=NET_ADMIN --cap-add=SYS_MODULE -v /var/run/docker.sock:/var/run/docker.sock:ro --device /dev/net/tun:/dev/net/tun --name=syntropy-agent -e SYNTROPY_NETWORK_API=docker -e SYNTROPY_API_KEY=YUeDgQNAg4qbOSL0kA2gIUyiehoB1kLC -d syntropynet/agent:stable ) & (sleep 30;~/wireguard/wgwatch.bash) &  docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q); docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname`   -e "WALLET=auto"   -it williambnorton/darp &'

	fi
	#sleep 5

done

#
#	start all non-Genesis nodes that match
#

for node in `cat genesisnodelist.config | grep "$1" | grep -v '#' | grep -v ,GENESIS`
do
	ip=`echo $node|awk -F, '{print $1}'`
	port=`echo $node|awk -F, '{print $2}'`
	name=`echo $node|awk -F, '{print $3}'`

	if [ "$ip" != "" -a "$port" != "" -a "$name" != "" ]; then
		echo $0 | grep start >/dev/null

		if [ $? -eq 0 ]; then
			echo  `date` "LAUNCHING non-genesis node /tmp/$$ ~/scripts/USR1 ubuntu@$ip $name $ip $port & "
			~/scripts/USR1 ubuntu@$ip $name $ip $port &
			#(~/scripts/USR1 ubuntu@$ip $name $ip $port 2>&1 ) >>/tmp/x  &
		else 
			echo  `date` "REBOOTING non-genesis node /tmp/$$ ~/scripts/USR1 ubuntu@$ip $name $ip $port & "
			echo ~/scripts/USR2 ubuntu@$ip $name $ip $port 
			~/scripts/USR2 ubuntu@$ip $name $ip $port &
		fi
	fi
	#sleep 5
done
