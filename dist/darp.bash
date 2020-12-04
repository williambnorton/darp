#!/bin/bash
#       darp.bash - bash script to 
#           1) installs docker and wireguard if they are not already installed
#           2) starts DARP docker
#           3) starts host liaison script to control wireguard tunnels
#
#       After starting DARP you can see network instrumentation on your http://127.0.0.1:65013/
#       This model enables wireguard tunnels to fail open (still encrypting tunnel traffic) as routing system changes
echo `date` $0 Starting Distributed Autonomous Routing Protocol 00
SUDO=sudo
unameOut="$(uname -s)"
case "${unameOut}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    CYGWIN*)    MACHINE=Cygwin;;
    MINGW*)     MACHINE=MinGw;;
    *)          MACHINE="UNKNOWN:${unameOut}"
esac
export MACHINE
echo `date` "Machine type: ${MACHINE} - we need to know this for some wg host cmds."

if [ -r darp.pid ]; then
        kill -9 darp.pid
fi
echo $$ > darp.pid
#install docker and wireguard if not installed already
docker ps 2>&1 >/dev/null
if [ $? -ne 0 ]; then
    echo `date` $0 "DARP INSTALLING docker and wireguard docker_rc="$docker_rc" wireguard_rc="$wireguard_rc
    case $MACHINE  in
        Linux) 
            echo `date` making UBUNTU machine VM ready to run darp by installing  docker and wireguard ;sudo apt-get update;
            sudo apt install -y docker.io;sudo systemctl start docker;sudo systemctl enable docker; sudo groupadd docker;sudo usermod -aG docker ${USER};sudo docker system prune -af; echo "" | sudo add-apt-repository ppa:wireguard/wireguard; sudo apt-get update; sudo apt-get install -y wireguard; sudo groupadd docker;sudo usermod -aG docker ${USER};sudo docker system prune -af; echo `date` "in 0 seconds ssh in and launch docker";
            ;;
        Mac) 
            echo `date` making Mac machine DARP Ready by installing  docker and wireguard 
            sudo apt install -y docker.io;sudo systemctl start docker;sudo systemctl enable docker; sudo groupadd docker;sudo usermod -aG docker ${USER};sudo docker system prune -af; echo "" | sudo add-apt-repository ppa:wireguard/wireguard; sudo apt-get update; sudo apt-get install -y wireguard; sudo groupadd docker;sudo usermod -aG docker ${USER};sudo docker system prune -af; echo `date` "in 0 seconds ssh in and launch docker";
            ;;
        *)
            echo `date` UNKNOWN machine VM ready to run darp by installing  docker and wireguard
            ;;
    esac
    echo `date` $0 docker should be installed now...
fi

# forever loop to run darp and auto update docker images

#
#   Would be cool to do a port test here - listen for an echo, don't continue until a port 65013 datagram arrives on our puboiched port
#
#echo "TESTING PORTS $MYGENESISIP : $GENESISPORT <==> $MYIP : $MYPORT"


#send MYIP in port test 
#if we get an incoming message on MYPORT
#touch ~/wireguard/STATE  #make sure it exists
#if [ $? -ne 0 ]; then
#    echo `date` $0 DARP FAILURE ~/wireguard needs to be writable... 
    
#    exit 36
#fi
docker ps 2>&1 >/dev/null    #final test to see if installed
docker_rc=$?
#${SUDO} wg 2>&1 >/dev/null   #this will prevent running if wireguard not installed
wireguard_rc=$?
if [ $wireguard_rc -eq 0 -a $docker_rc -eq 0 ]; then
    echo `date` $0 DARP Starting 
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
        echo `date` "$0    HOST   KILLING docker instead of deleting image"
        docker kill `docker ps | grep darp | awk '{ print $1 }'`      #kill docker running darp

        #
        #   MYGENESISIP  <-- when delivered (index.ts ) this is replaced with this node's GENESIS node.
        # by default not specifying GENEIS NODE means auto - choose a random or placed
        #docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname`  -e GENESIS=MYGENESISIP -e "WALLET=auto"   williambnorton/darp:latest #< /dev/null
        # we explicitly say GENESIS="auto" to force all through ordered process - my list of GENESIS NODES are only ones to be GENESSIS NODES

        # Here we should use the Docker tag the genesis node says he is using.  Maybe the code that sends darp.bash would affix its DockerBuild# :Docker.201202.0518
        #docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e GENESIS="auto" -e "HOSTNAME="`hostname` -e "WALLET=auto"   williambnorton/darp:latest #< /dev/null
        echo `date` "HOST: darp.bash: after launch will be starting darp: DOCKERTAG running GITTAG"

        #docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e GENESIS="auto" -e "HOSTNAME="`hostname` -e "WALLET=auto"   williambnorton/darp:DOCKERTAG 
        docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e GENESIS="auto" -e "HOSTNAME="`hostname` -e "WALLET=auto"   williambnorton/darp:testnet
        
        rc=$?
        if [ $? -eq 86 ]; then
            echo `date` "======================================================= docker EXITTED with rc==86"
            exit 86
        fi
        echo `date` "$0 Docker exitted with rc=$rc- sleeping 15 seconds and fetching new docker and restarting"
        sleep 15

    done
else
    echo `date` "$0 ERROR: docker/wireguard not installed. Can not run DARP on this machine. docker_rc="$docker_rc" wireguard_rc="$wireguard_rc
fi
echo `date` $0 DARP EXITTED.