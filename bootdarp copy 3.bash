#!/bin/bash
#           
#		    bootdarp.bash - entry point for docker
# 
#       We set up the operating environmental variables on startup:
#           HOSTNAME = passed in --> used as 'geo' for now - turns out helpful to have a human readbale name
#           PORT = my open UDP/TCP port
#           GENESIS = a specific Genesis node to connect to (IP:Port or PUBLICKEY)
#           WALLET - a wallet with micro credits and debits for use in auto mode
#       We create the rest:
#           DARPDIR - the root directory of all darp ( /root/darp ) 
#           WGDIR - the root for DARP wireguard info and log info ( /etc/wireguard/ which is ~/wireguard on host )
#
# Environmental variables we assemble
#           GENESISNODELIST - IP,PORT,NAME ...  IP,PORT,NAME 
#           FIRSTGENESIS - IP,PORT,NAME   <--- use this for software version check
#           IS_MEMBER - 1 is Yes, this machine is on the GENESIS list
#           GENESIS - a point for connection into the mesh <IP>:<PORT>
#           GENESIS_IP - IP addreess of targetted genesis node to join
#           GENESIS_PORT - 
#           GENESIS_GEO -
#           GENESIS_SWVERSION -
#
# 
#
# 	bootdarp.bash variables 
#
echo `date` "Starting bootdarp.bash in docker " > /etc/wireguard/DARP.log   #TRUNCATING LOG FILE

SLEEPTIME=30 #time in seconds between software runs in forever loop

GRANULARITY=400 #  milliseconds before we say we should join the closer genesis node
                #400 allows my home docker to not be an island

MAXCYCLES=30 # of cycles before reloading docker

unameOut="$(uname -s)"
case "${unameOut}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    CYGWIN*)    MACHINE=Cygwin;;
    MINGW*)     MACHINE=MinGw;;
    *)          MACHINE="UNKNOWN:${unameOut}"
esac
export MACHINE
export DARPDIR=$HOME/darp
export DARPDIR=`pwd`
export WGDIR=/etc/wireguard

export MY_GEO=`echo $HOSTNAME	| awk '{ print $1 }' | awk -F. '{ print $1 }' | awk -F, '{ print $1 }' `

if [ "$MY_PORT" == "" ]; then
    MY_PORT=65013    
fi
export MY_PORT
export MY_IP=`curl ifconfig.io`	#	get my public IP


echo EXITTING BYEBYE
