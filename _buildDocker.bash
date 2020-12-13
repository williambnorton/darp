#!/bin/bash
#   _builddocker.bash - build a new docker - takes 5 minutes
#
rm Docker.??????.????
date > "Docker."`date +%y%m%d.%H%M`
ls -l Docker.*
DOCKERVERSION=`ls Docker.*`
START=`date +%s`

echo `date` $0 Building darp docker $DOCKERVERSION
./builddarp.bash 
if [ $? -ne 0 ]; then
	echo `date` builddarp failed
	exit -1
fi

npm install && npm update
echo `date` Building the docker container
#
#	this will push the :testnet :latest :Docker.YYMMDD.HHMM
#
docker tag williambnorton/darp:$DOCKERVERSION

#docker tag williambnorton/darp:latest

docker build --no-cache -t williambnorton/darp:$DOCKERVERSION . && docker push williambnorton/darp:$DOCKERVERSION
docker push williambnorton/darp:latest
#docker build --no-cache -t williambnorton/darp:$DOCKERVERSION -t williambnorton/darp:testnet -t williambnorton/darp:latest . && docker push williambnorton/darp
#docker build --no-cache -t williambnorton/darp:$DOCKERVERSION . && docker push williambnorton/darp:$DOCKERVERSION
END=`date +%s`
DELTA=`expr $END - $START`
DELTA_MIN=`expr $DELTA / 60`
echo `date` New docker $DOCKERVERSION running DARP `ls Docker.*`
echo `date` Finished $0 build docker took $DELTA_MIN minutes to make this $DOCKERVERSION docker

#./builddarp.bash              ####This deals with a timing issue - nodes keep reloading trying to get same SW as genesis, but it is not possible
say "[[volm 0.05]] Bill, the docker build is complete. it took $DELTA_MIN minutes to complete."







#ssh -i ~/PEM/AWS-US-WEST-1A.pem ubuntu@52.53.222.151 '(sleep 30;~/wireguard/wgwatch.bash)& docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q); docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname`   -e "WALLET=auto"   -d williambnorton/darp:$DOCKERVERSION ' &
#say "[[volm 0.2]]  I am currently relaunching the primary genesis node"


#ssh -i ~/PEM/AWS-US-WEST-1A.pem ubuntu@52.53.222.151 'curl http://52.53.222.151:65013/darp.bash | bash '

