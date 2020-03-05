#!/bin/bash
#		    bootdarp.bash - fetch updated darp software and launch forever script
#
rm -rf /tmp/darp
mv /darp /tmp/darp
git clone https://github.com/williambnorton/darp.git    /darp     
cd /darp
echo `date` new darp version `ls build*` installed
ls -l /darp

echo `date` Launching forever script
cd /darp/scripts
#./forever.bash  #Start the system

