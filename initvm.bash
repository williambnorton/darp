#!/bin/bash
#   Run this inside the docker to install the needed docker, wireguard, etc.
#
#
docker ps >/dev/null    #Are we starting on a machine without docker?

if [ $? -ne 0 ]; then   # Yes - install all assuming an ubuntu instance
    echo `date` VM ready to run darp;sudo apt-get update;
    sudo apt install -y docker.io;
    sudo systemctl start docker;
    sudo systemctl enable docker; 
    sudo groupadd docker;
    sudo usermod -aG docker ${USER};
    sudo docker system prune -af; 
    echo "" | sudo add-apt-repository ppa:wireguard/wireguard; 
    sudo apt-get update; sudo apt-get install -y wireguard; 
    sudo groupadd docker;sudo usermod -aG docker ${USER};
    sudo docker system prune -af; 
    sudo apt-get -y autoremove; echo `date`" REBOOTING";
    echo "Relogin and docker is ready to run DARP by typing "
    DARP_VERSION=`ls Docker.??????.????`
    DARP_BASE_PORT=65013
    echo "docker run -p$DARP_BASE_PORT:$DARP_BASE_PORT -eMY_GEO=`hostname` williambnorton/darp:$DARP_VERSION"
    sudo reboot
fi
