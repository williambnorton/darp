#!/bin/bash
#       darp.bash - bash script to 
#           1) installs docker and wireguard if they are not already installed
#           2) starts DARP docker
#           3) starts host liaison script to control wireguard tunnels
#
#       After starting DARP you can see network instrumentation on your http://127.0.0.1:65013/
#       This model enables wireguard tunnels to fail open (still encrypting tunnel traffic) as routing system changes
echo `date` $0 Starting Distributed Autonomous Routing Protocol ALPHA DOCKERTAG
SUDO=sudo

docker ps 2>&1 >/dev/null    #make sure docker and wireguard are installed
docker_rc=$?
#${SUDO} wg 2>&1 >/dev/null   #this will prevent running if wireguard not installed
wireguard_rc=$?
if [ $wireguard_rc -eq 0 -a $docker_rc -eq 0 ]; then



    #echo `date` $0 DARP Starting `ls Docker.*`:`ls Build.*`
    STATE=`cat ~/wireguard/STATE`
    echo `date` STATE=$STATE
    while [ "$STATE" != "STOP" ]
    do
        echo "==================== darp.bash We will run software version: $STATE"

        # spin off liaison gateway script that ties together host network and docker 
        # wgwatch.bash (docker will create it in shared volume: ~/wireguard directory)
        # will automatically kill the old wgwatch.bash but leave the wiregurd connections up until the next darp.pending file is created by the docker.
        echo `date` "$0 removing all dockers and images"

        ( docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q) 2>&1 )>/dev/null

        echo `date` "$0 delayed launch of wireguiard script, instrumentation docker, and syntropy stack agent"
        (sleep 20;~/wireguard/wgwatch.bash) &
        (sleep 30; docker run --network="host" --rm --cap-add=NET_ADMIN --cap-add=SYS_MODULE -v /var/run/docker.sock:/var/run/docker.sock:ro --device /dev/net/tun:/dev/net/tun --name=syntropy-agent -e SYNTROPY_NETWORK_API='docker' -e SYNTROPY_API_KEY=$SYNTROPY_API_KEY -d syntropynet/agent:stable ) &
        (sleep 40; docker run -p 80:80 --rm -d williambnorton/srwan ) &

        echo `date` "HOST: darp.bash: after launch will be starting darp: DOCKERTAG running GITTAG"
        export MY_PORT=65013  #your port dedicated to DARP be configured (65013 is default)
         
        echo $0 'RUNNING: docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname` -e "WALLET=auto"   williambnorton/darp:DOCKERTAG      '
        docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname` -e "WALLET=auto"   williambnorton/darp:DOCKERTAG      
        rc=$?
        if [ $? -eq 86 ]; then
            echo `date` "==================== EXIT DOCKER AND STOP ===================== docker EXITTED with rc==86"
            exit 86
        fi
        echo `date` "$0 Docker exitted with rc=$rc - sleeping 15 seconds and fetching new docker and restarting"
        
        sleep 15
        STATE=`cat ~/wireguard/STATE`
        #echo `date` "$0 STATE=$STATE"
    done
else
    echo `date` "$0 ERROR: docker/wireguard not installed. Can not run DARP on this machine. docker_rc="$docker_rc" wireguard_rc="$wireguard_rc
fi
echo `date` $0 DARP EXITTED.