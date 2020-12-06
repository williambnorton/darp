#!/bin/bash
#		wgwatch - RUNS ON HOST outside of docker enviuronment
#			invokes wg-quick when this wireguard config file is changed is created by docker - runs on host
#	Nov 23 - using $HOME/wireguard directory   <--- this should not use a wireguard name - maybe a darp or noia or syntropy
WGDIR=$HOME/wireguard
echo `date` "$0 starting with WGDIR=$WGDIR" 
PIDFILE=wgwatch.pid 
umask 077

unameOut="$(uname -s)"
case "${unameOut}" in
    Linux*)     MACHINE=Linux;;
    *)    MACHINE=MacPCnotLinux
				echo `date` "$0 NOTE: does not support Mac at this time Wireguard is NOT set up"
				exit
	;;
esac
export MACHINE
echo `date` "Machine type: ${MACHINE} - we need to know this for some wg host cmds."

if [ -f $PIDFILE ]; then
		echo `date` Killing old $0 process
		kill `cat $PIDFILE`
		rm -f $PIDFILE
		sleep 1
fi
echo $$ >$PIDFILE

#docker inspect -f '{{ .Created }}' `docker ps | grep -v CONTAINER | awk 'END{print NR}' ` >DOCKER_SW_VERSION
#echo `date` "Running DARP Docker Created "`cat DOCKER_SW_VERSION`

while :
do
	if [ -w $WGDIR ]; then
		cd $WGDIR
		if [ -f $WGDIR/darp0.pending.conf ]; then
			#echo `date` $0 `hostname` "pushing pending darp config change" `grep -i PUBLICKEY $WGDIR/darp0.pending.conf|awk '{ print $NR}'` " ENCRYPTED PATHS to PEERS "
			/usr/bin/wg-quick down $WGDIR/darp0.conf
			mv -f $WGDIR/darp0.pending.conf $WGDIR/darp0.conf
			/usr/bin/wg-quick up $WGDIR/darp0.conf
		fi
		sleep 15
	else
		echo `date` "wireguard directory not writable or not ready. Changing ownership"
		sudo chown `whoami` $WGDIR
		sleep 6   #Wait until wireguard dir exists
	fi
	sleep 6   #Wait until wireguard dir exists

done

