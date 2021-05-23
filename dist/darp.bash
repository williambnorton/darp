#!/bin/bash
#       darp.bash - bash script to 
#           1) installs docker and wireguard if they are not already installed
#           2) starts DARP docker
#           3) starts host liaison script to control wireguard tunnels
#
#       After starting DARP you can see network instrumentation on your http://127.0.0.1:65013/
#       This model enables wireguard tunnels to fail open (still encrypting tunnel traffic) as routing system changes
#
echo `date` $0 Starting Distributed Autonomous Routing Protocol ALPHA DOCKERTAG
SUDO=sudo

DOCKER_SLEEPTIME=60   #time to wait before trying to connect again
                    #Guidance here - when developing near code that could cause index.ts to fail, 
                    #make this 60-120 seconds so it only beats on docker hub / github that frequently in the worst case

MAX_CYCLES=10;      #DARP loop - Guidance low numbers in development, high numbers in production. 
CYCLE=30;            #Guidance: this means the caller (not docker) decides if to continue, manually (attended mode) or by its own forever loop (IoT mode)
                    #
docker ps 2>&1 >/dev/null    #make sure docker and wireguard are installed
docker_rc=$?
#${SUDO} wg 2>&1 >/dev/null   #this will prevent running if wireguard not installed
wireguard_rc=$?
if [ $wireguard_rc -eq 0 -a $docker_rc -eq 0 ]; then

    #echo STARTING > ~/wireguard/STATE
    echo `date` $0 STARTING DARP  `ls Docker.*`:`ls Build.*`  >> ~/wireguard/DARP.log
    STATE="STARTING"

    while [ "$STATE" != "STOP" ]
    do
        echo `date`" Top of Loop MAX_CYCLES=$MAX_CYCLES STATE=$STATE ==================== $0 ================== "
        # spin off liaison gateway script that ties together host network and docker 
        # wgwatch.bash (docker will create it in shared volume: ~/wireguard directory)
        # will automatically kill the old wgwatch.bash but leave the wiregurd connections up until the next darp.pending file is created by the docker.
        echo `date` "$0 removing all dockers and images"

        ( docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q) 2>&1 )>/dev/null

        echo `date` "$0 delayed launch of wireguiard script, instrumentation docker, and syntropy stack agent"
        (sleep 10;~/wireguard/wgwatch.bash 2>&1) >/dev/null &
        # Run syntropy stack and GUI for the system
        #(sleep 13; docker run --network="host" --rm --cap-add=NET_ADMIN --cap-add=SYS_MODULE -v /var/run/docker.sock:/var/run/docker.sock:ro --device /dev/net/tun:/dev/net/tun --name=syntropy-agent -e SYNTROPY_NETWORK_API='docker' -e SYNTROPY_API_KEY=$SYNTROPY_API_KEY -d syntropynet/agent:stable 2>&1) >/dev/null &
        (sleep 35; docker run -p 80:80 --rm -d williambnorton/srwan 2>&1) >/dev/null &    #all nodes run nice GUI frontend on port 80  - OK if it is already running
        # After a minute, cache the downloaded docker for distribution
        #(sleep 60;  docker save williambnorton/darp:latest | gzip -c > ~/wireguard/darpdocker.tgz; echo `date`" DOCKER Cached-could be named with version"; rm ~/wireguard/Docker.[0-9]*; ln -s ~/wireguard/darpdocker.tgz `curl localhost:65013/version|awk -F. '{ print "Docker."$2"."$3".tgz" }'| awk -F: '{ print $1}'`;echo `date` "Docker Cached locally" ) & #cache docker

        echo `date` "Your sub-agent script or docker to run on all your nodes could go here..."

        echo `date` "HOST: darp.bash: after launch will be starting darp: DOCKERTAG running GITTAG"
        export MY_PORT=_MY_PORT  #your port dedicated to DARP be configured (65013 is default)
        export GENESISNODELIST="GENESIS_NODE_LIST"  #this filled in by index.ts with custom G_N_L
        echo "GENESISNODELIST="$GENESISNODELIST #

        if [ "FALSE" == "TRUE" ]; then
            #//  -- this is slower and more expensive - we pay cloud egree rates, cheaper from docker hub
            #//  Distribute Docker out of this Genesis Node instead of DockerHub - BW charges could be big, and slower than Doc ker hub  $0.005 per download
            #// but we get a thruput measure test
            echo `date` "loading DARPDOCKER from http://_MY_IP:_MY_PORT/darpdocker "
            STARTTIME=`date +%s`
            curl -o - http://_MY_IP:_MY_PORT/darpdocker | docker load   #fetch the docker from the running docker I connected to (instead of from docker hub)
            ENDTIME=`date +%s`
            ELAPSEDTIME=`expr $ENDTIME - $STARTTIME`
            ELAPSEDSECONDS=`expr $ELAPSEDTIME / 1000`
            FILESIZE=86*1000*1000
            THRUPUT=`expr $FILESIZE / $ELAPSEDTIME`
            echo `date` "DARPDOCKER --Download from http://_MY_IP:_MY_PORT/darpdocker took $ELAPSEDTIME seconds ($STARTTIME-$ENDTIME) thruput=$THRUPUT"
        fi

        #
        #   START DOCKER RUNNING DARP
        #
        echo $0 'RUNNING: docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname` -e "WALLET=auto"   williambnorton/darp'
        echo $0 'RUNNING: docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname` -e "WALLET=auto"   williambnorton/darp'
        echo $0 'RUNNING: docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname` -e "WALLET=auto"   williambnorton/darp'
        echo $0 'RUNNING: docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname` -e "WALLET=auto"   williambnorton/darp'
        echo $0 'RUNNING: docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname` -e "WALLET=auto"   williambnorton/darp'
        
#specific        docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname` -e "WALLET=auto"   williambnorton/darp:DOCKERTAG      
        docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname` -e "WALLET=auto"   williambnorton/darp     # | tee ~/wireguard/DARPdocker.log
        darp_docker_rc=$?
        echo `date` * DARP Docker Exitted with darp_docker_rc=$darp_docker_rc
        echo `date` ** DARP Docker Exitted with darp_docker_rc=$darp_docker_rc
        echo `date` *** DARP Docker Exitted with darp_docker_rc=$darp_docker_rc
        echo `date` **** DARP Docker Exitted with darp_docker_rc=$darp_docker_rc
        echo `date` ***** DARP Docker Exitted with darp_docker_rc=$darp_docker_rc
        #
        #   DARP DOCKER EXITTED
        #
        echo `date` "$0 DOCKER finished its cycle through the DARP software - CLEANING UP - KILLING background tasks and other dockers"
        kill $(jobs -p)    #kill all jobs
        ( docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q) 2>&1 )>/dev/null
        echo `date` "$0 KILLING background tasks complete"

        case "$darp_docker_rc" in
            "36" )
                echo `date` "= = = = = =       DOCKER SOFTWARE RELOAD REQUESTED       = = = = = =   docker_rc=$darp_docker_rc ==== RELOADING SOFTWARE =========== "
                echo `date` "= = = = = =       DOCKER SOFTWARE RELOAD REQUESTED       = = = = = =   docker_rc=$darp_docker_rc ==== RELOADING SOFTWARE =========== ">>~/wireguard/DARP.log
                ;;
            "86" )
                echo `date` "* * * * * *       DOCKER STOP REQUESTED         * * * * * * *" 
                exit 86;
                ;;
            "0" )
                echo `date` "* * * * * *      docker_rc=$darp_docker_rc     NEW DOCKER AVAILABLE     * * * * * * *" 
                #exit 86;
                ;;
            "125" )
                echo `date` "* * * * * *      docker_rc=$darp_docker_rc     DOCKER ERROR     * * * * * * *" 
                #exit 86;
                ;;                
            * )
                echo `date` "=========== RESTARTING : DOCKER EXITTED docker_rc=$darp_docker_rc ==== RESTARTING =========== "
                echo `date` "=========== RESTARTING : DOCKER EXITTED docker_rc=$darp_docker_rc ==== RESTARTING =========== " >>~/wireguard/DARP.log
                ;;            
        esac
        CYCLE=`expr $CYCLE + 1`
        if [ $CYCLE -gt $MAX_CYCLES ]; then
            echo `date` "darp.bash: MAX DOCKER LOADS PER RUNNING "
            exit 86;
        fi
        echo `date` "$0 ================= CYCLE $CYCLE RELOADING DARP Software in $DOCKER_SLEEPTIME seconds... Running $MAX_CYCLE loops"
        sleep $DOCKER_SLEEPTIME
        STATE=`cat ~/wireguard/STATE`
        echo `date` "$0 Inside Docker exitted with STATE=$STATE"
    done
else
    echo `date` "$0 ERROR: docker/wireguard not installed. Can not run DARP on this machine. docker_rc="$docker_rc" wireguard_rc="$wireguard_rc
    sudo apt install -y docker.io;sudo systemctl start docker;sudo systemctl enable docker; sudo groupadd docker;sudo usermod -aG docker ${USER};sudo docker system prune -af; echo "" | sudo add-apt-repository ppa:wireguard/wireguard; sudo apt-get update; sudo apt-get install -y wireguard; sudo groupadd docker;sudo usermod -aG docker ${USER};sudo docker system prune -af; echo `date` "in 0 seconds ssh in and launch docker"; sudo apt-get -y autoremove; sudo reboot
fi
echo `date` $0 DARP EXITTED.
exit 86
