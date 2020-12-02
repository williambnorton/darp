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
echo `date` "---------------------------------------------------------- $0 STARTING bootdarp.bash  ------------------------------------------------------------" 
SLEEPTIME=5 #time in seconds between software runs in forever loop
MAXCYCLES=1000 # of cycles before stopping

#This is a starting list of Bill's public genesis nodes located across clouds 
#export GENESISNODELIST=`cat genesis.config | awk '{ print $1"," }'`

GENESISNODELIST=`cat awsgenesis.config genesis.config operators.config`   #ipublic NOIA DARP nodes From darpazure create scripts

#Let's force AZURE instances to be non-genesis nodes
GENESISNODELIST=`cat awsgenesis.config operators.config`   #let force Azure nodes to be member nodes, not genesis nodes

export GENESISNODELIST=`echo $GENESISNODELIST|sed '1,$s/ /,/g'`        #use comma separators 

#MAY NOT NEED TO DO THIS ANYMORE - done in code
export MYIP=`curl ifconfig.io`
grep $MYIP awsgenesis.config operators.config
if [ $? -eq 0 ]; then
    export GENESIS=$MYIP
    echo `date` "0000000000000000000000 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0  bootdarp.bash says we are GENESIS NODE $IP"
 lse
    echo `date` "********************************************************* GENESIS=auto: Starting PORT TEST TO FIND CLOSEST  - Before STARTING GENESIS=$GENESIS"

    #node scripts/testport.ts $MYIP 65013 `cat awsgenesis.config genesis.config operators.config` >porttest.txt
    node scripts/testport.ts $MYIP 65013 `cat awsgenesis.config operators.config` >porttest.txt
     cat porttest.txt
    
    export GENESIS=`cat porttest.txt | grep Build | head -1 | awk -F, '{ print $4}'`
    export GENESISIP=`cat porttest.txt | grep Build | head -1 | awk -F, '{ print $4}'`
    export GENESISPORT=`cat porttest.txt | grep Build | head -1 | awk -F, '{ print $5}'`
    echo `date` "DONE PORT TEST - SETTING GENESIS TO $GENESIS"
fi
echo `date` Choosing GENESIS=$GENESIS
echo `date` Starting list of genesis nodes : $GENESISNODELIST

if [ "$GENESIS" == "" ]; then
    echo `date` Could not find genesis node to connect to...EXITTING...
    exit 36; 
fi





unameOut="$(uname -s)"
case "${unameOut}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    CYGWIN*)    MACHINE=Cygwin;;
    MINGW*)     MACHINE=MinGw;;
    *)          MACHINE="UNKNOWN:${unameOut}"
esac
export MACHINE
#echo `date` "Machine type: ${MACHINE} - we need to know this for some wg host cmds."


export DARPDIR=$HOME/darp
if [ "$PORT" == "" ]; then 
    PORT=65013; 
fi
#export WGDIR=/etc/wireguard
#export WGDIR=$DARPDIR/wireguard
export WGDIR=/etc/wireguard
export PORT

echo `date` "$0 STARTING DARP DARP DARP MYIP=$MYIP GENESIS=$GENESIS" 
CYCLES=0;
echo `date` >$DARPDIR/forever
while :
do
    echo "RUNNING">$WGDIR/STATE 

    echo `date` TOP OF LOOP







    rm $DARPDIR/forever 2>/dev/null #comment this to re-run forever
    #rm $DARPDIR/GENESIS.* 2>/dev/null # remove old GENESIS files 

    ./updateSW.bash #>/dev/null - we want to start with the newest software
    rc=$$
    cd $DARPDIR
    export DARPVERSION=`ls Build.*`
    export DOCKERVERSION=`ls Docker\.*`
    export VERSION=`echo "$DOCKERVERSION:$DARPVERSION"`    # DOCKERVERSION comes in as environmental variable
    echo `date` "RUNNING DARP $VERSION rc=$rc from updateSW.bash"    #VERSION should eventually be a HASH over the docker itself, mapped to docker tag
    env

    echo `date` " - - - - - - - - - -     STARTING BOOTDARP CURRENT DRP $VERSION SOFTWARE        - - - - - - - - - - - - - - "
    sleep 2
  
    cd $DARPDIR
    #export VERSION=`ls Build*`
    echo `date` "* * = = = = = = = = = = = = = = = = = = = STARTING DARP $VERSION  * * * * * * $MYIP = = = = = = = = = = = = "  

    #Now we are running in the new code /root/darp directory of docker
    echo `date` "bootdarp Now Configuring Wireguard"
    cd $DARPDIR/scripts/ 
    ./configWG.bash #>/dev/null
 
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

    #ps



    cd $DARPDIR/dist
    echo `date` "============================================================ Starting DARP $VERSION : node index ..."

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

    if [ $rc -eq 86 ]; then echo `date`" STOPPING - STOP MESSAGE RECEIVED" ; echo "STOP">$WGDIR/STATE;  exit 86; fi     #STOP COMMAND

    if [ $rc -eq 0 ]; then
        echo "rc=0 - New Docker Available"
        echo "NEWDOCKER" > $WGDIR/STATE;
        exit 0
    else
        if [ $rc -ne 36 ]; then
            echo "rc=$rc * * * * * * * * * * * *         uNKNOWN rc        E X I T T I N G               * * * * * * * * * * * * * * * * * * *"
            echo `date` "$0 rc=$rc ... handlePulse crashed, or updateSW.bash detected NEW SOFTWARE and killed handlepulse processes"
            echo `date` "$0 result: unexpected rc from $VERSION rc=$rc"    #| tee -a NOIA.log 
            echo "NEWDOCKER">$WGDIR/STATE     #USING SHARED DRIVE TO SIGNAL DOCKER RELOAD OR DIE
            exit 0
        else    
            echo `date` SIMPLE SOFTWARE RELOAD so DOCKER REMAINS
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
    #kill -9 `ps aux |grep -v grep | grep sender | awk '{ print $1}'`  #can delete this
    kill -9 `ps aux |grep -v grep | grep ping | awk '{ print $1}'`  #can delete this
    #kill -9 `ps aux |grep -v grep | grep receiver | awk '{ print $1}'`  #can delete this
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
