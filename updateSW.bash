#!/bin/bash
#		    updateSW.bash
#
if [ $# -ne 0 ]; then
    echo `date` Running $0 in DAEMON mode. $#
    DAEMON="YES"
fi
POLLFREQ=45

echo `date` updateSW.bash
while :
do
    DARPDIR=~/darp
    cd $DARPDIR
    CURRENT=`ls Build*`
    #echo `date` Current SW is `ls Build*`
    cd /tmp
    rm -rf /tmp/darp
    #mv $DARPDIR /tmp/darp
    #3echo `date` Cloning new darp code from github
    ( git clone https://github.com/williambnorton/darp.git /tmp/darp 2>&1 ) >/dev/null 
    cd /tmp/darp
    NEW=`ls Build*`

   echo UPDATESW.BASH "$CURRENT" "$NEW" 

   if [ "$CURRENT" == "$NEW" ]; then
	    #echo `date` No Change DAEMON=$DAEMON
        if [ "$DAEMON" != "YES" ]; then
            echo "updateSW.bash DONE WITH SINGLE STARTUP RUN....Exitting $0";
	        exit 0
        fi
        
    else
	    echo `date` $0 Software changed. Was $CURRENT Now is $NEW
        cd /tmp/darp
        echo 'CLONED INTO /tmp directory.      YOU NEED A new Bash shell:      cd ~;cd darp;ls'
        #echo Killing handlepulse to force reload: `ls $DARPDIR/*.pid`

        #killList=`cat $DARPDIR/*.pid`
        kill `ps aux|grep "node dist" | grep -v grep | awk '{ print $2}'`
       
        cd /tmp

        mv $DARPDIR /tmp/darp.`date +%y%m%d.%H%M`
        mv darp $HOME
        echo `date` New Code installed:
        cd $DARPDIR; ls
	    exit 1
    fi

    echo `date` Completed git clone into ~/darp - CURRENT=$CURRENT NEW=$NEW

    sleep $POLLFREQ
done
