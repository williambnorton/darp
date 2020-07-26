#!/bin/bash
#		wgwatch - RUNS ON HOST outside of docker enviuronment
#			invokes wg-quick when this wireguard config file is changed is created by docker - runs on host
#
WGDIR=$HOME/wireguard
echo `date` $0 starting with WGDIR=$WGDIR 
PIDFILE=/tmp/wgwatch.pid 

unameOut="$(uname -s)"
case "${unameOut}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac
				echo `date` $0 does not support Mac at this time Wireguard is NOT set up
				echo `date` $0 does not support Mac at this time Wireguard is NOT set up
				echo `date` $0 does not support Mac at this time Wireguard is NOT set up
				echo `date` $0 does not support Mac at this time Wireguard is NOT set up
				echo `date` $0 does not support Mac at this time Wireguard is NOT set up
				exit
	;;
    CYGWIN*)    MACHINE=Cygwin;;
    MINGW*)     MACHINE=MinGw;;
    *)          MACHINE="UNKNOWN:${unameOut}"
esac
export MACHINE
echo `date` "Machine type: ${MACHINE} - we need to know this for some wg host cmds."

if [ -f $PIDFILE ]; then
		echo `date` Killing old wgwatch.bash
		kill `cat $PIDFILE`
		rm -f $PIDFILE
		sleep 1
fi
echo $$ >/tmp/wgwatch.pid

while :
do
	if [ -w $WGDIR ]; then
		cd $WGDIR
		if [ -f $WGDIR/darp0.pending.conf ]; then
			echo `date` pushing pending darp config change 
			/usr/bin/wg-quick down $WGDIR/darp0.conf
			mv -f $WGDIR/darp0.pending.conf $WGDIR/darp0.conf
			/usr/bin/wg-quick up $WGDIR/darp0.conf
		fi
		sleep 15
	else
		echo `date` wireguard directory not writable or not ready. Changing ownership
		sudo chown `whoami` $WGDIR
		sleep 6   #Wait until wireguard dir exists
	fi
	sleep 6   #Wait until wireguard dir exists

done
