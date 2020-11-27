#!/bin/bash
#       darp.bash - bash script to 
#           1) installs docker and wireguard if they are not already installed
#           2) starts DARP docker
#       After starting DARP you should be able to see network instrumentation on your http://127.0.0.1:65013/
#
echo `date` $0 Starting Distributed Autonomous Routing Protocol
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
docker ps >/dev/null
if [ $? -ne 0 ]; then

    case $MACHINE  in
        Linux) 
            echo `date` making UBUNTU machine VM ready to run darp by installing  docker and wireguard ;sudo apt-get update;
            apt install -y docker.io;sudo systemctl start docker;sudo systemctl enable docker; sudo groupadd docker;sudo usermod -aG docker ${USER};sudo docker system prune -af; echo "" | sudo add-apt-repository ppa:wireguard/wireguard; sudo apt-get update; sudo apt-get install -y wireguard; sudo groupadd docker;sudo usermod -aG docker ${USER};sudo docker system prune -af; echo `date` "in 0 seconds ssh in and launch docker";
            ;;
        Mac) 
           echo `date` making Mac machine DARP Ready by installing  docker and wireguard 
            sudo apt install -y docker.io;sudo systemctl start docker;sudo systemctl enable docker; sudo groupadd docker;sudo usermod -aG docker ${USER};sudo docker system prune -af; echo "" | sudo add-apt-repository ppa:wireguard/wireguard; sudo apt-get update; sudo apt-get install -y wireguard; sudo groupadd docker;sudo usermod -aG docker ${USER};sudo docker system prune -af; echo `date` "in 0 seconds ssh in and launch docker";
            ;;
        *)
          echo `date` UNKNOWN machine VM ready to run darp by installing  docker and wireguard
            ;;
    esac
fi

# forever loop to run darp and auto update docker images

docker ps >/dev/null    #if installed
docker_rc=$?
wg 2>&1 >/dev/null
wireguard_rc=$?
if [ $wireguard_rc -eq 1 -a $docker_rc -eq 0 ]; then
    while [ "" = "" ]; 
    do
        # spin off liaison gateway script that ties together host network and docker 
        # wgwatch.bash (docker will create it in shared ~/wireguard directory)
        # will automatically kill the old wgwatch.bash but leave the wiregurd connections up until the next darp.pending file is created by the docker.
        (sleep 30;~/wireguard/wgwatch.bash) &

        #this is not nice - killing all dockers on system - fix this to grep
        docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q);
        #
        #   __MYGENESISIP__   <-- when delivered in index.ts , this is replaced with this node's GENESIS node.
        #
        docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname`  -e GENESIS=MYGENESISIP -e "WALLET=auto"   williambnorton/darp:latest #< /dev/null
        rc=$?
        echo `date` "$0 Docker exitted rc=$rc- sleeping 10 seconds and fetching new docker and restarting"
        STATE=`cat ~/wireguard/STATE`
        echo `date` $0 STATE=$STATE
        case $STATE in
            NEWDOCKER)
                echo `date` $0 NEWDOCKER  fall through and refetch new docker
                ;;
            STOP)
                echo `date` $0 STOP exit and do not restart
                rm ~/wireguard/STATE     #this will eventually also delete the directory, which should be ~/darp instead of ~/wireguard  wg-quick takes a file as input
                exit 1
                ;;
            *)
                echo `date` $0 UNKNOWN STATE=$STATE Exitting...
                sleep 5
                exit 1
                ;;
        esac
        echo `date` Sleeping for 10 seconds.
        sleep 10

    done
else
    echo `date` $0 ERROR: docker/wireguard not installed. Can not run DARP on this machine. 
fi