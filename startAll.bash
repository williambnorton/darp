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
for node in `cat publicrelays.config|grep -v '#' | grep $1` 
do
	echo echo $node
	name=`echo $node|awk -F: '{print $1}'`
	ip=`echo $node|awk -F: '{print $2}'`
	port=65013
	echo `date` "$0 Launching on $name $ip:$port"
	if [ "$ip" != "" -a "$port" != "" -a "$name" != "" ]; then
		echo $0 | grep start >/dev/null   #Is this a startAll.bash or stopAll.bash ?
		if [ $? -eq 0 ]; then
				echo  `date` "LAUNCHING GENESIS NODE /tmp/$$ ~/scripts/USR1 ubuntu@$ip $name $ip $port & "
				~/scripts/USR1 ubuntu@$ip $name $ip $port  &
				#(~/scripts/USR1 ubuntu@$ip $name $ip $port 2>&1 ) >>/tmp/x  &
		else 
				echo  `date` "STOPPING -> REBOOTING GENESIS NODE /tmp/$$ ~/scripts/USR1 ubuntu@$ip $name $ip $port & "
#				echo ~/scripts/USR2 ubuntu@$ip $name $ip $port 
				~/scripts/USR2 ubuntu@$ip $name $ip $port >>/tmp/x & 
		fi
	fi

	echo  SSH IN AND BOOTING DOCKERa $name $ip $portZZ
		#echo FIRST GENESIS NODE 
		#echo FIRST GENESIS NODE >/tmp/x
	#ssh -i ~/PEM/$name.pem ubuntu@$ip '(sleep 30; docker run -p 80:80 -d williambnorton/srwan ) & (sleep 30; docker run --network="host" --restart=on-failure:10 --cap-add=NET_ADMIN --cap-add=SYS_MODULE -v /var/run/docker.sock:/var/run/docker.sock:ro --device /dev/net/tun:/dev/net/tun --name=syntropy-agent -e SYNTROPY_NETWORK_API=docker -e SYNTROPY_API_KEY=YUeDgQNAg4qbOSL0kA2gIUyiehoB1kLC -d syntropynet/agent:stable ) & (sleep 30;~/wireguard/wgwatch.bash) &  docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q); docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname`   -e "WALLET=auto"   -it williambnorton/darp &' &
#	ssh -i ~/PEM/$name.pem ubuntu@$ip '(sudo apt install -y docker.io 2>&1) >/dev/null;(sleep 30; docker run -p 80:80 -d williambnorton/srwan ) & (sleep 30; docker run --network="host" --restart=on-failure:10 --cap-add=NET_ADMIN --cap-add=SYS_MODULE -v /var/run/docker.sock:/var/run/docker.sock:ro --device /dev/net/tun:/dev/net/tun --name=syntropy-agent -e SYNTROPY_NETWORK_API=docker -e SYNTROPY_API_KEY=YUeDgQNAg4qbOSL0kA2gIUyiehoB1kLC -d syntropynet/agent:stable ) & (sleep 30;~/wireguard/wgwatch.bash) &  docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q); docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname`   -e "WALLET=auto"   -it williambnorton/darp &' &
	echo Making sure $name has docker installed
	ssh -i ~/PEM/$name.pem ubuntu@$ip '(sudo apt install -y docker.io 2>&1) >/dev/null;'
	echo Making sure $name has docker installing SRWAN
	ssh -i ~/PEM/$name.pem ubuntu@$ip 'sudo docker run -p 80:80 -d williambnorton/srwan &' 
	echo Making sure $name has docker installing Syntropy Agent
	ssh -i ~/PEM/$name.pem ubuntu@$ip 'sudo docker run --network="host" --restart=on-failure:10 --cap-add=NET_ADMIN --cap-add=SYS_MODULE -v /var/run/docker.sock:/var/run/docker.sock:ro --device /dev/net/tun:/dev/net/tun --name=syntropy-agent -e SYNTROPY_NETWORK_API=docker -e SYNTROPY_API_KEY=YUeDgQNAg4qbOSL0kA2gIUyiehoB1kLC -d syntropynet/agent:stable &' 
	echo Making sure $name has docker installing wireguard watch
	ssh -i ~/PEM/$name.pem ubuntu@$ip '(sleep 30;~/wireguard/wgwatch.bash) &'&  
	echo Making sure $name has docker starting darp docker
	ssh -i ~/PEM/$name.pem ubuntu@$ip 'docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname`   -e "WALLET=auto"   -it williambnorton/darp &' &
	#  docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q);
	#echo "ssh -i ~/PEM/$name.pem ubuntu@$ip" '(sudo apt install -y docker.io 2>&1) >/dev/null;(sleep 30; docker run -p 80:80 -d williambnorton/srwan ) & (sleep 30; docker run --network="host" --restart=on-failure:10 --cap-add=NET_ADMIN --cap-add=SYS_MODULE -v /var/run/docker.sock:/var/run/docker.sock:ro --device /dev/net/tun:/dev/net/tun --name=syntropy-agent -e SYNTROPY_NETWORK_API=docker -e SYNTROPY_API_KEY=YUeDgQNAg4qbOSL0kA2gIUyiehoB1kLC -d syntropynet/agent:stable ) & (sleep 30;~/wireguard/wgwatch.bash) &  docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q); docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname`   -e "WALLET=auto"   -it williambnorton/darp &' &
	
	echo `date` "Done launching $name $ip:$port"
		#sleep 90
	sleep 5

done
