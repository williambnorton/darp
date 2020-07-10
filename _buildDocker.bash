#!/bin/bash
#   buildDocker.bash - build a new docker - takes 5 minutes
#
echo `date` Building darp codebase 
./builddarp.bash 
echo `date` Building the docker container
docker build --no-cache -t williambnorton/darp . # && docker push williambnorton/darp
echo `date` New docker `ls Build*`
echo `date` Finished $0 
