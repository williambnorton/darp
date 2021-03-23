#!/bin/bash
#      darpping.bash - measure UDP rtt latency to all nodes in $GENESISNNODELIST
#            output:        latency,ip,port,name
#
#     

#export GENESISNODELIST=`cat genesisnodelist.config | grep -v '#' | grep ,GENESIS | sed ':a;N;$!ba;s/\n/ /g' `   # Genesis nodes
export GENESISNODELIST=`grep ,GENESIS genesisnodelist.config  |  grep -v '#' | sed ':a;N;$!ba;s/\n/ /g' `
echo "# GENESISNODELIST=$GENESISNODELIST"
#for i in $GENESISNODELIST
#do  
#    echo $i
#done
export MY_GEO=$HOSTNAME		#
if [ "$MY_PORT" == "" ]; then
    MY_PORT=65013    
fi
export MY_PORT
export MY_IP=`curl ifconfig.io`	#	get my public IP
CURRENT_DOCKERVERSION=`ls Docker.*`
CURRENT_DARPVERSION=`ls Build.*`
export MY_SWVERSION=$CURRENT_DOCKERVERSION:$CURRENT_DARPVERSION

#echo "# " `date` "MY_IP=$MY_IP MY_GEO=$MY_GEO MY_GROUP=$MY_GROUP MY_PORT=$MY_PORT MYSWVERSION=$MY_SWVERSION GENESISNODELIST=$GENESISNODELIST"
#FIRST_LINE=11, 52.53.222.151,   1608684916380,12,Docker.201222.1610:Build.201222.1610,52.53.222.151,65013,AWS-US-WEST-1A,1608683260531,lBVJQZ8Kv1Gu6pXDvtAUfxDXPTUZBw0KTGCuYcBmkjU=,
node scripts/testport.ts #>porttest.txt          #measure latency to all G nodes as latency,ip,port,name...
#node scripts/testport.ts #>porttest.txt          #measure latency to all G nodes as latency,ip,port,name...
