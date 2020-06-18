#!/bin/bash
#   buildDocker.bash - build a new docker - takes 5 minutes
#
echo `date` Building darp codebase 
#cd darp
./builddarp.bash 
echo `date` Building the docker container
cd ..
docker build --no-cache -t williambnorton/darp . && docker push williambnorton/darp

cd darp
echo `date` Built docker `ls Build*`
echo `date` Finished $0 
