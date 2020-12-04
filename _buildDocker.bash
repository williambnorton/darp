#!/bin/bash
#   _builddocker.bash - build a new docker - takes 5 minutes
#
rm Docker.??????.????
date > "Docker."`date +%y%m%d.%H%M`
ls -l Docker.*
DOCKERVERSION=`ls Docker.*`
START=`date +%s`
echo `date` Building darp docker $DOCKERVERSION
./builddarp.bash 
if [ $? -ne 0 ]; then
	echo `date` builddarp failed
	exit -1
fi

npm install && npm update
echo `date` Building the docker container
docker build --no-cache -t williambnorton/darp:$DOCKERVERSION -t williambnorton/darp:testnet . && docker push williambnorton/darp
#docker build --no-cache -t williambnorton/darp:$DOCKERVERSION . && docker push williambnorton/darp:$DOCKERVERSION
END=`date +%s`
DELTA=`expr $END - $START`
echo `date` New docker $DOCKERVERSION running DARP `ls Docker.*`
echo `date` Finished $0 build docker took `expr $DELTA / 60` minutes to make this $DOCKERVERSION docker

#./builddarp.bash              ####This deals with a timing issue - nodes keep reloading trying to get same SW as genesis, but it is not possible
