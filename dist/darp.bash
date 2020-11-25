#!/bin/bash
# kill previously running version of darp

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
fi

# forever loop to run darp and auto update docker images

while [ "" = "" ]; 
do
    # wgwatch will automatically kill the old wgwatch.bash but leave the wiregurd connections up until the next darp.pending file is created by the docker.
        (sleep 30;~/wireguard/wgwatch.bash) &

        #this is not nice - killing all dockers on system - fix this
        docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q);
        #
        #   __MYGENESISIP__   <-- when delivered in index.ts , this is replaced with this node's GENESIS node.
        #
        docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname`  -e GENESIS=__MYGENESISIP__ -e "WALLET=auto"   williambnorton/darp:latest #< /dev/null
        rc=$?
        echo `date` "Docker exitted rc=$rc- sleeping 10 seconds and fetching new docker and restarting"
        sleep 10

done