#!/bin/bash
#		    updateSW.bash - Update internal software running in the DARP Docker
#
#   This is run one-time each cycle to clone into /tmp/ and see if things changed.
#   TRhere is probably a better way to do this, so this remains a separate script
#
if [ $# -gt 0 ]; then
    BRANCH=$1
else   
    BRANCH=testnet
fi
    DARPDIR=~/darp
    cd $DARPDIR
    ls -l
    CURRENTDOCKER=`ls Docker.*`
    CURRENTDARP=`ls Build*`
    echo `date` $0 "CURRENTDOCKER=$CURRENTDOCKER CURRENTDARP=$CURRENTDARP"
    CURRENT=`ls Build*`
    echo `date` "$0 Current SW is "`ls Docker.*`":"`ls Build*`
    cd /tmp
    rm -rf /tmp/darp
    #mv $DARPDIR /tmp/darp
    echo `date` "updateSW.bash: Cloning $BRANCH darp code from github"
    ( git clone --depth 1 --branch $BRANCH https://github.com/williambnorton/darp.git /tmp/darp 2>&1 ) #>/dev/null 
    cd /tmp/darp
    NEW=`ls Build*`

   echo UPDATESW.BASH "$CURRENT" "$NEW" 

   if [ "$CURRENT" == "$NEW" ]; then
	    echo `date` No Change       
    else
        NEWDOCKERVERSION=`echo $NEW|awk -F: '{ print $1 }'`
        NEWDARPVERSION=`echo $NEW|awk -F: '{ print $2 }'`
        echo `date` "$0 Software changed. Was $CURRENT Now is $NEW NEWDOCKERVERSION=$NEWDOCKERVERSION NEWDARPVERSION=$NEWDARPVERSION"
        cd /tmp/darp
        echo 'CLONED INTO /tmp/darp directory.'
        #echo Killing handlepulse to force reload: `ls $DARPDIR/*.pid`
        cd /tmp
        echo `date` "moving current code into root directory"
        SUFFIX=`date +%y%m%d.%H%M`
        mv $DARPDIR /tmp/darp.$SUFFIX

        mv darp $HOME
        cp -R /tmp/darp.$SUFFIX/node_modules /root/darp/node_modules  ### updateSW.bash BROKEN
        echo `date` "New Code installed:"
        cd $DARPDIR; ls
        echo `date` "NEW Build - Build = $NEW"
        rm Build.* Docker.*
        echo $NEWDARPVERSION>$NEWDARPVERSION
        echo $NEWDOCKERVERSION>$NEWDOCKERVERSION
    fi

    echo `date` "Completed git clone into ~/darp - OLD=$CURRENT NEW=$NEW"
    ls
