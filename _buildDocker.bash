#!/bin/bash
#   _builddocker.bash - build a new docker - takes 5 minutes
#
rm Docker.??????.????
date > "Docker."`date +%y%m%d.%H%M`
ls -l Docker.*
DARP_DOCKER_VERSION=`ls Docker.*`
START=`date +%s`

echo `date` $0 Building darp docker $DARP_DOCKER_VERSION START=$START
#./builddarp.bash --noRelaunch
# build darp fails from my MocOs which is old
#if [ $? -ne 0 ]; then
#	echo `date` builddarp failed
#	exit -1
#fi

#npm install && npm update
echo `date` Building the docker container
#
#	this will push the tagged image : Docker.YYMMDD.HHMM
#
#docker tag williambnorton/darp:$DARP_DOCKER_VERSION




docker build --no-cache -t williambnorton/darp:latest -t williambnorton/darp:$DARP_DOCKER_VERSION . && docker push williambnorton/darp:$DARP_DOCKER_VERSION
#docker push williambnorton/darp:latest




#docker build --no-cache -t williambnorton/darp:$DARP_DOCKER_VERSION -t williambnorton/darp:testnet -t williambnorton/darp:latest . && docker push williambnorton/darp
#docker build --no-cache -t williambnorton/darp:$DARP_DOCKER_VERSION . && docker push williambnorton/darp:$DARP_DOCKER_VERSION
END=`date +%s`
DELTA=`expr $END - $START`
DELTA_MIN=`expr $DELTA / 60`
echo `date` New docker $DARP_DOCKER_VERSION running DARP `ls Docker.*` START=$START END=$END DELTA=$DELTA
echo `date` Finished $0 build docker took $DELTA_MIN minutes to make this $DARP_DOCKER_VERSION docker

#./builddarp.bash              ####This deals with a timing issue - nodes keep reloading trying to get same SW as genesis, but it is not possible
say "[[ volm 0.05 ]] Bill, the docker build is complete. it took $DELTA_MIN minutes."


#ssh -i ~/PEM/AWS-US-WEST-1A.pem ubuntu@52.53.222.151 '(sleep 30;~/wireguard/wgwatch.bash)& docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q); docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname`   -e "WALLET=auto"   -d williambnorton/darp:$DARP_DOCKER_VERSION ' &
#echo 'About to kill previous dockers and remove the images'
#ssh -i ~/PEM/AWS-US-WEST-1A.pem ubuntu@52.53.222.151  'docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q);'

echo `date` About to launch SR-WAN docker $DARP_DOCKER_VERSION   #this is for the first node in the genesis list - static for now
#ssh -i ~/PEM/AWS-US-WEST-1A.pem ubuntu@52.53.222.151 "bash -c '(sleep 30;~/wireguard/wgwatch.bash)& nohup docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e HOSTNAME=AWS-US-WEST-1A -e WALLET=auto -d williambnorton/darp:$DARP_DOCKER_VERSION' " &

#echo `date` About to launch SR-WAN Instrumentation docker
echo `date` $0 $DARP_DOCKER_VERSION V=$V COMPLETE
V=`echo $DARP_DOCKER_VERSION|awk -F. '{ print $3 }'| sed 's/.\{1\}/& /g'`
export DARP_BASE_PORT=65013
if [ -f DARP_BASE_PORT ]; then
	export DARP_BASE_PORT=`cat DOCKER_BASE_PORT`
	echo Overiding DARP_BASE_PORT with $DARP_BASE_PORT
fi

echo "Start docker with ==>    docker run -p$DARP_BASE_PORT:$DARP_BASE_PORT williambnorton/darp:$DARP_DOCKER_VERSION"

#ssh -i ~/PEM/AWS-US-WEST-1A.pem ubuntu@52.53.222.151 


#ssh -i ~/PEM/AWS-US-WEST-1A.pem ubuntu@52.53.222.151 'curl http://52.53.222.151:65013/darp.bash | bash '

#
#	optionally ssh in and restart DARP on the FIRST_GENESIS node
#
#echo `date` Starting FIRST_ GENESIS node
#say "[[ volm 0.05 ]] Docker $V Complete. Starting DARP on U.S. West 1 A."
#ssh -i ~/PEM/AWS-US-WEST-1A.PEM  ubuntu@52.53.222.151 '(sleep 30; docker run -p 80:80 -d williambnorton/srwan ) & (sleep 30; docker run --network="host" --restart=on-failure:10 --cap-add=NET_ADMIN --cap-add=SYS_MODULE -v /var/run/docker.sock:/var/run/docker.sock:ro --device /dev/net/tun:/dev/net/tun --name=syntropy-agent -e SYNTROPY_NETWORK_API=docker -e SYNTROPY_API_KEY=YUeDgQNAg4qbOSL0kA2gIUyiehoB1kLC -d syntropynet/agent:stable ) & (sleep 30;~/wireguard/wgwatch.bash) &  docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q); docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname`   -e "WALLET=auto"   -d williambnorton/darp '



