#!/bin/bash
#		    bootdarp.bash - entry point for docker
#   1) fetch updated darp software and launch forever script
# 
#   
#       We expect environmental variables on startup:
#           HOSTNAME - can be derived by `hostname` and put in the command line
#           
#       Optional parms:
#           WALLET - a wallet to SINGLESTEP credits and debits for use
#           GENESIS - a point for connection into the mesh
# 
#       We create
#           GENESIS - if it isn't passed in , we find one from DrPeering
#           DARPDIR - the root of all darp info
#           WGDIR - the root for DARP wireguard info and log info
#
# WARNING - CHANGING THIS FILE REQUIRES -> NEW DOCKER BUILD
#
CURRENT_DOCKERVERSION=`ls Docker.*`
CURRENT_DARPVERSION=`ls Build.*`
PRESCRIBED_VERSION=`cat /etc/wireguard/STATE`
if [ "$PRESCRIBED_VERSION" == "" ]; then
    PRESCRIBED_VERSION="auto"
fi
echo `date` "------------------------------------------------- bootdarp.bash STARTING bootdarp.bash $CURRENTDOCKERVERSION:$CURRENTDARPVERSION  PRESCRIBED: $PRESCRIBED_VERSION"

SLEEPTIME=5 #time in seconds between software runs in forever loop
MAXCYCLES=1000 # of cycles before stopping
#This is a starting list of Bill's public genesis nodes located across clouds 
#export GENESISNODELIST=`cat genesis.config | awk '{ print $1"," }'`

#GENESISNODELIST=`cat awsgenesis.config genesis.config operators.config`   #ipublic NOIA DARP nodes From darpazure create scripts

#Let's force AZURE instances to be non-genesis nodes
export GENESISNODELIST=`cat awsgenesis.config operators.config|grep 65013`   #   IP:PORT:NAME
FIRST_GENESIS=`cat awsgenesis.config operators.config | grep 65013 | head -1 | awk -F, '{ print $1 }' `
#export GENESISNODELIST=`echo $GENESISNODELIST|sed '1,$s/ /,/g'`        #use comma separators 
#Format:      IP:PORT:NAME IP:PORT:NAME
echo GENESISNODELIST=$GENESISNODELIST

#MAY NOT NEED TO DO THIS ANYMORE - done in code
export MYIP=`curl ifconfig.io`

GENESIS_ENTRY=`grep $MYIP awsgenesis.config operators.config`     #GENESIS NODES for now in these files
if [ $? -eq 0 ]; then
    export GENESIS=$MYIP
    echo `date` "0000000000000000000000 0 0 0 0 0 0 0 0 0 0 0     G E N E S I S   NODE          0 0 0 0 0 0 0 0 0 0  bootdarp.bash says we are GENESIS NODE $IP"
else
    echo `date` "********************************************************* GENESIS=auto: Starting PORT TEST TO FIND CLOSEST  - Before STARTING GENESIS=$GENESIS"
    echo `date` "***** GENESISNODESLIST=$GENESISNODELIST"

    #node scripts/testport.ts $MYIP 65013 `cat awsgenesis.config genesis.config operators.config` >porttest.txt
    node scripts/testport.ts $MYIP 65013 $GENESISNODELIST >porttest.txt
    echo "***************************************************     PORTS AVAILABLE TO CONNECT TO     **************************************" 

    cat porttest.txt
    echo "BEST CHOICES IN ORDER OF LATENCY"
    echo "FIRST LINE:" `cat porttest.txt | head -1`
    export SWVERSION=`cat porttest.txt | grep Docker | head -1 | awk -F, '{ print $3}'`
    #export GENESIS=`cat porttest.txt | grep Docker | head -1 | awk -F, '{ print $4}'`   I think we want the GENESIS passed in
    export GENESISIP=`cat porttest.txt | grep Docker | head -1 | awk -F, '{ print $4}'`
    export GENESISPORT=`cat porttest.txt | grep Docker | head -1 | awk -F, '{ print $5}'`
    export GENESISGEO=`cat porttest.txt | grep Docker | head -1 | awk -F, '{ print $6}'`
    export GENESISGROUP=`cat porttest.txt | grep Docker | head -1 | awk -F, '{ print $7}'`
    echo `date` "bootdarp.bash: SWVERSION=$SWVERSION GENESIS=$GENESIS GENESISIP=$GENESISIP GENESISPORT=$GENESISPORT GENESISGEO=$GENESISGEO GENESISGROUPGROUP=$GENESISGROUP "
fi

if [ "$GENESISIP" == "" -a "$FIRST_GENESIS" != "$MYIP" ]; then
    echo `date` "$0 No genesis nodes answered request to connect... check that your UDP/TCP/ICMP ports open on your firewall ...EXITTING..."
    echo `date` "$0 Configure ports 65013/TCP open and 65013-65200/UDP open and enable ICMP for diagnostics on your computer and any firewalls/routers in the network path"
    echo "***************************************************     COULD NOT CONNECT TO ANY PUBLIC GENESIS NODES - EXITTING     **************************************" 
    echo "***************************************************     COULD NOT CONNECT TO ANY PUBLIC GENESIS NODES - EXITTING     **************************************" 
    echo "***************************************************     COULD NOT CONNECT TO ANY PUBLIC GENESIS NODES - EXITTING     **************************************" 
    echo "***************************************************     TRAY AGAIN LATER>....     **************************************" 
    echo "***************************************************     try connecting directly to lead genesis node: ___:___ ?    **************************************" 

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
    cd $DARPDIR
    echo `date` TOP OF LOOP 

    rm $DARPDIR/forever 2>/dev/null #comment this to re-run forever
    #rm $DARPDIR/GENESIS.* 2>/dev/null # remove old GENESIS files 
    PRESCRIBED_DOCKERVERSION=`cat /etc/wireguard/STATE`
    echo `date` "*************************** PRESCRIBED_DOCKERVERSION = $PRESCRIBED_DOCKERVERSION "
    ./updateSW.bash #$PRESCRIBED_DOCKERVERSION   #  UPDATE SOFTWARE >/dev/null - we want to start with the newest software
    rc=$?
    echo `date` return from updateSW is $rc     
    if [ $rc -ne 0 ]; then  
        echo `date` done running $PRESCRIBED_DOCKERVERSION
        exit 1 
    fi
    # we could exit if rc= non-zero. updateSW could replicate the code from git, move it into place and run it instead of the rest of this script

    cd /tmp
    cd /root/darp
    export DARPVERSION=`ls Build*`
    export DOCKERVERSION=`ls Docker.*`
    export VERSION="${DOCKERVERSION}:${DARPVERSION}"    # DOCKERVERSION comes in as environmental variable
    echo PRESCRIBED_DOCKERVERSION=$PRESCRIBED_DOCKERVERSION      RUNNING version $VERSION

    echo `date` "+ + + +RUNNING DARP $VERSION rc=$rc from updateSW.bash"    #VERSION should eventually be a HASH over the docker itself, mapped to docker tag
    env

    echo `date` " - - - - - - - - - -     STARTING BOOTDARP CURRENT DRP $VERSION SOFTWARE        - - - - - - - - - - - - - - "
    sleep 2
  
    cd $DARPDIR
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

    echo $DOCKERVERSION > $WGDIR/STATE 
    echo `date` wireguard STATE file says we should be running DOCKER: `cat /etc/wireguard/STATE`

    cd $DARPDIR/dist
    echo `date` "============================================================ Starting DARP $VERSION : node index ..."

	node index #> $DARPDIR/darp.log
    #
    #       darp exitted 
    #
#	node index 
    rc=$?
    echo `date` "FINISHED DARP Protocol index.js done rc=$rc  wireguard DOCKER=`cat /etc/wireguard/STATE`" #| tee -a NOIA.log

    echo `date` "- - - - - - - - - - - - FINISHED DARP $VERSION  -   either new DARP code or new docker  - - - - -  rc=$rc" #| tee -a NOIA.log 
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
        echo "rc=0 - New Docker Available: "`cat /etc/wireguard/STATE` 
        exit 0
    else
        if [ $rc -ne 36 ]; then
            echo "rc=$rc * * * * * * * * * * * *         uNKNOWN rc        E X I T T I N G               * * * * * * * * * * * * * * * * * * *"
            echo `date` "$0 rc=$rc ... handlePulse crashed, or updateSW.bash detected NEW SOFTWARE and killed handlepulse processes"
            echo `date` "$0 result: unexpected rc from $VERSION rc=$rc"    #| tee -a NOIA.log 
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
    
    
    echo `date` "killing lingering processes"
    kill -9 `ps aux |grep -v grep | grep updateSW.bash | awk '{ print $1}'`
    #kill -9 `ps aux |grep -v grep | grep sender | awk '{ print $1}'`  #can delete this
    kill -9 `ps aux |grep -v grep | grep ping | awk '{ print $1}'`  #can delete this
    #kill -9 `ps aux |grep -v grep | grep receiver | awk '{ print $1}'`  #can delete this
    kill -9 `ps aux |grep -v grep | grep launchrtt | awk '{ print $1}'`

    find /root/darp/history -type f -mmin +7 -print       #Remove old history files so we don't fill up disk This could be done out of cron every minute

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
