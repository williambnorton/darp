#!/bin/bash
#		    updateSW.bash
#
echo `date` updateSW.bash
cd ~/darp
CURRENT=`ls Build*`
#this should be a check to see if code has changed and the do soft reload.
# for now, just replace code with new
cd ~/darp
#kill `cat *.pid`
echo `date` Current SW is `ls Build*`
cd /tmp
rm -rf /tmp/darp
mv ~/darp /tmp/darp
echo `date` Cloning new darp code from github
git clone https://github.com/williambnorton/darp.git    ~/darp     
cd ~/darp
NEW=`ls Build*`
npm update
npm i @types/node
npm install redis express

echo `date` Completed git clone into ~/darp - CURRENT=$CURRENT NEW=$NEW
if [ "$CURRENT" == "$NEW" ]; then
	echo `date` No Change
	exit 0
else
	echo `date` Software changed
	exit 1
fi
echo 'CLONED INTO new darp directory.           cd ~;cd darp;ls'

