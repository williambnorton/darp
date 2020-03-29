#!/bin/bash
#		    updateSW.bash
#
echo parm count= $#
if [ $# -ne 0 ]; then
    echo `date` Running $0 in DAEMON mode. $#
    DAEMON="YES"
fi
echo `date` updateSW.bash
while :
do
    DARPDIR=~/darp
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
	    echo `date` No Change DAEMON=$DAEMON
        if [ "$DAEMON" != "YES" ]; then
            echo "Exitting $0";
	        exit 0
        fi
    else
	    echo `date` Software changed. Was $CURRENT Now is $NEW
        echo 'CLONED INTO new darp directory.      YOU NEED A new Bash shell:      cd ~;cd darp;ls'
        echo Should kill handlepulse to force reload
        kill `ps aux | grep 'node handlepulse'| grep -v grep | awk '{ print $2}'`
	    exit 1
    fi
    sleep 60
done
