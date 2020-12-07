#!/bin/bash
#	utility script to perform same command across genesis nodes
#	(assumes all credentials have been set up to be able to ssh in)
REBOOTSLEEPTIME=120

CMD="ls -l|hostname"
CMD="sudo reboot"	#reboot pulseGroup - could do this by changing version
CMD="docker exec -it `docker ps | grep darp | awk '{ print $1}'` /bin/bash "
CMD="curl http://52.53.222.151:65013/darp.bash | bash"  #watch it run
CMD="(curl http://52.53.222.151:65013/darp.bash | bash ) &"
CMD="curl http://52.53.222.151:65013/darp.bash | bash "  #watch it run
#CMD="(curl http://52.53.222.151:65013/darp.bash | bash) </dev/null >autodarp.log &"  #let it run
#echo curl http://52.53.222.151:65013/darp.bash

#
#	reboot to ensure old docker killed and we start fresh
#
if [ $# -ne 0 ]; then
for node in `cat ../genesis.config`
do
	echo `date` $node
	#ssh ubuntu@$node "sudo reboot" &
	ssh ubuntu@$node "$*" &
done
exit
echo `date` Allowing  $REBOOTSLEEPTIME   seconds for  nodes to all reboot
sleep $REBOOTSLEEPTIME 
fi

for node in `cat ../genesis.config`
do
	echo `date` ssh ubuntu@$node LAUNCHING
	echo -n -e "\033]0;all.bash: AZURE G $node \007"

#	ssh ubuntu@$node "$CMD"

ssh ubuntu@$node '(sleep 30;~/wireguard/wgwatch.bash)&  docker rm -f $(docker ps -a -q|grep darp);docker rmi -f $(docker images -q); docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e "HOSTNAME="`hostname`   -e "WALLET=auto"   -d williambnorton/darp ' &

done
