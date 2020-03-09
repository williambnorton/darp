#!/bin/bash
#		    bootdarp.bash - fetch updated darp software and launch forever script
#
cd /tmp
rm -rf /tmp/darp
mv /darp /tmp/darp
echo `date` Cloning new darp code from github
git clone https://github.com/williambnorton/darp.git    /darp     
cd /darp
ls -l /darp

echo `date` configuring initial wireguard keys
cd /darp/scripts/
./configWG.bash
PUBLICKEY=`cat /etc/wireguard/publickey`
echo PUBLICKEY=$PUBLICKEY
cd /darp
redis-server &  #temp to help building

cd /darp/express
node express &

cd /darp/handlepulse
node handlepulse &

echo    `date` Waiting for express to start web services for nodefactory service 
sleep 2

#echo `date` Launching forever script
#cd /darp/scripts
#./forever.bash  #Start the system

cd /darp/config
node config &

echo    `date` Waiting for config to connect
sleep 1 

echo `date` New darp version: `cd /darp;ls build*` installed and running
