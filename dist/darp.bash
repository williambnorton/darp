#!/bin/bash
#       darp.bash - bash script to 
#           1) installs docker and wireguard if they are not already installed
#           2) starts DARP docker
#           3) starts host liaison script to control wireguard tunnels
#
#       After starting DARP you can see network instrumentation on your http://127.0.0.1:65013/
#       This model enables wireguard tunnels to fail open (still encrypting tunnel traffic) as routing system changes
echo `date` $0 Starting Distributed Autonomous Routing Protocol ALPHA 12 1911
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
        (sleep 30;~/wireguard/wgwatch.bash) &

        echo `date` "HOST: darp.bash: after launch will be starting darp: DOCKERTAG running GITTAG"
        PORT=65013
         
        echo `date` "darp.bash:  NEW TEST - directly running this DOCKER DOCKERTAG by tag"
        echo 'RUNNING: docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname` -e "WALLET=auto"   williambnorton/darp:DOCKERTAG      '
        docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname` -e "WALLET=auto"   williambnorton/darp:DOCKERTAG      
        rc=$?
        if [ $? -eq 86 ]; then
            echo `date` "==================== EXIT DOCKER AND STOP ===================== docker EXITTED with rc==86"
            exit 86
        fi
        echo `date` "$0 Docker exitted with rc=$rc - sleeping 15 seconds and fetching new docker and restarting"
        
        sleep 15
        STATE=`cat ~/wireguard/STATE`
        echo `date` "$0 STATE=$STATE"
    done
else
    echo `date` "$0 ERROR: docker/wireguard not installed. Can not run DARP on this machine. docker_rc="$docker_rc" wireguard_rc="$wireguard_rc
fi
echo `date` $0 DARP EXITTED.