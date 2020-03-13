#!/bin/bash
#		    bootdarp.bash - fetch updated darp software and launch forever script
# 

if [ "$GENESIS" == "" ]; then
   GENESIS=`curl ifconfig.co`
    echo `date` GENESIS set to $GENESIS
fi

#update SW is destructive - should be done after run in docker loop
#when genesis node leanrs of new SW it quits and downloads 
#
#The order of startup is important here

./updateSW.bash
echo `date` bootdarp: SOFTWARE UPDATE COMPLETE

#Now we are running in the new code /darp directory
cd ~/darp
ls -l ~/darp

echo `date` bootdarp: configuring initial wireguard keys
cd ~/darp/scripts/
./configWG.bash
export PUBLICKEY=`cat /etc/wireguard/publickey`
echo PUBLICKEY=$PUBLICKEY
cd ~/darp

echo `date` bootdarp: starting redis
redis-server &  #temp to help building
echo $$>redis-server.pid
sleep 1
#
#   need express (TCP/65013) before config
#
echo `date` bootdarp: starting express
cd ~/darp/express
node express &
echo $$>express.pid
sleep 2

#echo `date` Launching forever script
#cd /darp/scripts
#./forever.bash  #Start the system

cd ~/darp/config
kill `cat config.pid`
node config &
echo $$>config.pid
echo `date` Waiting for config to connect
sleep 1

echo `date` New darp version: `cd /darp;ls build*` installed and running

cd ~/darp/handlepulse
kill `cat handlepulse.pid`
node handlepulse &
echo $$>handlepulse.pid
echo `date` Starting handlepulse
sleep 1

cd ~/darp/pulser
kill `cat pulser.pid`
node pulser &
echo $$>pulser.pid
#echo `date` '------------> Please start pulser'

