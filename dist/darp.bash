#!/bin/bash
# kill previously running version of darp
if [ -r darp.pid ]; then
        kill -9 darp.pid
fi
echo $$ > darp.pid
#install docker and wireguard if not installed already
docker ps >/dev/null
if [ $? -ne 0 ]; then
echo `date` making UBUNTU machine VM ready to run darp by installing  docker and wireguard ;sudo apt-get update;
        sudo apt install -y docker.io;sudo systemctl start docker;sudo systemctl enable docker; sudo groupadd docker;sudo usermod -aG docker ${USER};sudo docker system prune -af; echo "" | sudo add-apt-repository ppa:wireguard/wireguard; sudo apt-get update; sudo apt-get install -y wireguard; sudo groupadd docker;sudo usermod -aG docker ${USER};sudo docker system prune -af; echo `date` "in 0 seconds ssh in and launch docker";
fi

# forever loop to run darp and auto update docker images

while [ "" = "" ]; 
do
        (sleep 30;~/wireguard/wgwatch.bash) &

        #this is not nice - killing all dockers on system - fix this
        docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q);

        docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname`  -e GENESIS=52.53.222.151 -e "WALLET=auto"   williambnorton/darp:latest < /dev/null
        rc=$?
        echo `date` "Docker exitted rc=$rc- sleeping 10 seconds and fetching new docker and restarting"
        sleep 10

done