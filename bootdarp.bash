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
echo `date` "------------------ $0 STARTING DARP v0.5 --------------------" 

SLEEPTIME=5 #time in seconds between software runs in forever loop
MAXCYCLES=100 # of cycles before stopping

#This is a list of 50 genesis nodes collected from clouds
export GENESISNODELIST=138.91.172.190,40.112.50.65,40.127.188.109,52.233.170.100,13.70.39.116,13.76.221.15,52.240.148.3,104.215.99.105,52.176.160.128,40.70.41.9,20.48.23.201,191.237.254.39,20.193.66.26,13.73.116.142,13.71.23.119,52.172.3.173,52.228.59.73,52.250.10.210,51.11.143.229,52.231.12.15,52.231.143.200,51.103.23.44,102.37.49.240,40.123.229.233,51.103.151.110,51.116.114.238
# we will use feew so we can test the group code
export GENESISNODELIST=20.48.23.201,51.11.143.229,51.103.23.44,51.116.114.238,52.176.160.128,51.116.114.238
AWSnodes=35.183.12.252,54.66.225.145,52.10.8.19,54.183.237.188,3.14.252.23,157.175.82.116,13.244.111.113,13.233.206.71,18.162.246.217,100.25.119.250,3.8.160.148,54.246.137.23,3.121.201.31,15.161.44.84,54.95.7.86
#This is a list of Azure nodes
unameOut="$(uname -s)"
case "${unameOut}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    CYGWIN*)    MACHINE=Cygwin;;
    MINGW*)     MACHINE=MinGw;;
    *)          MACHINE="UNKNOWN:${unameOut}"
esac
export MACHINE
echo `date` "Machine type: ${MACHINE} - we need to know this for some wg host cmds."


export DARPDIR=$HOME/darp
if [ "$PORT" == "" ]; then 
    PORT=65013; 
fi
#export WGDIR=/etc/wireguard
#export WGDIR=$DARPDIR/wireguard
export WGDIR=/etc/wireguard
export PORT
echo PORT=$PORT

#MAY NOT NEED TO DO THIS ANYMORE - done in code
MYIP=`curl ifconfig.io`
#MYIP=`curl https://ip.noia.network/|sed '1,$s/\"//g'`  #NOIA has extra "surrounding"
echo `date` "MYIP fetch rc=$? MYIP=$MYIP"
export MYIP=$MYIP
echo `date` MYIP=$MYIP
#MAY NOT NEED TO DO THIS ANYMORE - done in code

#if [ "$GENESIS" == "" ]; then
#    echo `date` $0 You must specify a genesis node 
#    echo `date` $0 Add -e GENESIS=<ipaddr> into the docker run command or set the environmental variable
#    echo
#    env
#    exit -1
#fi

#echo `date` Genesis node: $GENESIS  "<--- Set GENESIS environmental variable to launch your own pulseGroup"
#GENESISIP=`echo $GENESIS | awk -F: '{ print $1 }'`
#echo GENESISIP=$GENESISIP

#update SW is destructive - should be done after run in docker loop
#when genesis node leanrs of new SW it quits and downloads 
#
#The order of startup is important here
echo `date` "$0 STARTING loop. MYIP=$MYIP"
CYCLES=0;
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
  
    ./updateSW.bash #>/dev/null - we want to start with the newest software
    cd $DARPDIR
    export VERSION=`ls Build*`
    echo `date` "* * STARTING DARP $VERSION  * * * * * * $MYIP"

    #Now we are running in the new code /root/darp directory of docker
    echo `date` Configuring Wireguard
    cd $DARPDIR/scripts/
    ./configWG.bash #>/dev/null
    export PUBLICKEY=`cat $WGDIR/publickey`
    echo PUBLICKEY=$PUBLICKEY

    cd $DARPDIR
    cd $DARPDIR/dist
    if [ -f  $DARPDIR/index.pid ]; then
        kill `cat $DARPDIR/index.pid`
    fi
    echo `date` 'Starting DARP...'
	node index
    rc=$?
    echo `date` index done rc=$rc

    echo `date` "- - - - - - - - - - - - FINISHED DARP $VERSION  - - - - - - - - - - -  rc=$rc"
    echo `date` "- - - - - - - - - - - - FINISHED DARP $VERSION  - - - - - - - - - - -  rc=$rc"
    echo `date` "- - - - - - - - - - - - FINISHED DARP $VERSION  - - - - - - - - - - -  rc=$rc"
    echo `date` "- - - - - - - - - - - - FINISHED DARP $VERSION  - - - - - - - - - - -  rc=$rc"
    echo `date` "- - - - - - - - - - - - FINISHED DARP $VERSION  - - - - - - - - - - -  rc=$rc"

#    cd $DARPDIR
#    if [ $? -ne 0 ]; then
#        echo `date` "System Corrupt: Can't find DARP SW root- ERROR - Exitting"
#        exit 86;
#    fi
    
#    sleep 1

    if [ $rc -eq 86 ]; then echo `date`" STOPPING - STOP MESSAGE RECEIVED"; exit 86; fi     #STOP COMMAND

    if [ $rc -eq 1 ]; then
        echo "rc=1"
    else
        if [ $rc -ne 36 ]; then
            echo "rc=$rc * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *"
            echo `date` "$0 rc=$rc ... handlePulse crashed, or updateSW.bash detected NEW SOFTWARE and killed handlepulse processes"
            echo `date` "$0 result: unexpected rc out of handlepulse $VERSION rc=$rc"
            exit -1
        fi
    fi
    #
    #   could simply - for app in list, and in this order, start or stop them all
    #
    #echo "ABOUT TO KILL TASKS --- ubuntu docker has pid in field #1, native might be #2   :  ps aux |grep -v grep | grep node | awk '{ print $1}'"
    #ps aux |grep -v grep | grep node | awk '{ print $1}'
    #echo `date` killing `ps aux |grep -v grep | grep node | awk '{ print $1}'`
    #kill -9 `ps aux |grep -v grep | grep node | awk '{ print $1}'`
    
    echo `date` Before killing other processes...
    ps aux 

    kill -9 `ps aux |grep -v grep | grep updateSW.bash | awk '{ print $1}'`
    kill -9 `ps aux |grep -v grep | grep sender.js | awk '{ print $1}'`
    kill -9 `ps aux |grep -v grep | grep receiver.js | awk '{ print $1}'`
    sleep 1
    echo `date` After killing other processes...

    ps aux
    #ps aux
    cd $DARPDIR  #TESTING TO SEE IF $DARPDIR EXISTS

    CYCLES=`expr $CYCLES + 1`
    echo `date` "...................BOTTOM OF LOOP #$CYCLES of $MAXCYCLES ............. SLEEPING "$SLEEPTIME 
    if [ $CYCLES -gt $MAXCYCLES ]; then    
        echo `date` "RAN 100 CYCLES - $0 EXiTTING"
        exit 86;
    fi
    sleep $SLEEPTIME
done
