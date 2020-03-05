#!/bin/bash
#		    bootdarp.bash - fetch updated darp software and launch forever script
#
cd /tmp
rm -rf /tmp/darp
mv /darp /tmp/darp
echo `date` Cloning new darp code from github
git clone https://github.com/williambnorton/darp.git    /darp     
cd /darp
echo `date` New darp version: `ls build*` installed
ls -l /darp

#temp to scaffolding to help build
cd /darp
redis-server &  #temp to help building
cd /darp/express
node express &

#echo `date` Launching forever script
#cd /darp/scripts
#./forever.bash  #Start the system

