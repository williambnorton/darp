#!/bin/bash
#		    updateSW.bash
#

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
	    echo `date` No Change       
    else
	    echo `date` $0 Software changed. Was $CURRENT Now is $NEW
        cd /tmp/darp
        echo 'CLONED INTO /tmp/darp directory.'
        #echo Killing handlepulse to force reload: `ls $DARPDIR/*.pid`
        cd /tmp
        echo `date` moving current code into root directory
        SUFFIX=`date +%y%m%d.%H%M`
        mv $DARPDIR /tmp/darp.$SUFFIX

        mv darp $HOME
        cp -R /tmp/darp.$SUFFIX/node_modules /root/darp/node_modules
        echo `date` New Code installed:
        cd $DARPDIR; ls
    fi

    echo `date` Completed git clone into ~/darp - CURRENT=$CURRENT NEW=$NEW

