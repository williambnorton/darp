#!/bin/bash
#      testport.bash - measure latency to all nodes in $GENESISNNODELIST
#            output:        latency,ip,port,name
#
#     
cd $DARPDIR/scripts

if [ "$GENESISNODELIST" == "" ]; then
    export MY_IP=`curl ifconfig.io`
    export MY_GEO=`hostname|awk -F. '{ print $1}'`
    export MY_GROUP=`hostname|awk -F. '{ print $1".1"}'`
    export MY_PORT="65013"
    export MY_SWVERSION="latest:latest"
    export GENESISNODELIST="55.53.222.151,65013,AWS=US-WEST-1"   #set this to self instead using curl ifconfig

    echo "# testport DEFAULT";
fi
    echo "#" `date` $0 MY_IP=$MY_IP MY_GEO=$MY_GEO MY_GROUP=$MY_GROUP MY_PORT=$MY_PORT MYSWVERSION=$MY_SWVERSION GENESISNODELIST=$GENESISNODELIST
    #FIRST_LINE=11, 52.53.222.151,   1608684916380,12,Docker.201222.1610:Build.201222.1610,52.53.222.151,65013,AWS-US-WEST-1A,1608683260531,lBVJQZ8Kv1Gu6pXDvtAUfxDXPTUZBw0KTGCuYcBmkjU=,
    node testport.ts #>porttest.txt          #measure latency to all G nodes as latency,ip,port,name...
