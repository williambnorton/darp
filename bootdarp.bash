#!/bin/bash
#           
#		    bootdarp.bash - entry point for docker
# 
#       We set up the operating environmental variables on startup:
#           HOSTNAME = passed in --> used as 'geo' for now - turns out helpful to have a human readbale name
#           PORT = my open UDP/TCP port
#           GENESIS = a specific Genesis node to connect to (IP:Port or PUBLICKEY)
#           WALLET - a wallet with micro credits and debits for use in auto mode
#       We create the rest:
#           DARPDIR - the root directory of all darp ( /root/darp ) 
#           WGDIR - the root for DARP wireguard info and log info ( ~/wireguard/ )
# Environmental variables we assemble
#	    MY_IP - 
#	    MY_PORT - 
#	    MY_GEO - HOSTNAME for now
#	    MY_SWVERSION - 
#	    MACHINE - OS Type of machine - Linux, MacOs, Windows
# Information about the GENESIS node we are or will connect to
#           GENESISNODELIST - IP,PORT,NAME ...  IP,PORT,NAME 
#           FIRSTGENESIS - IP,PORT,NAME   <--- use this for software version check
#           GENESIS - a point for connection into the mesh <IP>:<PORT>
#           GENESIS_IP - IP addreess of targetted genesis node to join
#           GENESIS_PORT - 
#           GENESIS_GEO -
#           GENESIS_SWVERSION -
# 
#
# 	bootdarp.bash variables 
#
echo `date` "Starting bootdarp.bash in docker "
SLEEPTIME=25 #time in seconds between software runs in forever loop
MAXCYCLES=10 # of cycles before reloading docker
unameOut="$(uname -s)"
case "${unameOut}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    CYGWIN*)    MACHINE=Cygwin;;
    MINGW*)     MACHINE=MinGw;;
    *)          MACHINE="UNKNOWN:${unameOut}"
esac
export MACHINE
export DARPDIR=$HOME/darp
export WGDIR=/etc/wireguard

export MY_GEO=$HOSTNAME		#
if [ "$MY_PORT" == "" ]; then
    MY_PORT=65013    
fi
export MY_PORT
export MY_IP=`curl ifconfig.io`	#	get my public IP
CURRENT_DOCKERVERSION=`ls Docker.*`
CURRENT_DARPVERSION=`ls Build.*`
export MY_SWVERSION=$CURRENT_DOCKERVERSION:$CURRENT_DARPVERSION
echo $CURRENT_DOCKERVERSION > /etc/wireguard/STATE  #store running Docker VERSION  

echo `date` "# bootdarp.bash STARTING bootdarp.bash MY_IP=$MY_IP MY_PORT=$MY_PORT MY_GEO=$MY_GEO MY_SWVERSION=$MY_SWVERSION SLEEPTIME=$SLEEPTIME MAXCYCLES=$MAXCYCLES"

#	
# 	setting up my GENESIS variables for operation          
#           
export GENESISNODELIST=`cat *.config | sed ':a;N;$!ba;s/\n/ /g' `   #   IP:PORT:NAME
#echo bash says GENESISNODELIST=$GENESISNODELIST
FIRST_GENESIS=`cat *.config | grep 65013 | head -1 | awk -F, '{ print $1 }' `   #First one is where we get code and config
echo `date` "$0 STARTING DARP MY_IP=$MY_IP GENESIS=$GENESIS FIRST_GENESIS=$FIRST_GENESIS" 
CYCLES=0;
while :
do
    if [ "$MY_IP" == "$FIRST_GENESIS" ]; then 
        GENESIS=$MY_IP:$MY_PORT
    fi

    #GENESIS=""   #un comment this to connect to tclosest genesis each cycle - dynamic
    if [ "$GENESIS" != "" ]; then       #   user-specified over rides "auto" connection to Genesis node list participants
        FIRST_RESPONDER_LATENCY=0   
        MY_GENESIS_IP=`echo $GENESIS|awk -F: '{ print $1 }'`
        MY_GENESIS_PORT=`echo $GENESIS|awk -F: '{ print $2 }'`
        if [ "$MY_GENESIS_PORT" == "" ]; then
            MY_GENESIS_PORT=65013
        fi
        MY_GENESIS_GEO=$MY_GEO  #
        MY_GENESIS_GROUP="${MY_GEO}.1"
        MY_GENESIS_SWVERSION="$CURRENT_DOCKERVERSION:$CURRENT_DARPVERSION"
        echo `date` "User-overide: user wants to connecting to Genesis $MY_GENESIS_GEO $MY_GENESIS_IP:$MY_GENESIS_PORT"
    else
        echo "bootdarp.bash AUTO MODE - Testing ports to  genesis nodes: $GENESISNODELIST"
        #rm testport.txt
        #scripts/testport.bash #| grep Docker. | grep -v '#' >testport.txt
        scripts/testport.bash | grep Docker. | grep -v '#' >testport.txt

        echo `date` testport.txt follows
        cat testport.txt
        #FIRST_LINE=`cat testport.txt | grep Docker. | grep '#' | head -1 | grep -v SELF`
        FIRST_LINE=`cat testport.txt | grep -v SELF | head -1`
        echo "First to respond ... FIRST_LINE=$FIRST_LINE"
        FIRST_RESPONDER_LATENCY=`echo $FIRST_LINE | awk -F, '{ print $1}'`
        echo `date` FIRST_RESPONDER_LATENCY=$FIRST_RESPONDER_LATENCY
        if [ "$FIRST_LINE" != "" -a $FIRST_RESPONDER_LATENCY -lt 25 ]; then
            #FIRST_RESPONDER_LATENCY=`echo $FIRST_LINE | awk -F, '{ print $1}'`
            MY_GENESIS_IP=`echo $FIRST_LINE | awk -F, '{ print $2}'`
            MY_GENESIS_PORT=`echo $FIRST_LINE | awk -F, '{ print $3}'`
            MY_GENESIS_GEO=`echo $FIRST_LINE | awk -F, '{ print $4}'`
            MY_GENESIS_GROUP="${MY_GENESIS_GEO}.1"
            MY_GENESIS_SWVERSION=`echo $FIRST_LINE | awk -F, '{ print $5 }'`
            echo `date` "Connecting to first Genesis to respond: $MY_GENESIS_GEO $MY_GENESIS_IP:$MY_GENESIS_PORT"
        else    #default to self as a standalone genesis node 
            FIRST_RESPONDER_LATENCY="0"
            MY_GENESIS_IP=$MY_IP
            MY_GENESIS_PORT=$MY_PORT
            MY_GENESIS_GEO=$MY_GEO
            MY_GENESIS_GROUP=${MY_GEO}.1
            MY_GENESIS_SWVERSION="$CURRENT_DOCKERVERSION:$CURRENT_DARPVERSION"
            echo `date` "Connecting to SELF: $MY_GENESIS_SWVERSION "
        fi
    fi
    #
    export GENESIS="$MY_GENESIS_IP:$MY_GENESIS_PORT"    # from here on forward we will continue to use this updated Genesis node and port
    echo `date` "******* bootdarp.bash We are going to join : GENESIS=$GENESIS MY_IP=$MY_IP MY_PORT=$MY_PORT  MY_GENESIS_GEO=$MY_GENESIS_GEO MY_GENESIS_IP=$MY_GENESIS_IP MY_GENESIS_PORT=$MY_GENESIS_PORT MY_GENESIS_SWVERSION=$MY_GENESIS_SWVERSION"

    cd $DARPDIR
    echo `date` TOP OF LOOP 
    #find /root/darp/history -type f -mmin +7 -print       #Remove old history files so we don't fill up disk This could be done out of cron every minute

    #PRESCRIBED_DOCKERVERSION=`cat /etc/wireguard/STATE`      #### If we were restarted to start a new Docker, this would contain the new docker tag

    DARP_SWVERSION=`echo $MY_GENESIS_SWVERSION | awk -F: '{ print $2 }'`   # <Docker.YYMMDD.HHMM>:<Build.YYMMDD.HHMM>

    if [ "$MY_GENESIS_SWVERSION" == "$CURRENT_DOCKERVERSION:$CURRENT_DARPVERSION" ]; then
        echo `date` "!!! We are genesis node so we are already running the latest SW"
        #./updateSW.bash
    else
        echo `date` "        ***** DARP_SWVERSION = $DARP_SWVERSION "
        ./updateSW.bash $MY_GENESIS_SWVERSION #$DARP_SWVERSION     #we want to start with the newest software
        rc=$?
        echo `date` "return from updateSW $DARP_SWVERSION is $rc " 
        if [ $rc -ne 0 ]; then  
            echo `date` "bootdarp.bash - NOT EXITTING NOW bad rc from updateSW.bash.... BOOTDARP EXITTING rc=$rc"  #"bootdarp.bash UNRAVELING done running ./$PRESCRIBED_DOCKERVERSION"
            echo `date` "bootdarp.bash - NOT EXITTING NOW bad rc from updateSW.bash.... BOOTDARP EXITTING rc=$rc"  #"bootdarp.bash UNRAVELING done running ./$PRESCRIBED_DOCKERVERSION"
            echo `date` "bootdarp.bash - NOT EXITTING NOW bad rc from updateSW.bash.... BOOTDARP EXITTING rc=$rc"  #"bootdarp.bash UNRAVELING done running ./$PRESCRIBED_DOCKERVERSION"
            echo `date` "bootdarp.bash - NOT EXITTING NOW bad rc from updateSW.bash.... BOOTDARP EXITTING rc=$rc"  #"bootdarp.bash UNRAVELING done running ./$PRESCRIBED_DOCKERVERSION"
            #exit $rc   #pass through any subsequent bootdarp invocations
        fi

    fi

    # we could exit if rc= non-zero. updateSW could replicate the code from git, move it into place and run it instead of the rest of this script

    cd /tmp
    cd /root/darp
    DARPVERSION=`ls Build*`
    DOCKERVERSION=`ls Docker.*`
    export VERSION="${DOCKERVERSION}:${DARPVERSION}"    # DOCKERVERSION comes in as environmental variable
    #echo PRESCRIBED_DOCKERVERSION=$PRESCRIBED_DOCKERVERSION      RUNNING version $VERSION

    echo `date` "+ + + +RUNNING DARP $VERSION rc=$rc from updateSW.bash"    #VERSION should eventually be a HASH over the docker itself, mapped to docker tag
    #env

    echo `date` " - - - - - - - - - -     STARTING BOOTDARP CURRENT DRP $VERSION SOFTWARE GENESIS=$GENESIS       - - - - - - - - - - - - - - "
    sleep 2
  
    cd $DARPDIR
    echo `date` "* * = = = = = = = = = = = = = = = = = = = STARTING DARP $VERSION  * * * * * * $MY_IP = = = = = = = = = = = = "  

    #Now we are running in the new code /root/darp directory of docker
    #echo `date` "bootdarp Now Configuring Wireguard"
    cd $DARPDIR/scripts/ 
    ./configWG.bash # create directory for host-container communications / reset STATE
 
    export PUBLICKEY=`cat $WGDIR/publickey`
    echo PUBLICKEY=$PUBLICKEY

    cd $DARPDIR
    cd $DARPDIR/dist
 #   if [ -f  $DARPDIR/index.pid ]; then
 #       kill `cat $DARPDIR/index.pid`
 #   fi
    
    echo `date` " * * * * * * * * * * * * * * * * *  $0 STARTING DARP SUBAGENTS   * * * * * * * * * * * * * * * * * " 
    cd 
    cd /root/darp/subagents/rtt/; 
    ./launchrtt.bash & 
    echo $$ >$DARPDIR/launchrtt.pid

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
            echo `date` SIMPLE SOFTWARE RELOAD so DOCKER REMAINS we shall fall through and =dop another loop
            #./updateSW.bash
            #exit 1
        fi
    fi
    #
    #   could simply - for app in list, and in this order, start or stop them all
    #
    #echo "ABOUT TO KILL TASKS --- ubuntu docker has pid in field #1, native might be #2   :  ps aux |grep -v grep | grep node | awk '{ print $1}'"
    #ps aux |grep -v grep | grep node | awk '{ print $1}'
    #echo `date` killing `ps aux |grep -v grep | grep node | awk '{ print $1}'`
    #kill -9 `ps aux |grep -v grep | grep node | awk '{ print $1}'`
    
    
    echo `date` "killing lingering subagent processes"
    #kill -9 `ps aux |grep -v grep | grep updateSW.bash | awk '{ print $1}'`
    #kill -9 `ps aux |grep -v grep | grep sender | awk '{ print $1}'`  #can delete this
    kill -9 `ps aux |grep -v grep | grep ping | awk '{ print $1}'`  #can delete this
    #kill -9 `ps aux |grep -v grep | grep receiver | awk '{ print $1}'`  #can delete this
    kill -9 `ps aux |grep -v grep | grep launchrtt | awk '{ print $1}'`

    #find /root/darp/history -type f -mmin +7 -print       #Remove old history files so we don't fill up disk This could be done out of cron every minute



    #ps aux

    cd $DARPDIR  #TESTING TO SEE IF $DARPDIR EXISTS

    CYCLES=`expr $CYCLES + 1`
    echo `date` "...................BOTTOM OF LOOP #$CYCLES of $MAXCYCLES ............. SLEEPING "$SLEEPTIME #| tee -a NOIA.log 
    if [ $CYCLES -gt $MAXCYCLES ]; then    
        echo `date` "RAN $MAXCYCLES CYCLES - $0 EXiTTING"  #| tee -a NOIA.log 
        exit 86;
    fi

    sleep $SLEEPTIME
done
