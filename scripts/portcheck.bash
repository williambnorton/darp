#!/bin/bash
#      portcheck.bash - measure latency to all nodes in $GENESISNNODELIST
#            output:        latency,ip,port,name
#
#     
cd $DARPDIR/scripts

if [ "$GENESISNODELIST" == "" ]; then
    export GENESISNODELIST="55.53.222.151,65013,AWS=US-WEST-1"
    export MY_IP=`curl ifconfig.io`
    export MY_GEO=`hostname|awk -F. '{ print $1}'`
    export MY_GROUP=`hostname|awk -F. '{ print $1".1"}'`
    export MY_PORT=65013
    export MY_SWVERSION="latest:latest"
    echo "# portcheck DEFAULT";
fi
    echo "#" `date` $0 MY_IP=$MY_IP MY_GEO=$MY_GEO MY_GROUP=$MY_GROUP MY_PORT=$MY_PORT MYSWVERSION=$MY_SWVERSION GENESISNODELIST=$GENESISNODELIST
    #FIRST_LINE=11, 52.53.222.151,   1608684916380,12,Docker.201222.1610:Build.201222.1610,52.53.222.151,65013,AWS-US-WEST-1A,1608683260531,lBVJQZ8Kv1Gu6pXDvtAUfxDXPTUZBw0KTGCuYcBmkjU=,
    node testport.ts #>porttest.txt          #measure latency to all G nodes as latency,ip,port,name...

exit 1














    if [ "$FIRST_LINE" != "" ]; then

    else
    #
    #   Handle where No genesis nodes responded
    #
        echo `date` "bootdarp: no other genesis nodes are responding so I will be a solo genesis node for now."
        MY_GENESIS_LATENCY=0
        MY_GENESIS_SWVERSION="$CURRENT_DOCKERVERSION:$CURRENT_DARPVERSION"
        MY_GENESIS_IP=$MY_IP
        MY_GENESIS_PORT=$MY_PORT
        MY_GENESIS_GEO=$MY_GEO
        MY_GENESIS_GROUP="${GENESIS_GEO}.1"
        echo `date` "I AM GENESIS - CLOSEST IS ME because no public genesis node responded or there is no open port in the firewall"
        FIRST_RESPONDER_LATENCY=0  #//we we are the first responder
    fi
        
    fi

    #
    #   #2 - If we are a NOIA sponsored genesis node and no other NOIA = sponsored Genesis node replied within 100ms, we should be a genesis node
    #

    MY_GENESIS_ENTRY=`grep $MY_IP awsgenesis.config genesis.config operators.config`     # Am I a Genesis Node?
    if [ $? -eq 0 ]; then
        #export GENESIS_IP=$MY_IP
        MY_GENESIS_ENTRY=`echo $MY_GENESIS_ENTRY | awk -F: '{ print $2 }' `
        echo `date` "I AM A IDENTIFIED GENESIS NODE $MY_IP My Genesis Entry=$MY_GENESIS_ENTRY"
        echo `date` HERE I use myself as Genesis node, but should prefer an active one within 100ms rtt
        echo `date` "alternative FIRST_RESPONDER_LATENCY=$FIRST_RESPONDER_LATENCY ms away"
        if [ $FIRST_RESPONDER_LATENCY -gt 100 ]; then
            MY_GENESIS_SWVERSION="$CURRENT_DOCKERVERSION:$CURRENT_DARPVERSION"
            MY_GENESIS_IP=$MY_IP  #
            MY_GENESIS_PORT=$MY_PORT  #
            MY_GENESIS_GEO=$MY_GEO
            MY_GENESIS_GROUP="${MY_GEO}.1"
           echo `date` "BLESSING MYSELF AS A NEW GENESIS NODE 100ms away from others"
        fi
        echo `date` "1  My MY_GENESIS_SWVERSION=$MY_GENESIS_SWVERSION MY_GENESIS_ENTRY=$MY_GENESIS_ENTRY MY_GENESIS_IP=$MY_GENESIS_IP  MY_GENESIS_PORT=$MY_GENESIS_PORT"
    else
        echo `date` "I am not in the genesis config list "
        if [ "$FIRST_LINE" == "" ]; then
            echo `date` "I am not in the genesis config and no genesis node responded -- defaulting to being my own geensis node"
        else
            echo `date` "I am not in the genesis config and using closest Genesis node"
        fi
    fi




            node scripts/testport.ts >porttest.txt          #measure latency to all G nodes as latency,ip,port,name...

    if [ "$FIRST_LINE" != "" ]; then
    else
    #
    #   Handle where No genesis nodes responded
    #
        echo `date` "bootdarp: no other genesis nodes are responding so I will be a solo genesis node for now."
        MY_GENESIS_LATENCY=0
        MY_GENESIS_SWVERSION="$CURRENT_DOCKERVERSION:$CURRENT_DARPVERSION"
        MY_GENESIS_IP=$MY_IP
        MY_GENESIS_PORT=$MY_PORT
        MY_GENESIS_GEO=$MY_GEO
        MY_GENESIS_GROUP="${GENESIS_GEO}.1"
        echo `date` "I AM GENESIS - CLOSEST IS ME because no public genesis node responded or there is no open port in the firewall"
        FIRST_RESPONDER_LATENCY=0  #//we we are the first responder
    fi
        
    fi

    #
    #   #2 - If we are a NOIA sponsored genesis node and no other NOIA = sponsored Genesis node replied within 100ms, we should be a genesis node
    #

    MY_GENESIS_ENTRY=`grep $MY_IP awsgenesis.config genesis.config operators.config`     # Am I a Genesis Node?
    if [ $? -eq 0 ]; then
        #export GENESIS_IP=$MY_IP
        MY_GENESIS_ENTRY=`echo $MY_GENESIS_ENTRY | awk -F: '{ print $2 }' `
        echo `date` "I AM A IDENTIFIED GENESIS NODE $MY_IP My Genesis Entry=$MY_GENESIS_ENTRY"
        echo `date` HERE I use myself as Genesis node, but should prefer an active one within 100ms rtt
        echo `date` "alternative FIRST_RESPONDER_LATENCY=$FIRST_RESPONDER_LATENCY ms away"
        if [ $FIRST_RESPONDER_LATENCY -gt 100 ]; then
            MY_GENESIS_SWVERSION="$CURRENT_DOCKERVERSION:$CURRENT_DARPVERSION"
            MY_GENESIS_IP=$MY_IP  #
            MY_GENESIS_PORT=$MY_PORT  #
            MY_GENESIS_GEO=$MY_GEO
            MY_GENESIS_GROUP="${MY_GEO}.1"
           echo `date` "BLESSING MYSELF AS A NEW GENESIS NODE 100ms away from others"
        fi
        echo `date` "1  My MY_GENESIS_SWVERSION=$MY_GENESIS_SWVERSION MY_GENESIS_ENTRY=$MY_GENESIS_ENTRY MY_GENESIS_IP=$MY_GENESIS_IP  MY_GENESIS_PORT=$MY_GENESIS_PORT"
    else
        echo `date` "I am not in the genesis config list "
        if [ "$FIRST_LINE" == "" ]; then
            echo `date` "I am not in the genesis config and no genesis node responded -- defaulting to being my own geensis node"
        else
            echo `date` "I am not in the genesis config and using closest Genesis node"
        fi
    fi
