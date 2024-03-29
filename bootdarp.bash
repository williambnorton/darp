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
#           WGDIR - the root for DARP wireguard info and log info ( /etc/wireguard/ which is ~/wireguard on host )
#
# Environmental variables we assemble
#           GENESISNODELIST - IP,PORT,NAME ...  IP,PORT,NAME 
#           FIRSTGENESIS - IP,PORT,NAME   <--- use this for software version check
#           IS_MEMBER - 1 is Yes, this machine is on the GENESIS list
#           GENESIS - a point for connection into the mesh <IP>:<PORT>
#           GENESIS_IP - IP addreess of targetted genesis node to join
#           GENESIS_PORT - 
#           GENESIS_GEO -
#           GENESIS_SWVERSION -
#
# 
#
# 	bootdarp.bash variables 
#
echo `date` "Starting bootdarp.bash in docker " > /etc/wireguard/DARP.log   #TRUNCATING LOG FILE

SLEEPTIME=30 #time in seconds between software runs in forever loop

GRANULARITY=400 #  milliseconds before we say we should join the closer genesis node
                #400 allows my home docker to not be an island

MAXCYCLES=30 # of cycles before reloading docker

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
export DARPDIR=`pwd`
export WGDIR=/etc/wireguard

export MY_GEO=`echo $HOSTNAME	| awk '{ print $1 }' | awk -F. '{ print $1 }' | awk -F, '{ print $1 }' `

if [ "$MY_PORT" == "" ]; then
    export MY_PORT="65013"    
fi
export MY_IP=`curl ifconfig.io`	#	get my public IP


CYCLES=0;
while :
do
    CURRENT_DOCKERVERSION=`ls Docker.*`
    CURRENT_DARPVERSION=`ls Build.*`
    export MY_SWVERSION=$CURRENT_DOCKERVERSION:$CURRENT_DARPVERSION
    echo $CURRENT_DOCKERVERSION > /etc/wireguard/STATE  #store running Docker VERSION  

    echo `date` "# bootdarp.bash TOP OF LOOP bootdarp.bash MY_IP=$MY_IP MY_PORT=$MY_PORT MY_GEO=$MY_GEO MY_SWVERSION=$MY_SWVERSION SLEEPTIME=$SLEEPTIME MAXCYCLES=$MAXCYCLES"

    #
    #   First, get the First Genesis Node and see if I am to start up as a GENESIS node
    #
    export GENESISNODELIST=`cat genesisnodelist.config | grep -v '#' | grep ,GENESIS | sed ':a;N;$!ba;s/\n/ /g' `   # Genesis nodes
    echo `date` GENESISNODELIST=$GENESISNODELIST MY_GEO=$MY_GEO MY_IP=$MY_IP MY_PORT=$MY_PORT MY_SWVERSION=$MY_SWVERSION
    export FIRST_GENESIS_ENTRY=`echo $GENESISNODELIST | awk '{ print $1 }'`
    export FIRST_GENESIS_IP=`echo $FIRST_GENESIS_ENTRY | awk -F, '{ print $1 }'`
    export FIRST_GENESIS_PORT=`echo $FIRST_GENESIS_ENTRY | awk -F, '{ print $2 }'`
    export FIRST_GENESIS_NAME=`echo $FIRST_GENESIS_ENTRY | awk -F, '{ print $3 }'`
    export FIRST_GENESIS_ROLE=`echo $FIRST_GENESIS_ENTRY | awk -F, '{ print $4 }'`
    export FIRST_GENESIS_LATENCY=`echo $FIRST_GENESIS_ENTRY | awk -F, '{ print $5 }'`
    echo `date` "$0 FIRST_GENESIS_IP=$FIRST_GENESIS_IP FIRST_GENESIS_NAME=$FIRST_GENESIS_NAME FIRST_GENESIS_ROLE=$FIRST_GENESIS_ROLE FIRST_GENESIS_LATENCY=$FIRST_GENESIS_LATENCY"
    #
    #   Now that we have marshalled the variables and exported them as environmental variables
    #   Determine role of this node we are starting - GENESIS, FIRST_GENESIS, or MEMBER
    #
    grep $MY_IP genesisnodelist.config | grep -v '#' | grep ,GENESIS >/dev/null
    export IS_MEMBER="$?"
    #echo IS_MEMBER=$IS_MEMBER
    if [ "$IS_MEMBER" == "0" ]; then
        export IS_GENESIS="1";
        #
        #   GENESIS NODE startup
        #
        export GENESIS=`echo $FIRST_GENESIS_IP":"$FIRST_GENESIS_PORT`    #All genesis nodes are in FIRST_GENESIS pulseGroup
        echo `date` "WE ARE         GENESIS  NODE      ------------>mmGENESIS=$GENESIS MY_GEO=$MY_GEO  FIRST_GENESIS_ENTRY=$FIRST_GENESIS_ENTRY FIRST_GENESIS_IP=$FIRST_GENESIS_IP"
    else
        IS_GENESIS="0";
        #
        #   MEMBER NODE startup - We use darpping(GENESISNODELIST) to find closest to connect to 
        #
        GNL=`./darpping.bash | grep -v '#' `   #darping.bash spits out Genesisnodelist with latency appended to GENESIS nodes
        #export GENESIS=`echo $GNL   | awk '{ print $1 }'`
        echo "DARP Ping gave us: GNL=$GNL"
        CLOSEST_GENESIS_ENTRY=`echo $GNL | grep -v '#' | grep GENESIS | awk '{ print $1 }'`
        echo `date` "WE ARE A MEMBER NODE SO WE CONNECT TO FIRST_GENESIS_ENTRY=$FIRST_GENESIS_ENTRY GNL=$GNL CLOSEST_GENESIS_ENTRY=$CLOSEST_GENESIS_ENTRY"

        if [ "$CLOSEST_GENESIS_ENTRY" != "" ]; then
            export FIRST_GENESIS_IP=`echo $CLOSEST_GENESIS_ENTRY   | awk -F, '{ print $1 }'`
            export FIRST_GENESIS_PORT=`echo $CLOSEST_GENESIS_ENTRY | awk -F, '{ print $2 }'`
            export FIRST_GENESIS_NAME=`echo $CLOSEST_GENESIS_ENTRY | awk -F, '{ print $3 }'`
            # GENESIS labels here
            export FIRST_GENESIS_LATENCY=`echo $CLOSEST_GENESIS_ENTRY|awk -F, '{ print $5 }'`
            export FIRST_GENESIS_MY_IP=`echo $CLOSEST_GENESIS_ENTRY | awk -F, '{ print $6 }'` #What the genesis node says our public IP is
            echo "bootdarp.bash: $FIRST_GENESIS_MY_IP should equal $MY_IP if not blank"
            export GENESIS="$FIRST_GENESIS_IP:$FIRST_GENESIS_PORT"
            echo `date` "WE ARE A MEMBER NODE connecting to Closest Genesis Node: $GENESIS"

        else
            GENESIS=""
            echo `date` "WE ARE MEMBER NODE AND NO GENESIS NODES RESPONDED"

            exit 0
        fi
    fi

    #	
    # 	GENESIS environment variables set for for operation          
    #           
    echo `date` " NEWMODEL: STARTING DARP IS_MEMBER=$IS_MEMBER MY_IP=$MY_IP FIRST_GENESIS_IP=$FIRST_GENESIS_IP FIRST_GENESIS_PORT=$FIRST_GENESIS_PORT FIRST_GENESIS_NAME=$FIRST_GENESIS_NAME  MY GENESIS=$GENESIS who believes I am FIRST_GENESIS_MY_IP=$FIRST_GENESIS_MY_IP" 
    echo `date` "$0 STARTING DARP IS_MEMBER=$IS_MEMBER MY_IP=$MY_IP GENESIS=$GENESIS FIRST_GENESIS_ENTRY=$FIRST_GENESIS_ENTRY" 

    echo `date` "******* bootdarp.bash We are going to join : GENESIS=$GENESIS MY_IP=$MY_IP MY_PORT=$MY_PORT  MY_GENESIS_GEO=$MY_GENESIS_GEO MY_GENESIS_IP=$MY_GENESIS_IP MY_GENESIS_PORT=$MY_GENESIS_PORT MY_GENESIS_SWVERSION=$MY_GENESIS_SWVERSION"

    #cd $DARPDIR
    #find /root/darp/history -type f -mmin +7 -print       #Remove old history files so we don't fill up disk This could be done out of cron every minute

    #PRESCRIBED_DOCKERVERSION=`cat /etc/wireguard/STATE`      #### If we were restarted to start a new Docker, this would contain the new docker tag

    DARP_SWVERSION=`echo $MY_GENESIS_SWVERSION | awk -F: '{ print $2 }'`   # <Docker.YYMMDD.HHMM>:<Build.YYMMDD.HHMM>

    if [ "$MY_GENESIS_SWVERSION" == "$CURRENT_DOCKERVERSION:$CURRENT_DARPVERSION" ]; then
        echo `date` "!!! We are genesis node so we are already running the latest SW: $MY_GENESIS_SWVERSION"
        ./updateSW.bash
    else
        echo `date` "       NEW VERSION  ***** DARP_SWVERSION = $DARP_SWVERSION MY_VERSION=$CURRENT_DOCKERVERSION:$CURRENT_DARPVERSION"
        ./updateSW.bash $MY_GENESIS_SWVERSION #$DARP_SWVERSION     #we want to start with the newest software
        rc=$?
        echo `date` "return from updateSW $DARP_SWVERSION is $rc " 
        if [ $rc -ne 0 ]; then  
            echo `date` "bootdarp.bash - NOT EXITTING NOW bad rc from updateSW.bash.... BOOTDARP  rc=$rc"  #"bootdarp.bash UNRAVELING done running ./$PRESCRIBED_DOCKERVERSION"
            echo `date` "bootdarp.bash - NOT EXITTING NOW bad rc from updateSW.bash.... BOOTDARP  rc=$rc"  #"bootdarp.bash UNRAVELING done running ./$PRESCRIBED_DOCKERVERSION"
            echo `date` "bootdarp.bash - NOT EXITTING NOW bad rc from updateSW.bash.... BOOTDARP  rc=$rc"  #"bootdarp.bash UNRAVELING done running ./$PRESCRIBED_DOCKERVERSION"
            echo `date` "bootdarp.bash - NOT EXITTING NOW bad rc from updateSW.bash.... BOOTDARP  rc=$rc"  #"bootdarp.bash UNRAVELING done running ./$PRESCRIBED_DOCKERVERSION"
            #exit $rc   #pass through any subsequent bootdarp invocations
        fi

    fi

    # we could exit if rc= non-zero. updateSW could replicate the code from git, move it into place and run it instead of the rest of this script

    cd /tmp
    #cd /root/darp
    cd $DARPDIR
    DARPVERSION=`ls Build*`
    DOCKERVERSION=`ls Docker.*`
    export VERSION="${DOCKERVERSION}:${DARPVERSION}"    # DOCKERVERSION comes in as environmental variable
    #echo PRESCRIBED_DOCKERVERSION=$PRESCRIBED_DOCKERVERSION      RUNNING version $VERSION

    echo `date` "+ + + +RUNNING DARP $VERSION rc=$rc from updateSW.bash"    #VERSION should eventually be a HASH over the docker itself, mapped to docker tag
    #env

    echo `date` " - - - - - - - - - -     STARTING BOOTDARP CURRENT DRP $VERSION SOFTWARE GENESIS=$GENESIS       - - - - - - - - - - - - - - "
    #sleep 2
  
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
    #cd /root/darp/subagents/rtt/; 
    cd $DARPDIR/subagents/rtt
    ./launchrtt.bash & 
    echo $$ >$DARPDIR/launchrtt.pid

    echo $DOCKERVERSION > $WGDIR/STATE 
    echo `date` wireguard STATE file says we should be running DOCKER: `cat /etc/wireguard/STATE`

    cd $DARPDIR/dist
    echo `date` "============================================================ Starting DARP $VERSION : node index ..."

	node index #> $DARPDIR/darp.log  #running code
    #
    #       darp exitted 
    #
#	node index 
    rc=$?
    echo `date` `hostname`"FINISHED DARP Protocol index.js done rc=$rc  wireguard DOCKER=`cat /etc/wireguard/STATE`" #| tee -a NOIA.log

    echo `date` "- - - - - - - - - - - - FINISHED DARP $VERSION  -   either new DARP code or new docker  - - - - -  rc=$rc" #| tee -a NOIA.log 
    echo `date` "- - - - - - - - - - - - FINISHED DARP $VERSION  - - - - - - - - - - -  rc=$rc" #> /etc/wireguard/DARP.log
    echo `date` "- - - - - - - - - - - - FINISHED DARP $VERSION  - - - - - - - - - - -  rc=$rc"
    echo `date` "- - - - - - - - - - - - FINISHED DARP $VERSION  - - - - - - - - - - -  rc=$rc"
    echo `date` "- - - - - - - - - - - - FINISHED DARP $VERSION  - - - - - - - - - - -  rc=$rc"


    if [ $rc -eq 86 ]; then echo `date`" STOPPING - STOP MESSAGE RECEIVED" ; echo "STOP">$WGDIR/STATE;  exit 86; fi     #STOP COMMAND

    if [ $rc -eq 0 ]; then
        echo "rc=0 - New Docker Available: "`cat /etc/wireguard/STATE` > /etc/wireguard/DARP.log
        echo "rc=0 - New Docker Available: "`cat /etc/wireguard/STATE` 
        exit 0
    else
        if [ $rc -ne 36 ]; then
            echo "rc=$rc * * * * * * * * * * * *         uNKNOWN rc        E X I T T I N G               * * * * * * * * * * * * * * * * * * *"
            echo `date` "$0 rc=$rc ... handlePulse crashed, or updateSW.bash detected NEW SOFTWARE and killed handlepulse processes"
            echo `date` "$0 result: unexpected rc from $VERSION rc=$rc"    #> /etc/wireguard/DARP.log 
            echo `date` "$0 result: unexpected rc from $VERSION rc=$rc"    #| tee -a NOIA.log 
            exit 0
        else    
            echo `date` "SIMPLE SOFTWARE RELOAD so DOCKER REMAINS we shall fall through and run another loop " #> /etc/wireguard/DARP.log 
            echo `date` "SIMPLE SOFTWARE RELOAD so DOCKER REMAINS we shall fall through and run another loop"

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

    cd $DARPDIR  #TESTING TO SEE IF $DARPDIR EXISTS

    CYCLES=`expr $CYCLES + 1`
    if [ $CYCLES -ge $MAXCYCLES ]; then    
        echo `date` "RAN $MAXCYCLES CYCLES - $0 EXiTTING"  #> /etc/wireguard/DARP.log  
        echo `date` "RAN $MAXCYCLES CYCLES - $0 EXiTTING"  #| tee -a NOIA.log 
        
        exit 86;
    fi

    echo GENESIS Node is $GENESIS $FIRST_RESPONDER_LATENCY ms away
    if [ "$FIRST_RESPONDER_LATENCY" == "0" ]; then   ###connecting to self did not work - port forward issue
        echo `date` PORT FORWARDING NOT SET UP PROPERLY OR I AM THE GENESIS NODE $GENESIS $GENESISIP:$GENESISPORT #> /etc/wireguard/DARP.log 
        echo `date` "PORT FORWARDING NOT SET UP PROPERLY OR I AM THE GENESIS NODE $GENESIS $GENESISIP:$GENESISPORT "
        #exit 86
    fi

    
    #echo `date` ".. $MY_GEO $MY_IP:$MY_PORT  .. running $CURRENT_DOCKERVERSION:$CURRENT_DARPVERSION ........BOTTOM OF LOOP #$CYCLES of $MAXCYCLES .....GENESIS was $GENESIS $GENESISIP:$GENESISPORT ........ SLEEPING "$SLEEPTIME #| tee -a NOIA.log 
    if [ "$IS_GENESIS" != "0" ]; then
        echo sleeping member node
        sleep $SLEEPTIME
    else
        echo immediately restarting genesis node
    fi
done
