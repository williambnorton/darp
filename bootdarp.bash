#!/bin/bash
#		    bootdarp.bash - fetch updated darp software and launch forever script
#

/darp/updateSW.bash
echo `date` bootdarp: SOFTWARE UPDATE COMPLETE

#Now we are running in the new code /darp directory
cd /darp
ls -l /darp

echo `date` bootdarp: configuring initial wireguard keys
cd /darp/scripts/
./configWG.bash
PUBLICKEY=`cat /etc/wireguard/publickey`
echo PUBLICKEY=$PUBLICKEY
cd /darp

echo `date` bootdarp: starting redis and express
redis-server &  #temp to help building
sleep 1
#
#   need express (TCP/65013) before config
#
cd /darp/express
node express &
sleep 2

#echo `date` Launching forever script
#cd /darp/scripts
#./forever.bash  #Start the system

cd /darp/config
node config &
echo    `date` Waiting for config to connect
sleep 1

echo `date` New darp version: `cd /darp;ls build*` installed and running

cd /darp/handlepulse
node handlepulse &
echo    `date` Starting handlepulse
sleep 1

cd /darp/pulser
#node pulser &

