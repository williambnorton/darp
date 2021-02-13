#!/bin/bash
if [ $# -ne 1 ]; then
	echo "usage: $0 genesisnodes.config | membernodes.config"
	exit 1
fi

for node in `cat $1`
do
	ip=`echo $node|awk -F, '{print $1}'`
	port=`echo $node|awk -F, '{print $2}'`
	name=`echo $node|awk -F, '{print $3}'`

	if [ "$ip" != "" -a "$port" != "" -a "$name" != "" ]; then
		echo $0 | grep start >/dev/null

		if [ $? -eq 0 ]; then
			echo  ~/scripts/USR1 ubuntu@$ip $name $ip $port undefined 
			#~/scripts/USR1 ubuntu@$ip $name $ip $port undefined &
		else 
			echo ~/scripts/USR2 ubuntu@$ip $name $ip $port undefined
			#~/scripts/USR2 ubuntu@$ip $name $ip $port undefined &
		fi
	fi

done
