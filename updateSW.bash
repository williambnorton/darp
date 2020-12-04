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
    CURRENTVERSION="$CURRENTDOCKER:$CURRENTDARP"
    echo `date` $0 "CURRENTDOCKER=$CURRENTDOCKER CURRENTDARP=$CURRENTDARP CURRENTVERSION=$CURRENTVERSION"

    cd /tmp
    rm -rf /tmp/darp
    #mv $DARPDIR /tmp/darp
    echo `date` "updateSW.bash: Cloning $BRANCH darp code from github"
    ( git clone --depth 1 --branch $BRANCH https://github.com/williambnorton/darp.git /tmp/darp 2>&1 ) #>/dev/null 
    cd /tmp/darp
    NEWDARPVERSION=`ls Build*`

   echo UPDATESW.BASH "$CURRENTDARP" "$NEWDARPVERSION" 

   if [ "$CURRENTDARP" == "$NEWDARPVERSION" ]; then
	    echo `date` No Change       
    else
        echo `date` "$0 Software changed. Was $CURRENTDARP Now is $NEWDARPVERSION"
        cd /tmp/darp
        echo 'CLONED INTO /tmp/darp directory.'
        #echo Killing handlepulse to force reload: `ls $DARPDIR/*.pid`
        cd /tmp
        echo `date` "moving CURRENTDARP code into root directory"
        SUFFIX=`date +%y%m%d.%H%M`
        mv $DARPDIR /tmp/darp.$SUFFIX

        cd /root/darp/
        cp -R /tmp/darp.$SUFFIX/node_modules /root/darp/node_modules  ### updateSW.bash BROKEN
        mv darp $HOME
        #
        #   
        #
        rm Build* 
        echo $NEWDARPVERSION > $NEWDARPVERSION
        ls -l $NEWDARPVERSION
    fi

    echo `date` "Completed git clone into ~/darp - OLD=$CURRENTDARP NEW=$NEW"
        echo `date` "$0 Software changed. Was $CURRENTDARP Now NEWDARPVERSION=$NEWDARPVERSION"

    ls
