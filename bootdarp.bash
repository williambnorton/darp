#!/bin/bash
#		boot
echo `date` Starting $0 script
cd /
mv /darp /tmp
rm -rf /tmp/darp
git clone https://github.com/williambnorton/darp.git /root/darp
ln -s /root/darp /darp

echo `date` Launching forever script
ls -l /darp
cd /darp/scripts
./forever.bash  #Start the system

