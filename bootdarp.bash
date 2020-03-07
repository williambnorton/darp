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
#temp to scaffolding to help build
cd /darp
redis-server &  #temp to help building
cd /darp/express
node express &

#echo `date` Launching forever script
#cd /darp/scripts
#./forever.bash  #Start the system

cd /darp/config

echo `date` New darp version: `ls /darp/build*` installed
