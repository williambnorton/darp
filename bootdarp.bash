#!/bin/bash
#           
#		    bootdarp.bash - entry point for docker
# 
#       We set up the operating environmental variables on startup:
#           HOSTNAME = passed in
#           PORT = my open UDP/TCP port
#           GENESIS = a specific Genesis node to connect to (IP:Port or PUBLICKEY)
#           WALLET - a wallet with micro credits and debits for use in auto mode
#       We create the rest:
#           DARPDIR - the root directory of all darp ( /root/darp ) 
#           WGDIR - the root for DARP wireguard info and log info ( ~/wireguard/ )
# Information about myself
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
echo `date` Starting bootdarp.bash in docker env =
env
SLEEPTIME=5 #time in seconds between software runs in forever loop
MAXCYCLES=1000 # of cycles before stopping
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
CURRENT_DOCKERVERSION=`ls Docker.*`
CURRENT_DARPVERSION=`ls Build.*`

echo $CURRENT_DOCKERVERSION > /etc/wireguard/STATE  #store running Docker VERSION  

#
#	setting my variables for opertion
#
export MY_IP=`curl ifconfig.io`	#	get my public IP
if [ "$PORT" != "" ]; then 
    export MY_PORT=$PORT; 
else
    export MY_PORT=65013		#over ridden
fi
export MY_GEO=$HOSTNAME		#
export MY_SWVERSION=$CURRENT_DOCKERVERSION:$CURRENT_DARPVERSION
echo `date` "----------------- bootdarp.bash STARTING bootdarp.bash MY_IP=$MY_IP MY_PORT=$MY_PORT MY_GEO=$MY_GEO MY_SWVERSION=$MY_SWVERSION SLEEPTIME=$SLEEPTIME MAXCYCLES=$MAXCYCLES"

#	
# 	setting up my GENESIS variables for operation          
#           
export GENESISNODELIST=`grep 65013 *.config| awk -F: '{ print $2}' `   #   IP:PORT:NAME
FIRST_GENESIS=`grep 65013 *.config | awk -F: '{ print $2}' | head -1 | awk -F, '{ print $1 }' `
echo `date` "------------------------------------------------- bootdarp.bash MY_IP=$MY_IP GENESISNODELIST=$GENESISNODELIST FIRST_GENESIS=$FIRST_GENESIS"

echo `date` "$0 STARTING DARP DARP DARP MY_IP=$MY_IP GENESIS=$GENESIS" 
CYCLES=0;
while :
do
    #
    #   user-specified over rides "auto" connection to Geneis node list participants
    #
    if [ "$GENESIS" != "" ]; then
        GENESIS_IP=`echo $GENESIS|awk -F: '{ print $1 }'`
        GENESIS_PORT=`echo $GENESIS|awk -F: '{ print $2 }'`
        if [ "$GENESIS_PORT" == "" ]; then
            GENESIS_PORT=65013
        fi
        GENESIS_GEO="$HOSTNAME"  #
        GENESIS_GROUP="${GENESIS_GEO}.1"
        GENESIS_SWVERSION="$CURRENT_DOCKERVERSION:$CURRENT_DARPVERSION"

        echo `date` "0  User-overide: connecting to Genesis $GENESIS_GEO $GENESIS_IP:$GENESIS_PORT"
        echo `date` "0  User-overide: connecting to Genesis $GENESIS_GEO $GENESIS_IP:$GENESIS_PORT"
        echo `date` "0  User-overide: connecting to Genesis $GENESIS_GEO $GENESIS_IP:$GENESIS_PORT"
        echo `date` "0  User-overide: connecting to Genesis $GENESIS_GEO $GENESIS_IP:$GENESIS_PORT"
        echo `date` "0  User-overide: connecting to Genesis $GENESIS_GEO $GENESIS_IP:$GENESIS_PORT"
        USER_OVERIDE="YES"
    fi
    echo `date` "FINDING PUBLIC NODE TO CONNECT TO"

    #
    #   #1 - check where I am topologically
    #
    echo `date` "********************************************************* GENESIS=auto: Starting PORT TEST TO FIND CLOSEST  - Before STARTING GENESIS=$GENESIS"
    #echo `date` "***** GENESISNODESLIST=$GENESISNODELIST"

    #node scripts/testport.ts $MY_IP 65013 `cat awsgenesis.config genesis.config operators.config` >porttest.txt  #inclucde all
    node scripts/testport.ts $MY_IP 65013 $GENESISNODELIST >porttest.txt
    echo "***************************************************     PORTS AVAILABLE TO CONNECT TO     **************************************" 

    cat porttest.txt
    echo "BEST CHOICE BY LATENCY"
    echo "FIRST LINE:" `cat porttest.txt | head -1`
    GENESIS_LATENCY=`cat porttest.txt | grep Docker | head -1 | awk -F: '{ print $1}'`
    GENESIS_SWVERSION=`cat porttest.txt | grep Docker | head -1 | awk -F, '{ print $3}'`
    GENESIS_IP=`cat porttest.txt | grep Docker | head -1 | awk -F, '{ print $4}'`
    GENESIS_PORT=`cat porttest.txt | grep Docker | head -1 | awk -F, '{ print $5}'`
    GENESIS_GEO=`cat porttest.txt | grep Docker | head -1 | awk -F, '{ print $6}'`
    GENESIS_GROUP=`cat porttest.txt | grep Docker | head -1 | awk -F, '{ print $7}'`

    if [ "$GENESIS_LATENCY" == "" ]; then  # We are the only ones so far
        GENESIS_LATENCY=0
        GENESIS_SWVERSION="$CURRENT_DOCKERVERSION:$CURRENT_DARPVERSION"
        GENESIS_IP=$MY_IP
        GENESIS_PORT=$MY_PORT
        GENESIS_GEO=$MY_GEO
        GENESIS_GROUP="${GENESIS_GEO}.1"
        echo `date` "CLOSEST IS ME because no public genesis node responded or there is no open port in the firewall"
    fi

    echo `date` "2  CLOSEST  GENESIS_GEO=$GENESIS_GEO is ${GENESIS_LATENCY} ms away GENESIS_IP=$GENESIS_IP  GENESIS_PORT=$GENESIS_PORT  GENESIS_SWVERSION=$GENESIS_SWVERSION"
    #
    #   #2 - if we are a NOIA sponsored genesis node and no other NOIA = sponsored Genesis node replied within 25ms, you are a genesis node
    #

    MY_GENESIS_ENTRY=`grep $MY_IP awsgenesis.config genesis.config operators.config`     # Am I a Genesis Node?
    if [ $? -eq 0 ]; then
        export GENESIS_IP=$MY_IP
        MY_GENESIS_ENTRY=`echo $MY_GENESIS_ENTRY | awk -F: '{ print $2 }' `
        echo `date` "I AM GENESIS NODE $MY_IP My Genesis Entry=$MY_GENESIS_ENTRY"
        echo `date` HERE I use myself as Genesis node, but should prefer an active one within 25 ms
        if [ "$GENESIS_LATENCY" -gt 20 ]; then
            GENESIS_SWVERSION="$CURRENT_DOCKERVERSION:$CURRENT_DARPVERSION"
            GENESIS_IP=`echo $MY_GENESIS_ENTRY | awk -F, '{ print $1 }'`  #
            GENESIS_PORT=`echo $MY_GENESIS_ENTRY | awk -F, '{ print $2 }'`  #
            GENESIS_GEO=`echo $MY_GENESIS_ENTRY | awk -F, '{ print $3 }'`  #
            GENESIS_GROUP="${GENESIS_GEO}.1"
        fi
        echo `date` "1  My GENESIS_SWVERSION=$GENESIS_SWVERSION MY_GENESIS_ENTRY=$MY_GENESIS_ENTRY GENESIS_IP=$GENESIS_IP  GENESIS_PORT=$GENESIS_PORT"
        echo `date` "1  My GENESIS_SWVERSION=$GENESIS_SWVERSION MY_GENESIS_ENTRY=$MY_GENESIS_ENTRY GENESIS_IP=$GENESIS_IP  GENESIS_PORT=$GENESIS_PORT"
        echo `date` "1  My GENESIS_SWVERSION=$GENESIS_SWVERSION MY_GENESIS_ENTRY=$MY_GENESIS_ENTRY GENESIS_IP=$GENESIS_IP  GENESIS_PORT=$GENESIS_PORT"
        echo `date` "1  My GENESIS_SWVERSION=$GENESIS_SWVERSION MY_GENESIS_ENTRY=$MY_GENESIS_ENTRY GENESIS_IP=$GENESIS_IP  GENESIS_PORT=$GENESIS_PORT"
        echo `date` "1  My GENESIS_SWVERSION=$GENESIS_SWVERSION MY_GENESIS_ENTRY=$MY_GENESIS_ENTRY GENESIS_IP=$GENESIS_IP  GENESIS_PORT=$GENESIS_PORT"
    else
        if [ "$GENESIS_IP" == "" -a "$FIRST_GENESIS" != "$MY_IP" ]; then
                echo `date` "$0 No genesis nodes answered request to connect... check that your UDP/TCP/ICMP ports open on your firewall ...EXITTING..."
                echo `date` "$0 Configure ports 65013/TCP open and 65013-65200/UDP open and enable ICMP for diagnostics on your computer and any firewalls/routers in the network path"
                echo "***************************************************     COULD NOT CONNECT TO ANY PUBLIC GENESIS NODES - EXITTING     **************************************" 
                echo "***************************************************     COULD NOT CONNECT TO ANY PUBLIC GENESIS NODES - EXITTING     **************************************" 
                echo "***************************************************     COULD NOT CONNECT TO ANY PUBLIC GENESIS NODES - EXITTING     **************************************" 
                echo "***************************************************     TRAY AGAIN LATER>....     **************************************" 
                echo "***************************************************     try connecting directly to lead genesis node: ___:___ ?    **************************************" 
                exit 36; 
        fi
    fi
export GENESIS_IP
#export FIRST_GENESIS_IP=$GENESIS_IPdd
export GENESIS_PORT
#export FIRST_GENESIS_PORT=$GENESIS_PORT
export GENESIS_GEO
export GENESIS_SWVERSION
export GENESIS="$GENESIS_IP:$GENESIS_PORT"

echo `date` "******* bootdarp.bash We are going to join : GENESIS_GEO=$GENESIS_GEO GENESIS_GROUP=$GENESIS_GROUP  GENESIS_IP=$GENESIS_IP GENESIS_PORT=$GENESIS_PORT GENESIS_SWVERSION=$GENESIS_SWVERSION "


#export WGDIR=/etc/wireguard
#export WGDIR=$DARPDIR/wireguard
export WGDIR=/etc/wireguard
export PORT




#echo `date` "$0 STARTING DARP DARP DARP MY_IP=$MY_IP GENESIS=$GENESIS" 
#CYCLES=0;
#while :
#do





    cd $DARPDIR
    echo `date` TOP OF LOOP 
    find /root/darp/history -type f -mmin +7 -print       #Remove old history files so we don't fill up disk This could be done out of cron every minute

    #PRESCRIBED_DOCKERVERSION=`cat /etc/wireguard/STATE`      #### If we were restarted to start a new Docker, this would contain the new docker tag

    DARP_SWVERSION=`echo $GENESIS_SWVERSION | awk -F: '{ print $2 }'`   # <Docker.YYMMDD.HHMM>:<Build.YYMMDD.HHMM>

    if [ "$GENESIS_SWVERSION" == "$CURRENT_DOCKERVERSION:$CURRENT_DARPVERSION" ]; then
        echo `date` "!!! We are genesis node so we are already running the latest SW"
        #./updateSW.bash
    else
        echo `date` "        ***** DARP_SWVERSION = $DARP_SWVERSION "
            ./updateSW.bash $DARP_SWVERSION     #we want to start with the newest software
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

    echo `date` " - - - - - - - - - -     STARTING BOOTDARP CURRENT DRP $VERSION SOFTWARE        - - - - - - - - - - - - - - "
    sleep 2
  
    cd $DARPDIR
    echo `date` "* * = = = = = = = = = = = = = = = = = = = STARTING DARP $VERSION  * * * * * * $MY_IP = = = = = = = = = = = = "  

    #Now we are running in the new code /root/darp directory of docker
    echo `date` "bootdarp Now Configuring Wireguard"
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
    cd /root/darp/subagents/rtt/; ls -l ; 
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
