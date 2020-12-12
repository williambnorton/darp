#!/bin/bash
#       darp.bash - bash script to 
#           1) installs docker and wireguard if they are not already installed
#           2) starts DARP docker
#           3) starts host liaison script to control wireguard tunnels
#
#       After starting DARP you can see network instrumentation on your http://127.0.0.1:65013/
#       This model enables wireguard tunnels to fail open (still encrypting tunnel traffic) as routing system changes
echo `date` $0 Starting Distributed Autonomous Routing Protocol ALPHA 11 9:30
SUDO=sudo

docker ps 2>&1 >/dev/null    #make sure docker and wireguard are installed
docker_rc=$?
#${SUDO} wg 2>&1 >/dev/null   #this will prevent running if wireguard not installed
wireguard_rc=$?
if [ $wireguard_rc -eq 0 -a $docker_rc -eq 0 ]; then
    echo `date` $0 DARP Starting `ls Docker.*`:`ls Build.*`
    STATE=`cat ~/wireguard/STATE`
    echo `date` STATE=$STATE
    while [ "$STATE" != "STOP" ]
    do
        echo "==================== darp.bash STATE is $STATE"

        # spin off liaison gateway script that ties together host network and docker 
        # wgwatch.bash (docker will create it in shared ~/wireguard directory)
        # will automatically kill the old wgwatch.bash but leave the wiregurd connections up until the next darp.pending file is created by the docker.
        (sleep 30;~/wireguard/wgwatch.bash) &

        #this is not nice - killing all dockers on system - fix this to grep
        #docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q);
        #echo `date` "$0   HOST KILLING docker instead of deleting image"
        docker kill `docker ps | grep darp | awk '{ print $1 }'`  2>&1 >/dev/null    #kill docker running darp
        #echo `date` $0 After killing docker we have these running dockers
        #docker ps
        #docker kill `docker ps | grep -v CONTAIN | awk '{ print $1 }'`      #kill all dockerdX
        echo `date` "HOST: darp.bash: after launch will be starting darp: DOCKERTAG running GITTAG"
 
        #There are three things that can be changed:  
        #   GENESIS=a node to connect to, or auto, probably what you want (default)     
        #   HOSTNAME=textForDisplay, helpful for simulation       
        #   WALLET=wallet to use to refill escrow of tokens, auto provides a limited # of tokens for demonstrating relaying traffic (for simulation)
        #   PORT=65013
        docker run --rm -d -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e PORT=65013 -e GENESIS="auto" -e "HOSTNAME="`hostname` -e "WALLET=auto"   williambnorton/darp:DOCKERTAG 
        #docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e GENESIS="auto" -e "HOSTNAME="`hostname` -e "WALLET=auto"   williambnorton/darp:testnet
        
        rc=$?
        if [ $? -eq 86 ]; then
            echo `date` "======================================================= docker EXITTED with rc==86"
            exit 86
        fi
        echo `date` "$0 Docker exitted with rc=$rc- sleeping 15 seconds and fetching new docker and restarting"
        sleep 15
        STATE=`cat ~/wireguard/STATE`
        echo `date` "$0 STATE=$STATE"
    done
else
    echo `date` "$0 ERROR: docker/wireguard not installed. Can not run DARP on this machine. docker_rc="$docker_rc" wireguard_rc="$wireguard_rc
fi
echo `date` $0 DARP EXITTED.