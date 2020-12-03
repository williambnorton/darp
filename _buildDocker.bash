#!/bin/bash
#   _builddocker.bash - build a new docker - takes 5 minutes
#
rm Docker.??????.????
date>"Docker."`date +%y%m%d.%H%M`
ls -l Docker.*
DOCKERVERSION=`ls Docker.[0-9].*`

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
echo `date` New docker $DOCKERVERSION running DARP `ls Docker.[0-9].*`
echo `date` Finished $0 Force genesis node to reload SW and the group will follow

#./builddarp.bash              ####This deals with a timing issue - nodes keep reloading trying to get same SW as genesis, but it is not possible
