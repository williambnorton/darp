#!/bin/bash
#   _builddocker.bash - build a new docker - takes 5 minutes
#
echo `date` Building darp codebase 
./builddarp.bash 
npm install && npm update
echo `date` Building the docker container
docker build --no-cache -t williambnorton/darp . && docker push williambnorton/darp:dev
echo `date` New docker `ls Build*`
echo `date` Finished $0 Force genesis node to reload SW and the group will follow
#./builddarp.bash #always force a updateSW
