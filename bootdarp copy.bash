#!/bin/bash
docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q)
#docker container prune -f;docker system prune;

DOCKER_VERSION=`cat DOCKER_VERSION`
DARP_BASE_PORT=65013
if [ -f DARP_BASE_PORT ]; then
        DARP_BASE_PORT=`cat DARP_BASE_PORT`
fi

echo docker run -p $DARP_BASE_PORT:$DARP_BASE_PORT/udp -p $DARP_BASE_PORT:$DARP_BASE_PORT/tcp -eMY_GEO=`hostname` -p 80:80 williambnorton/darp:$DOCKER_VERSION
