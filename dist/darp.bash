#!/bin/bash
#       darp.bash - bash script to 
#           1) installs docker and wireguard if they are not already installed
#           2) starts DARP docker
#           3) starts host liaison script to control wireguard tunnels
#
#       After starting DARP you can see network instrumentation on your http://127.0.0.1:65013/
#       This model enables wireguard tunnels to fail open (still encrypting tunnel traffic) as routing system changes
echo `date` $0 Starting Distributed Autonomous Routing Protocol
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
    echo `date` $0 "DARP INSTALLING docker and wireguard "
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

docker ps 2>&1 >/dev/null    #final test to see if installed
docker_rc=$?
${SUDO} wg 2>&1 >/dev/null
wireguard_rc=$?
if [ $wireguard_rc -eq 0 -a $docker_rc -eq 0 ]; then
    echo `date` $0 DARP Starting 
    while [ `cat ~/wireguard/STATE` != "STOP" ]; 
    do
        # spin off liaison gateway script that ties together host network and docker 
        # wgwatch.bash (docker will create it in shared ~/wireguard directory)
        # will automatically kill the old wgwatch.bash but leave the wiregurd connections up until the next darp.pending file is created by the docker.
        (sleep 30;~/wireguard/wgwatch.bash) &

        #this is not nice - killing all dockers on system - fix this to grep
        docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q);
        #
        #   MYGENESISIP  <-- when delivered (index.ts ) this is replaced with this node's GENESIS node.
        #
        docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname`  -e GENESIS=MYGENESISIP -e "WALLET=auto"   williambnorton/darp:latest #< /dev/null
        rc=$?
        echo `date` "$0 Docker exitted with rc=$rc- sleeping 15 seconds and fetching new docker and restarting"
        sleep 15

    done
else
    echo `date` "$0 ERROR: docker/wireguard not installed. Can not run DARP on this machine. docker_rc="$docker_rc" wireguard_rc="$wireguard_rc
fi
echo `date` $0 DARP EXITTED.