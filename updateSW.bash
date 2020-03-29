#!/bin/bash
#		    updateSW.bash
#
DARPDIR=~/darp
echo `date` updateSW.bash
cd $DARPDIR
CURRENT=`ls Build*`
#kill `cat *.pid`
echo `date` Current SW is `ls Build*`
cd /tmp
rm -rf /tmp/darp
mv $DARPDIR /tmp/darp
echo `date` Cloning new darp code from github
git clone https://github.com/williambnorton/darp.git    ~/darp     
#
#   We are in the moved old DARP directory (if things changed)
#
cd $DARPDIR
NEW=`ls Build*`
npm update
npm i @types/node
npm install redis express

echo `date` Completed git clone into ~/darp - CURRENT=$CURRENT NEW=$NEW
if [ "$CURRENT" == "$NEW" ]; then
	echo `date` No Change
	exit 0
else
	echo `date` Software changed. Was $CURRENT Now is $NEW
    echo 'CLONED INTO new darp directory.           cd ~;cd darp;ls'

	exit 1
fi

