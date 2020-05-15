#!/bin/bash
#		    bootdarp.bash - fetch updated darp software and launch forever script
# 
#   This is the primary entry point for the container
#       We expect environmental variables on startup:
#           HOSTNAME - can be derived by `hostname` and put in the command line
#           
#       Optional parms:
#           WALLET - a wallet to SINGLESTEP credits and debits for use
#           GENESIS - a STOPPING point for connection into the mesh
# 
#       We create
#           GENESIS - if it isn't passed in , we find one from DrPeering
#           DARPDIR - the root of all darp info
#
echo `date` "------------------ $0 STARTING --------------------" 
echo `date` "------------------ $0 STARTING --------------------" 
echo `date` "------------------ $0 STARTING --------------------" 
echo `date` "------------------ $0 STARTING --------------------" 
echo `date` "------------------ $0 STARTING --------------------" 

export DARPDIR=$HOME/darp
if [ "$PORT" == "" ]; then 
    PORT=65013; 
fi
export PORT
echo PORT=$PORT

#MAY NOT NEED TO DO THIS ANYMORE - done in code
#MYIP=`curl ifconfig.io`
MYIP=`curl https://ip.noia.network/|sed '1,$s/\"//g'`  #NOIA has extra "surrounding"
echo `date` "MYIP fetch rc=$? MYIP=$MYIP"
export MYIP=$MYIP
echo `date` MYIP=$MYIP
#MAY NOT NEED TO DO THIS ANYMORE - done in code

if [ "$GENESIS" == "" ]; then
    echo `date` $0 You must specify a genesis node 
    echo `date` $0 Add -e"GENESIS=<ipaddr>" into the docker run command
    echo
    env
    exit -1
fi
#If the GENESIS variable ENV VAR does not exist then assume we are genesis node
if [ "$GENESIS" = "public" ]; then
   GENESIS=`curl http://drpeering.com/genesisnodes`
fi

echo `date` Genesis node: $GENESIS  "<--- Set GENESIS environmental variable to launch your own pulseGroup"
GENESISIP=`echo $GENESIS | awk -F: '{ print $1 }'`
echo GENESISIP=$GENESISIP

#update SW is destructive - should be done after run in docker loop
#when genesis node leanrs of new SW it quits and downloads 
#
#The order of startup is important here
echo `date` "$0 STARTING loop. GENESISIP=$GENESISIP MYIP=$MYIP"
echo `date` >$DARPDIR/forever
while :
do
    rm $DARPDIR/forever 2>/dev/null #comment this to re-run forever

    cd $DARPDIR
    VERSION=`ls Build*`
    echo `date` RUNNING $VERSION
    export VERSION=$VERSION
        echo ""
        echo `date` " - - - - - - - - - -     CURRENT $VERSION SOFTWARE        - - - - - - - - - - - - - - "
        echo  ""
    sleep 2
    echo `date` STARTING redis
    ( redis-cli shutdown 2>&1 ) >/dev/null #stop server if runniung
    ( redis-server --save "" --appendonly no 2>&1 ) >/dev/null &  #store nothing
    echo `date`" redis started"
    sleep 1

    #echo `date` $0 : killing old processes to be restarted
    #kill `cat $DARPDIR/*.pid`
    #sleep 1
    ./updateSW.bash #>/dev/null - we want to start with the newest software
    cd $DARPDIR
    export VERSION=`ls Build*`
    echo `date` "*  * * * * STARTING DARP $VERSION  * * * * * * * * * * * $GENESISIP $MYIP"
    echo `date` "* * *  * * * STARTING DARP $VERSION  * * * * * * * * * * * $GENESISIP $MYIP"
    echo `date` "* * * ** * * STARTING DARP $VERSION  * * * ** * * * * * * * $GENESISIP $MYIP"
    echo `date` "* * * * * * * STARTING DARP $VERSION  * * *  * * * * * * * * $GENESISIP $MYIP"
    echo `date` "* * * * * * * * STARTING DARP $VERSION  * * * * * * * * * * * * $GENESISIP $MYIP"
    if [ "$GENESISIP" = "$MYIP" ]; then

        echo `date` "I AM GENESIS NODE - Starting up auto-updater"
        ( ./updateSW.bash -deamon 2>&1 ) >/dev/null & #keep it checking every 30 seconds
        echo `date` "I AM GENESIS NODE"
        echo `date` "I AM GENESIS NODE ----->  Get others to join GENESIS="$GENESIS
        echo `date` "I AM GENESIS NODE"
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
    echo `date` "Starting express for nodeFactory and externalize stats"
    cd $DARPDIR/express
    node express &
    echo $$ > $DARPDIR/express.pid
    sleep 2

    #echo `date` Launching forever script
    #cd /darp/scripts
    #./forever.bash  #Start the system
    cd $DARPDIR
    echo `date` Connecting to GENESIS node to get my configuration
    cd $DARPDIR/config
    if [ -f  $DARPDIR/config.pid ]; then
        kill `cat $DARPDIR/config.pid`
        sleep 1
    fi
    node config &
    echo $$ > $DARPDIR/config.pid
    echo `date` Starting config to fetch config and code from genesis node
    sleep 1

    cd $DARPDIR
    cd $DARPDIR/pulser
    if [ -f  $DARPDIR/pulser.pid ]; then
        kill `cat $DARPDIR/pulser.pid`
    fi
    node pulser &
    echo $$ > $DARPDIR/pulser.pid
    echo `date` 'Starting pulser...'
    sleep 1

    cd $DARPDIR
    cd $DARPDIR/handlepulse
    if [ -f  $DARPDIR/handlepulse.pid ]; then
        kill `cat $DARPDIR/handlepulse.pid`
        sleep 1
    fi
    echo `date` Starting handlepulse
    node handlepulse #this will stop when handlepulse receives reload msg

    rc=$?
    echo `date` "- - - - - - - - - - - - FINISHED DARP $VERSION  - - - - - - - - - - -  rc=$rc"
    echo `date` "- - - - - - - - - - - - FINISHED DARP $VERSION  - - - - - - - - - - -  rc=$rc"
    echo `date` "- - - - - - - - - - - - FINISHED DARP $VERSION  - - - - - - - - - - -  rc=$rc"
    echo `date` "- - - - - - - - - - - - FINISHED DARP $VERSION  - - - - - - - - - - -  rc=$rc"
    echo `date` "- - - - - - - - - - - - FINISHED DARP $VERSION  - - - - - - - - - - -  rc=$rc"

    sleep 1

    if [ $rc -eq 86 ]; then exit 86; fi     #STOP COMMAND

    if [ $rc -eq 1 ]; then
        echo "rc=1"
    else
        if [ $rc -ne 36 ]; then
            echo "rc=$rc * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *"
            echo `date` "$0 rc=$rc ... handlePulse crashed, or updateSW.bash detected NEW SOFTWARE and killed handlepulse processes"
            echo `date` "$0 result: unexpected rc out of handlepulse $VERSION rc=$rc"
            if [ "$GENESISIP" = "$MYIP" ]; then
                echo `date` "  Ctrl-C         Ctrl-C           Ctrl-C         Ctrl-C "
                echo `date` "  Ctrl-C         Ctrl-C           Ctrl-C         Ctrl-C "
                echo `date` "  Ctrl-C         Ctrl-C           Ctrl-C         Ctrl-C "
                echo `date` "  Ctrl-C         Ctrl-C           Ctrl-C         Ctrl-C "
                echo `date` "  Ctrl-C         Ctrl-C           Ctrl-C         Ctrl-C "
                echo `date` "Ctrl-C detected --OR-- Genesis node needs updated code  "
                exit -1
            else
                echo `date` "Ctrl-C detected for non-genesis node"
            fi
        fi
    fi
    echo "ABOUT TO KILL TASKS --- ubuntu docker has pid in field #1, native might be #2   :  ps aux |grep -v grep | grep node | awk '{ print $1}'"
    ps aux |grep -v grep | grep node | awk '{ print $1}'
    echo `date` killing `ps aux |grep -v grep | grep node | awk '{ print $1}'`
    kill -9 `ps aux |grep -v grep | grep node | awk '{ print $1}'`
    kill -9 `ps aux |grep -v grep | grep updateSW.bash | awk '{ print $1}'`

    ps aux
    echo `date` "...................BOTTOM OF LOOP................... SLEEPING" 

    sleep 5
done
