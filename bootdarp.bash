#!/bin/bash
#		    bootdarp.bash - fetch updated darp software and launch forever script
# 
#   This is the primary entry point for the container
#       We expect environmental variables on startup:
#           HOSTNAME - can be derived by `hostname` and put in the command line
#           
#       Optional parms:
#           WALLET - a wallet to hold credits and debits for use
#           GENESIS - a STOPPING point for connection into the mesh
# 
#       We create
#           GENESIS - if it isn't passed in , we find one from DrPeering
#           DARPDIR - the root of all darp info
#
export DARPDIR=$HOME/darp
MYIP=`curl ifconfig.io`
export MYIP=$MYIP
#echo `date` MYIP=$MYIP
echo `date` HERE YOU REALLY SHOULD COMPLAIN IF NO GENESIS WAS SET

if [ "$GENESIS" == "" ]; then
    echo `date` You must specify a genesis node 
    echo `date` Add -e"GENESIS=<ipaddr>" into the docker run command
    exit -1
fi
#If the GENESIS variable ENV VAR does not exist then assume we are genesis node
if [ "$GENESIS" = "public" ]; then
   GENESIS=`curl http://drpeering.com/genesisnodes`
fi

echo `date` Genesis node: $GENESIS  "<--- Set GENESIS environmental variable to launch your own pulseGroup"
GENESISIP=`echo $GENESIS | awk -F: '{ print $1 }'`
echo GENESISIP=$GENESISIP
sleep 3
#update SW is destructive - should be done after run in docker loop
#when genesis node leanrs of new SW it quits and downloads 
#
#The order of startup is important here
echo `date` "$0 STARTING loop. GENESISIP=$GENESISIP MYIP=$MYIP"
echo `date` >$DARPDIR/forever
while :
do
    #rm $DARPDIR/forever  #comment this to re-run forever

    cd $DARPDIR
    VERSION=`ls Build*`
    echo `date` RUNNING $VERSION
    export VERSION=$VERSION
        echo ""
        echo `date` " - - - - - - - - - - - - - - - - - - - - - - -     CURRENT $VERSION SOFTWARE        - - - - - - - - - - - - - - - - - - - - - "
        echo  ""
    sleep 2
    echo `date` STARTING redis
    ( redis-cli shutdown 2>&1 ) >/dev/null #stop server if runniung
    ( redis-server --save "" --appendonly no 2>&1 ) >/dev/null &  #store nothing
    echo `date`" redis started"
    sleep 2

    #echo `date` $0 : killing old processes to be restarted
    #kill `cat $DARPDIR/*.pid`
    #sleep 1
    ./updateSW.bash #>/dev/null - we want to start with the newest software
    cd $DARPDIR
    export VERSION=`ls Build*`
    echo `date` "* * * * * * * * STARTING DARP $VERSION  * * * * * * * * * * * * * $GENESISIP $MYIP"
    echo `date` "* * * * * * * * STARTING DARP $VERSION  * * * * * * * * * * * * * $GENESISIP $MYIP"
    echo `date` "* * * * * * * * STARTING DARP $VERSION  * * * * * * * * * * * * * $GENESISIP $MYIP"
    echo `date` "* * * * * * * * STARTING DARP $VERSION  * * * * * * * * * * * * * $GENESISIP $MYIP"
    echo `date` "* * * * * * * * STARTING DARP $VERSION  * * * * * * * * * * * * * $GENESISIP $MYIP"
    if [ "$GENESISIP" = "$MYIP" ]; then
        echo `date` "I AM GENESIS NODE"
        echo `date` "I AM GENESIS NODE"
        echo `date` "I AM GENESIS NODE"
        echo `date` "I AM GENESIS NODE - Starting up auto-updater"
        ( ./updateSW.bash -deamon 2>&1 ) >/dev/null & #keep it checking every 30 seconds
    fi
    sleep 1

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
    rc=$?

    echo `date` DARP Finished rc=$rc
    echo `date` DARP Finished rc=$rc
    echo `date` DARP Finished rc=$rc
    sleep 5
    #
    #   Finished DARP - exit
    #
    kill `cat $DARPDIR/*.pid`    #kill all processes
    rm $DARPDIR/*.pid

//
//  
//
    case $rc in

  99)
    sudo reboot
    ;;

  PATTERN_2)
    
    ;;

  36)
        if [ -f $DARPDIR/forever ]; then
        echo `date` handlepulse exitted with rc=$rc
        echo `date` handlepulse exitted with rc=$rc
        echo `date` handlepulse exitted with rc=$rc
        echo `date` handlepulse exitted with rc=$rc
        echo `date` handlepulse exitted with rc=$rc
        cd $DARPDIR
        ls -l
        sleep 5 
    else 
        echo "* * * * * * Software Reload  ------ rc=36 ------ Software Reload * * * * * *"
        echo ""
        echo `date` "STOPPING $VERSION SOFTWARE " 
        echo  ""
        echo `date` "STOPPING $VERSION SOFTWARE"
        echo ""
        echo `date` "STOPPING $VERSION SOFTWARE"
        echo ""
        #echo "rc=120 means PAUSE Message"
        exit 36
    fi
    ;;

  *)
    echo `date` unexpected rc out of handlepulse rc=$rc
    ;;
esac
echo Sleeping...
sleep 2
sleep 5



done
