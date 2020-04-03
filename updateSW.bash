#!/bin/bash
#		    updateSW.bash
#
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
    echo `date` Current SW is `ls Build*`
    cd /tmp
    rm -rf /tmp/darp
    #mv $DARPDIR /tmp/darp
    echo `date` Cloning new darp code from github
    git clone https://github.com/williambnorton/darp.git    /tmp/darp     
    cd /tmp/darp
    NEW=`ls Build*`

   if [ "$CURRENT" == "$NEW" ]; then
	    echo `date` No Change DAEMON=$DAEMON
        if [ "$DAEMON" != "YES" ]; then
            echo "Exitting $0";
	        exit 0
        fi
    else
	    echo `date` Software changed. Was $CURRENT Now is $NEW

        echo 'CLONED INTO /tmp directory.      YOU NEED A new Bash shell:      cd ~;cd darp;ls'
        echo Killing handlepulse to force reload: `ls $DARPDIR/*.pid`

        #killList=`cat $DARPDIR/*.pid`
        kill `ps aux|grep "node handlepulse" | grep -v grep | awk '{ print $2}'`
       
        cd /tmp
        mv $DARPDIR /tmp/darp.`date +%y%m%d.%H%M`
        mv darp $HOME
        echo `date` New Code installed:
        cd $DARPDIR; ls
	    exit 1
    fi

    #npm update
    #npm i @types/node
    #npm install redis express
#
#   We are in the moved old DARP directory (if things changed)
#

    echo `date` Completed git clone into ~/darp - CURRENT=$CURRENT NEW=$NEW
    sleep 1
 
    sleep 10
done
