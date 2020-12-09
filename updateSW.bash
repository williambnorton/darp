#!/bin/bash
#		    updateSW.bash - Update internal software running in the DARP Docker
#
#   This is run one-time each cycle to clone into /tmp/ and see if things changed.
#   TRhere is probably a better way to do this, so this remains a separate script
#
#if [ $# -gt 0 ]; then
#    BRANCH=$1
#else   
    BRANCH=testnet
#fi

    echo `date` $0 BRANCH=$BRANCH
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

    if [ "$BRANCH" == "testnet" ]; then
        echo `date` STARTING testnet
        ( git clone --depth 1 https://github.com/williambnorton/darp.git /tmp/darp 2>&1 ) #>/dev/null 
    else
        echo `date` STARTING $BRANCH
        ( git clone --depth 1 --branch $BRANCH https://github.com/williambnorton/darp.git /tmp/darp 2>&1 ) #>/dev/null 
    fi

    echo "New DARP Code in /tmp/darp directory:"
    ls -lR /tmp/darp

    cd /tmp
    echo /tmp/darp directory:
    ls -l /tmp/darp
    NEWDARPVERSION=`ls Build*`

   echo `date` Starting darp.bash "$CURRENTDARP" "$NEWDARPVERSION" 

   if [ "$CURRENTDARP" == "$NEWDARPVERSION" ]; then
	    echo `date` No Change       
        exit 0
    else
        echo `date` "$0 Software changed. Was $CURRENTDARP Now is $NEWDARPVERSION"
        echo 'CLONED INTO /tmp/darp directory.'
        #echo Killing handlepulse to force reload: `ls $DARPDIR/*.pid`
        cd /tmp
        echo `date` "moving CURRENTDARP code into root directory"
        SUFFIX=`date +%y%m%d.%H%M`
        mv $DARPDIR /tmp/darp.$SUFFIX

        cd /tmp
        cp -R /tmp/darp.$SUFFIX/node_modules /root/darp/node_modules  ### updateSW.bash BROKEN
        mv darp $HOME
        cd $DARPDIR
        echo `date` updateSW.bash - starting newe bootdarp.bash old CURRENTDARP=$CURRENTDARP DARPVERSION=$NEWDARPVERSION
        ls -l
        sleep 5
        ./bootdarp.bash 
        #rm Build* 
        #echo $NEWDARPVERSION > $NEWDARPVERSION
        #ls -l $NEWDARPVERSION
    fi

exit 1