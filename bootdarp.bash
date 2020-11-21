#!/bin/bash
#		    bootdarp.bash - fetch updated darp software and launch forever script
#                       This is run by the docker as entrypoint
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
#           WGDIR - the root for DARP wireguard info and log info
#
# WARNING - CHANGING THIS FILE REQUIRES A RELOAD -> NEW DOCKER BUILD
#
echo `date` "------------------ $0 STARTING DARP  --------------------" 

SLEEPTIME=5 #time in seconds between software runs in forever loop
MAXCYCLES=1000 # of cycles before stopping

#This is a starting list of Bill's public genesis nodes located across clouds 
#export GENESISNODELIST=`cat genesis.config | awk '{ print $1"," }'`

GENESISNODELIST=`cat genesis.config awsgenesis.config operators.config`   #ipublic NOIA DARP nodes From darpazure create scripts
export GENESISNODELIST=`echo $GENESISNODELIST|sed '1,$s/ /,/g'`

echo `date` Starting list of genesis nodes : $GENESISNODELIST

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
echo `date` MYIP=$MYIP     #MAY NOT NEED TO DO THIS ANYMORE - done in code







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


echo `date` "$0 STARTING DARP DARP DARP MYIP=$MYIP" 
CYCLES=0;
echo `date` >$DARPDIR/forever
while :
do
    echo `date` TOP OF LOOP

    rm $DARPDIR/forever 2>/dev/null #comment this to re-run forever
    #rm $DARPDIR/GENESIS.* 2>/dev/null # remove old GENESIS files 

    cd $DARPDIR
    VERSION=`ls Build*`
    echo `date` RUNNING $VERSION
    export VERSION=$VERSION
    echo `date` " - - - - - - - - - -     STARTING BOOTDARP CURRENT DRP $VERSION SOFTWARE        - - - - - - - - - - - - - - "
    sleep 2
  
    ./updateSW.bash #>/dev/null - we want to start with the newest software
    cd $DARPDIR
    export VERSION=`ls Build*`
    echo `date` "* * = = = = = = = = = = = = = = = = = = = STARTING DARP $VERSION  * * * * * * $MYIP = = = = = = = = = = = = "  

    #Now we are running in the new code /root/darp directory of docker
    echo `date` Now Configuring Wireguard
    cd $DARPDIR/scripts/

 
 
 echo `date` " ****************************************     WOULD DO CONFIGWG HERE   ************************************"
 
 
    ./configWG.bash #>/dev/null
 
 
 echo `date` " ****************************************     WOULD DO CONFIGWG HERE   ************************************"
 
 
 
    export PUBLICKEY=`cat $WGDIR/publickey`
    echo PUBLICKEY=$PUBLICKEY

    cd $DARPDIR
    cd $DARPDIR/dist
    if [ -f  $DARPDIR/index.pid ]; then
        kill `cat $DARPDIR/index.pid`
    fi
    
    #echo "Here we could / should? send a pulse to a genesis node that verify ports are bidirectionally open.... For this, genesis should respond with a NO_SUCH message Verifying the ports have been opened in both directions"
    #echo PORTCHECK
    #BSMSG="1603288999696,1603288999611,0,Build.201021.0619,UNRECOGNIZEDGEO,UNRECOGNIZEDGROUP,3,1603288998189,99999,1"


    echo `date` " * * * * * * * * * * * * * * * * *  $0 STARTING DARP SUBAGENTS   * * * * * * * * * * * * * * * * * " 
    cd 
    cd /root/darp/subagents/rtt/; ls -l ; 
    ./launchrtt.bash & 
    echo $$ >$DARPDIR/launchrtt.pid
    echo `date` "BYPASSING * * * * * * * * * * * * * * * * * Starting subagents  rtt wg_rtt traceroute * * * * * * * * * * * * * * * * * * * * * * "

    #ps



    cd $DARPDIR/dist
    echo `date` "Starting DARP $VERSION as index ..."
	node index #> $DARPDIR/darp.log
    #
    #       darp exitted 
    #
#	node index 
    rc=$?
    echo `date` "FINISHED DARP Protocol index.js done rc=$rc" #| tee -a NOIA.log

    echo `date` "- - - - - - - - - - - - FINISHED DARP $VERSION  - - - - - - - - - - -  rc=$rc" #| tee -a NOIA.log 
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

    if [ $rc -eq 86 ]; then echo `date`" STOPPING - STOP MESSAGE RECEIVED" ; exit 86; fi     #STOP COMMAND

    if [ $rc -eq 1 ]; then
        echo "rc=1"
    else
        if [ $rc -ne 36 ]; then
            echo "rc=$rc * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *"
            echo `date` "$0 rc=$rc ... handlePulse crashed, or updateSW.bash detected NEW SOFTWARE and killed handlepulse processes"
            echo `date` "$0 result: unexpected rc out of handlepulse $VERSION rc=$rc"    #| tee -a NOIA.log 
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
    
    
    echo `date` killing lingering processes
    kill -9 `ps aux |grep -v grep | grep updateSW.bash | awk '{ print $1}'`
    kill -9 `ps aux |grep -v grep | grep sender | awk '{ print $1}'`  #can delete this
    kill -9 `ps aux |grep -v grep | grep receiver | awk '{ print $1}'`  #can delete this
    kill -9 `ps aux |grep -v grep | grep launchrtt | awk '{ print $1}'`


    if [ -f  $DARPDIR/index.pid ]; then
        kill `cat $DARPDIR/index.pid`
    fi

    ps aux

    cd $DARPDIR  #TESTING TO SEE IF $DARPDIR EXISTS

    CYCLES=`expr $CYCLES + 1`
    echo `date` "...................BOTTOM OF LOOP #$CYCLES of $MAXCYCLES ............. SLEEPING "$SLEEPTIME #| tee -a NOIA.log 
    if [ $CYCLES -gt $MAXCYCLES ]; then    
        echo `date` "RAN 100 CYCLES - $0 EXiTTING"  #| tee -a NOIA.log 
        exit 86;
    fi
    sleep $SLEEPTIME
done
