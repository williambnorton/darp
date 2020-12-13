#!/bin/bash
#		    updateSW.bash - Update internal software running in the DARP Docker
#
#   This is run one-time each cycle to clone into /tmp/ and see if things changed.
#   TRhere is probably a better way to do this, so this remains a separate script
#
if [ $# -gt 0 ]; then
    NEWDARP=$1
else
    echo Usage: $0 VERSION
    exit 1
fi

#
#   Case 1 - currently running latest DARP SW VERSION
#
echo `date` " *****************  $0 BRANCH=$BRANCH"
DARPDIR=~/darp
cd $DARPDIR
ls -l
CURRENTDOCKER=`ls Docker.*`
CURRENTDARP=`ls Build.*`
CURRENTVERSION="$CURRENTDOCKER:$CURRENTDARP"
echo `date` $0 "CURRENTDOCKER=$CURRENTDOCKER CURRENTDARP=$CURRENTDARP CURRENTVERSION=$CURRENTVERSION"

if [ "$CURRENTDARP" == "$NEWDARP" ]; then
    echo `date` "$0 no update needed "
    exit 0;
fi

#
#   Case 2 - neeed to upgrade the running SW - clone into tmp and copy it over, 
#

    cd /tmp
    rm -rf /tmp/darp
    #mv $DARPDIR /tmp/darp
    echo `date` "updateSW.bash: Cloning $NEWDARP darp code from github"

    #if [ "$BRANCH" == "testnet" ]; then
    #    echo `date` STARTING testnet
    #    ( git clone --depth 1 https://github.com/williambnorton/darp.git /tmp/darp 2>&1 ) #>/dev/null 
    #else
        echo `date` STARTING $NEWDARP
        ( git clone --depth 1 --branch $NEWDARP https://github.com/williambnorton/darp.git /tmp/darp 2>&1 ) #>/dev/null 
    #fi

    echo "New DARP Code in /tmp/darp directory:"
    ls -l /tmp/darp
    cd /tmp/darp
    NEWDARPVERSION=`ls Build.*`

    echo `date` "$0 Software changed. Was $CURRENTDARP Now is $NEWDARPVERSION"
    echo `date` $0 "$NEWDARPVERSION INTO /tmp/darp directory."
    #echo Killing handlepulse to force reload: `ls $DARPDIR/*.pid`
    cd /tmp
    echo `date` "moving CURRENTDARP code into root directory"
    SUFFIX=`date +%y%m%d.%H%M`
    mv $DARPDIR /tmp/darp.$SUFFIX

    cd /tmp
    cp -R /tmp/darp.$SUFFIX/node_modules /root/darp/node_modules  ### updateSW.bash BROKEN
    mv darp $HOME
    cd $DARPDIR
    ls -l Docker.* Build.* 
    echo `date` "updateSW.bash - INSTALLED NEW BOOTDARP SOFTWARE ( CURRENTDARP=$CURRENTDARP NEWDARPVERSION=$NEWDARPVERSION )"
    echo `date` "updateSW.bash - INSTALLED NEW BOOTDARP SOFTWARE ( CURRENTDARP=$CURRENTDARP NEWDARPVERSION=$NEWDARPVERSION )"
    echo `date` "updateSW.bash - INSTALLED NEW BOOTDARP SOFTWARE ( CURRENTDARP=$CURRENTDARP NEWDARPVERSION=$NEWDARPVERSION )"
    echo `date` "updateSW.bash - INSTALLED NEW BOOTDARP SOFTWARE ( CURRENTDARP=$CURRENTDARP NEWDARPVERSION=$NEWDARPVERSION )"
    echo `date` "updateSW.bash - INSTALLED NEW BOOTDARP SOFTWARE ( CURRENTDARP=$CURRENTDARP NEWDARPVERSION=$NEWDARPVERSION )"

    ls -l bootdarp.bash
    #exit 0
    exit 0
    sleep 5
    

    ./bootdarp.bash 
exit $?     #whatever their rc is our rc - 36 is reload SW, 86 is STOP, etc.