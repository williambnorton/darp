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
echo $1 | grep AWS >/dev/null
if [ $? -eq 0 ]; then
	SPINUPORDER=`cat publicrelays.config|grep -v '#' | grep $1 | grep -v 52.53.222.151`
	MY_IP=`curl ifconfig.io`
	MY_GEO=`hostname`
	MY_ENTRY=`echo $MY_GEO:$MY_IP`
	echo MY_ENTRY=$MY_ENTRY
	SPINUPORDER=`echo AWS-US-WEST-1:52.53.222.151 $MY_ENTRY $SPINUPORDER`	
	echo `date` SPINNING UP AWS with AWS-US-WEST as Genesis node $SPINUPORDER
else
	SPINUPORDER=`cat publicrelays.config|grep -v '#' | grep $1 | grep -v 52.53.222.151`
	echo `date` SPINNING UP non-AWS node

fi
for node in $SPINUPORDER 
do
	#echo echo $node
	name=`echo $node|awk -F: '{print $1}'`
	ip=`echo $node|awk -F: '{print $2}'`
	port=65013

	if [ "$ip" != "" -a "$port" != "" -a "$name" != "" ]; then
		echo $name | grep AWS >/dev/null
		if [ $? -eq 0 ]; then
			echo $0 | grep start >/dev/null   #Is this a startAll.bash or stopAll.bash ?
			if [ $? -eq 0 ]; then
				echo `date` "$0 Launching on $name $ip:$port"
				#echo  `date` "LAUNCHING GENESIS NODE /tmp/$$ ~/scripts/USR1 ubuntu@$ip $name $ip $port & "
				#~/scripts/USR1 ubuntu@$ip $name $ip $port  &
				#(~/scripts/USR1 ubuntu@$ip $name $ip $port 2>&1 ) >>/tmp/x  &
				#echo  `date` SSH IN AND BOOTING DOCKERa $name $ip $port

				#echo FIRST GENESIS NODE 
				#echo FIRST GENESIS NODE >/tmp/x
				#ssh -i ~/PEM/$name.pem ubuntu@$ip '(sleep 30; docker run -p 80:80 -d williambnorton/srwan ) & (sleep 30; docker run --network="host" --restart=on-failure:10 --cap-add=NET_ADMIN --cap-add=SYS_MODULE -v /var/run/docker.sock:/var/run/docker.sock:ro --device /dev/net/tun:/dev/net/tun --name=syntropy-agent -e SYNTROPY_NETWORK_API=docker -e SYNTROPY_API_KEY=YUeDgQNAg4qbOSL0kA2gIUyiehoB1kLC -d syntropynet/agent:stable ) & (sleep 30;~/wireguard/wgwatch.bash) &  docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q); docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname`   -e "WALLET=auto"   -it williambnorton/darp &' &
			#	ssh -i ~/PEM/$name.pem ubuntu@$ip '(sudo apt install -y docker.io 2>&1) >/dev/null;(sleep 30; docker run -p 80:80 -d williambnorton/srwan ) & (sleep 30; docker run --network="host" --restart=on-failure:10 --cap-add=NET_ADMIN --cap-add=SYS_MODULE -v /var/run/docker.sock:/var/run/docker.sock:ro --device /dev/net/tun:/dev/net/tun --name=syntropy-agent -e SYNTROPY_NETWORK_API=docker -e SYNTROPY_API_KEY=YUeDgQNAg4qbOSL0kA2gIUyiehoB1kLC -d syntropynet/agent:stable ) & (sleep 30;~/wireguard/wgwatch.bash) &  docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q); docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname`   -e "WALLET=auto"   -it williambnorton/darp &' &
				#echo `date` "$0 .......... launching $name $ip:$port ....................."
				#ssh -i ~/PEM/$name.pem ubuntu@$ip '(sudo apt install -y docker.io 2>&1) >/dev/null; \
				#	sudo docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q); \
				#	sudo docker run -p 80:80 -d williambnorton/srwan & \
				#	sudo docker run --network="host" --restart=on-failure:10 --cap-add=NET_ADMIN --cap-add=SYS_MODULE -v /var/run/docker.sock:/var/run/docker.sock:ro --device /dev/net/tun:/dev/net/tun --name=syntropy-agent -e SYNTROPY_NETWORK_API=docker -e SYNTROPY_API_KEY=YUeDgQNAg4qbOSL0kA2gIUyiehoB1kLC -d syntropynet/agent:stable & \
				#	(sleep 30;~/wireguard/wgwatch.bash) & \
				#	docker run --rm -d -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname`   -e "WALLET=auto"   -it williambnorton/darp &' &


				echo Making sure $name has docker installed and no docker images or docker processes are running
				ssh -i ~/PEM/$name.pem ubuntu@$ip '(sudo apt install -y docker.io 2>&1) >/dev/null;sudo docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q);'
				echo Making sure $name has docker starting darp docker
				ssh -i ~/PEM/$name.pem ubuntu@$ip 'docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname`   -e "WALLET=auto"   -d williambnorton/darp '& 
				echo Making sure $name has docker installing SRWAN
				ssh -i ~/PEM/$name.pem ubuntu@$ip 'sudo docker run -d -p 80:80 -d williambnorton/srwan ' &
				echo Making sure $name has docker installing Syntropy Agent
				ssh -i ~/PEM/$name.pem ubuntu@$ip 'sudo docker run -d --network="host" --restart=on-failure:10 --cap-add=NET_ADMIN --cap-add=SYS_MODULE -v /var/run/docker.sock:/var/run/docker.sock:ro --device /dev/net/tun:/dev/net/tun --name=syntropy-agent -e SYNTROPY_NETWORK_API=docker -e SYNTROPY_API_KEY=YUeDgQNAg4qbOSL0kA2gIUyiehoB1kLC -d syntropynet/agent:stable ' & 
				echo Making sure $name has docker installing wireguard watch
				ssh -i ~/PEM/$name.pem ubuntu@$ip '(sleep 30;~/wireguard/wgwatch.bash) '&  
				#  docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q);
				#echo "ssh -i ~/PEM/$name.pem ubuntu@$ip" '(sudo apt install -y docker.io 2>&1) >/dev/null;(sleep 30; docker run -p 80:80 -d williambnorton/srwan ) & (sleep 30; docker run --network="host" --restart=on-failure:10 --cap-add=NET_ADMIN --cap-add=SYS_MODULE -v /var/run/docker.sock:/var/run/docker.sock:ro --device /dev/net/tun:/dev/net/tun --name=syntropy-agent -e SYNTROPY_NETWORK_API=docker -e SYNTROPY_API_KEY=YUeDgQNAg4qbOSL0kA2gIUyiehoB1kLC -d syntropynet/agent:stable ) & (sleep 30;~/wireguard/wgwatch.bash) &  docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q); docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname`   -e "WALLET=auto"   -it williambnorton/darp &' &
				
					#sleep 90
				#echo `date` SLEEPING...
				if [ "$ip" == "52.53.222.151" ]; then
					echo `date` "Sleeping 15 seconds lfor Genesis node start up"
					sleep 15
				fi
			else 
				echo  `date` "STOPPING -> REBOOTING NODE ubuntu@$ip $name $ip $port & "
	#				echo ~/scripts/USR2 ubuntu@$ip $name $ip $port 
				#~/scripts/USR2 ubuntu@$ip $name $ip $port >>/tmp/x & 
				ssh -i ~/PEM/$name.pem ubuntu@$ip 'sudo reboot'
			fi
		else 
			echo $0 | grep start >/dev/null   #Is this a startAll.bash or stopAll.bash ?
			if [ $? -eq 0 ]; then
				echo `date` AZURE AZURE AZURE AZURE Launching ssh into Azure node AZURE AZURE AZURE AZURE AZURE AZURE
				echo `date` "$0 Launching Azure on $name $ip:$port"
				#ssh ubuntu@$ip 
				echo Making sure $name has docker installed and no docker images or docker processes are running
				ssh  ubuntu@$ip '(sudo apt install -y docker.io 2>&1) >/dev/null;sudo docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q);'
				echo Making sure $name has docker starting darp docker
				ssh ubuntu@$ip 'docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname`   -e "WALLET=auto"   -d williambnorton/darp '& 
				echo Making sure $name has docker installing SRWAN
				ssh ubuntu@$ip 'sudo docker run -d -p 80:80 -d williambnorton/srwan ' &
				echo Making sure $name has docker installing Syntropy Agent
				ssh ubuntu@$ip 'sudo docker run -d --network="host" --restart=on-failure:10 --cap-add=NET_ADMIN --cap-add=SYS_MODULE -v /var/run/docker.sock:/var/run/docker.sock:ro --device /dev/net/tun:/dev/net/tun --name=syntropy-agent -e SYNTROPY_NETWORK_API=docker -e SYNTROPY_API_KEY=YUeDgQNAg4qbOSL0kA2gIUyiehoB1kLC -d syntropynet/agent:stable ' & 
				echo Making sure $name has docker installing wireguard watch
				ssh  ubuntu@$ip '(sleep 30;~/wireguard/wgwatch.bash) '&  
			else 
				echo  `date` "STOPPING -> REBOOTING NODE ubuntu@$ip $name $ip $port & "
	#				echo ~/scripts/USR2 ubuntu@$ip $name $ip $port 
				#~/scripts/USR2 ubuntu@$ip $name $ip $port >>/tmp/x & 
				ssh  ubuntu@$ip 'sudo reboot'
			fi
		fi
	fi
done
