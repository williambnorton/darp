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
DARPDIR=$HOME/darp
#If the GENESIS variable ENV VAR does not exist then assume we are genesis node
if [ "$GENESIS" == "" ]; then
   GENESIS=`curl http://drpeering.com/genesisnodes`
   echo `date` Genesis node: $GENESIS
fi

#update SW is destructive - should be done after run in docker loop
#when genesis node leanrs of new SW it quits and downloads 
#
#The order of startup is important here
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
    redis-server --save "" --appendonly no &  #store nothing
    echo `date`" redis started"
    sleep 1

    echo `date` $0 : killing old processes to be restarted
    kill `cat $DARPDIR/*.pid`
    sleep 1
    ./updateSW.bash 
    echo `date` SOFTWARE UPDATE COMPLETE
    cd $DARPDIR
    ls -l Build*

    #Now we are running in the new code /darp directory
    echo `date` Configuring Wireguard
    cd $DARPDIR/scripts/
    ./configWG.bash
    export PUBLICKEY=`cat $DARPDIR/wireguard/publickey`
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
    echo `date` Connecting to GENESIS node to get configuration into redis
    cd $DARPDIR/config
    kill `cat $DARPDIR/config.pid`
    node config &
    echo $$ > $DARPDIR/config.pid
    echo `date` Waiting for config to connect
    sleep 1

    cd $DARPDIR
    cd $DARPDIR/pulser
    kill `cat $DARPDIR/pulser.pid`
    node pulser &
    echo $$ > $DARPDIR/pulser.pid
    #echo `date` '------------> Please start pulser'

    cd $DARPDIR
    cd $DARPDIR/handlepulse
    kill `cat $DARPDIR/handlepulse.pid`
    node handlepulse 
    $rc=$?
    
    if [ -f $DARPDIR/forever ]; then
        #echo $$>$DARPDIR/handlepulse.pid
        #echo `date` Starting handlepulse
        echo `date` New darp version: `cd /darp;ls build*` installed and about to start
        cd $DARPDIR
        ls -l
        sleep 15 
    else 
        echo `handlePulse finished -restarting all`
        exit -1
    fi
done
