#!/bin/bash
#		boot
echo `date` Starting $0 script
#cd /
#mv /darp /tmp
#rm -rf /tmp/darp
#git clone https://github.com/williambnorton/darp.git /root/darp
#ln -s /root/darp /darp

      rm -rf /tmp/darp
        mv /darp /tmp/darp
        git clone https://github.com/williambnorton/darp.git    /darp     
        cd /darp
        #mv /darp /tmp
        #.ln -s /root/darp /darp
        echo `date` new darp version `ls build*` installed
        ls -l /darp

echo `date` Launching forever script
ls -l /darp
cd /darp/scripts
#./forever.bash  #Start the system

