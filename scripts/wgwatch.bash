#!/bin/bash
#		wgwatch - invoke wg-quick when this file is created by docker - runs on host
#
WGDIR=$HOME/wireguard
echo `date` $0 starting with WGDIR=$WGDIR
cd

if [ -f /tmp/wgwatch.pid ]; then
		echo `date` Killing old wgwatch.bash
		kill `cat /tmp/wireguardwatch.pid`
		rm -f /tmp/wgwatch.pid
		sleep 1
fi
echo $$ >/tmp/wgwatch.pid
while :
do
	if [ -w $WGDIR ]; then
		if [ -f $WGDIR/darp0.pending.conf ]; then
			echo `date` pushing pending darp config change 
			/usr/bin/wg-quick down $WGDIR/darp0.conf
			mv -f $WGDIR/darp0.pending.conf $WGDIR/darp0.conf
			/usr/bin/wg-quick up $WGDIR/darp0.conf
		fi
		sleep 15
	else
		echo `date` wireguard directory not writable or not ready
		sudo chown `whoami` $WGDIR
		sleep 6   #Wait until wireguard dir exists
	fi
	sleep 6   #Wait until wireguard dir exists

done
