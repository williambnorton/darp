#!/bin/bash
#		    bootdarp.bash - fetch updated darp software and launch forever script
# 
#   This is the primary entry point for the container
#       We expect environmental variables on startup:
#           HOSTNAME - can be derived by `hostname` and put in the command line
#           
#       Optional parms:
#           WALLET - a wallet to hold credits and debits for use
#           GENESIS - a starting point for connection into the mesh
# 
#       We create
#           GENESIS - if it isn't passed in , we find one from DrPeering
#           DARPDIR - the root of all darp info
#
export DARPDIR=$HOME/darp
MYIP=`curl ifconfig.io`
export MYIP=$MYIP
#echo `date` MYIP=$MYIP

#If the GENESIS variable ENV VAR does not exist then assume we are genesis node
if [ "$GENESIS" == "" ]; then
   GENESIS=`curl http://drpeering.com/genesisnodes`
   #echo `date` Genesis node: $GENESIS
fi

#update SW is destructive - should be done after run in docker loop
#when genesis node leanrs of new SW it quits and downloads 
#
#The order of startup is important here
echo `date` "$0 Starting loop. GENESIS=$GENESIS MYIP=$MYIP"
echo `date` >$DARPDIR/forever
while :
do
    rm $DARPDIR/forever  #comment this to rerun forever

    cd $DARPDIR
    VERSION=`ls Build*`
    echo `date` Starting $VERSION
    export VERSION=$VERSION
    sleep 2
    echo `date` Starting redis
    ( redis-cli shutdown 2>&1 ) >/dev/null #stop server if runniung
    ( redis-server --save "" --appendonly no 2>&1 ) >/dev/null &  #store nothing
    echo `date`" redis started"
    sleep 1

    #echo `date` $0 : killing old processes to be restarted
    #kill `cat $DARPDIR/*.pid`
    #sleep 1
    ./updateSW.bash #>/dev/null
    cd $DARPDIR
    export VERSION=`ls Build*`
    echo `date` "* * * * * * * * Running DARP $VERSION  * * * * * * * * * * * * *"
    sleep 2
    ./updateSW.bash -deamon & #>/dev/null

    #npm update
    #npm i @types/node
    #npm install redis express

    #Now we are running in the new code /darp directory
    echo `date` Configuring Wireguard
    cd $DARPDIR/scripts/
    ./configWG.bash #>/dev/null
    export PUBLICKEY=`cat $DARPDIR/etc/wireguard/publickey`
    echo PUBLICKEY=$PUBLICKEY
    sleep 1

    #
    #   need express (TCP/65013) before config
    #
    cd $DARPDIR
    echo `date` Starting express for nodeFactory and externalize stats
    cd $DARPDIR/express
    node express &
    echo $$ > $DARPDIR/express.pid
    sleep 1

    #echo `date` Launching forever script
    #cd /darp/scripts
    #./forever.bash  #Start the system
    cd $DARPDIR
    echo `date` Connecting to GENESIS node to get my configuration
    cd $DARPDIR/config
    if [ -f  $DARPDIR/config.pid ]; then
        kill `cat $DARPDIR/config.pid`
    fi
    node config &
    echo $$ > $DARPDIR/config.pid
    echo `date` Waiting for config to connect
    sleep 1

    cd $DARPDIR
    cd $DARPDIR/pulser
    if [ -f  $DARPDIR/pulser.pid ]; then
        kill `cat $DARPDIR/pulser.pid`
    fi
    node pulser &
    echo $$ > $DARPDIR/pulser.pid
    #echo `date` '------------> Please start pulser'

    cd $DARPDIR
    cd $DARPDIR/handlepulse
    if [ -f  $DARPDIR/handlepulse.pid ]; then
        kill `cat $DARPDIR/handlepulse.pid`
    fi
    echo `date` Starting handlepulse
    node handlepulse #this will stop when handlepulse receives reload msg
    $rc=$?

    echo `date` DARP Finished rc=$rc
    echo `date` DARP Finished rc=$rc
    echo `date` DARP Finished rc=$rc
    #
    #   Finished DARP - exit
    #
    kill `cat $DARPDIR/*.pid`    #kill all processes
    rm $DARPDIR/*.pid

    if [ -f $DARPDIR/forever ]; then
        echo `date` handlepulse exitted with rc=$rc
        cd $DARPDIR
        ls -l
        sleep 5 
    else 
        echo `handlePulse finished -restarting all`
        exit -1
    fi

done
