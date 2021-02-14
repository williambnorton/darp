#!/bin/bash
if [ $# -ne 1 ]; then
	echo "usage: $0 selector"
	echo 'leverage your neming convention here'
	echo "Example: startAll AWS-AP"
	echo "Example: startAll US"
	exit 1
fi

rm /tmp/x
#
#	start all Genesis nodes that match
#
for node in `cat genesisnodelist.config | grep "$1" | grep -v '#'|grep ,GENESIS`   #don't allow name 'GENESIS' to be selected
do
	ip=`echo $node|awk -F, '{print $1}'`
	port=`echo $node|awk -F, '{print $2}'`
	name=`echo $node|awk -F, '{print $3}'`

	if [ "$ip" != "" -a "$port" != "" -a "$name" != "" ]; then
		echo $0 | grep start >/dev/null

		if [ $? -eq 0 ]; then
			echo  `date` "LAUNCHING GENESIS NODE /tmp/$$ ~/scripts/USR1 ubuntu@$ip $name $ip $port undefined & "
			#~/scripts/USR1 ubuntu@$ip $name $ip $port undefined  &
			(~/scripts/USR1 ubuntu@$ip $name $ip $port undefined 2>&1 ) >>/tmp/x  &
		else 
			echo  `date` "REBOOTING GENESIS NODE /tmp/$$ ~/scripts/USR1 ubuntu@$ip $name $ip $port undefined & "
			echo ~/scripts/USR2 ubuntu@$ip $name $ip $port undefined
			~/scripts/USR2 ubuntu@$ip $name $ip $port undefined &
		fi
	fi

done

#
#	start all non-Genesis nodes that match
#

for node in `cat genesisnodelist.config | grep "$1" | grep -v '#' | grep -v ,GENESIS`
do
	ip=`echo $node|awk -F, '{print $1}'`
	port=`echo $node|awk -F, '{print $2}'`
	name=`echo $node|awk -F, '{print $3}'`

	if [ "$ip" != "" -a "$port" != "" -a "$name" != "" ]; then
		echo $0 | grep start >/dev/null

		if [ $? -eq 0 ]; then
			echo  `date` "LAUNCHING non-genesis node /tmp/$$ ~/scripts/USR1 ubuntu@$ip $name $ip $port undefined & "
			#~/scripts/USR1 ubuntu@$ip $name $ip $port undefined  &
			(~/scripts/USR1 ubuntu@$ip $name $ip $port undefined 2>&1 ) >>/tmp/x  &
		else 
			echo  `date` "REBOOTING non-genesis node /tmp/$$ ~/scripts/USR1 ubuntu@$ip $name $ip $port undefined & "
			echo ~/scripts/USR2 ubuntu@$ip $name $ip $port undefined
			~/scripts/USR2 ubuntu@$ip $name $ip $port undefined &
		fi
	fi

done
