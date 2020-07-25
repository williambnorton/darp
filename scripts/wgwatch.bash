#!/bin/bash
#		wgwatch - invoke wg-quick when this file is created by docker - runs on host
#
WGDIR=$HOME/wireguard
echo `date` $0 starting with WGDIR=$WGDIR
ls -ld $WGDIR
ls -l $WGDIR
	if [ -f /tmp/wgwatch.pid ]; then
		echo `date` Killing old wgwatch.bash
		kill `cat /tmp/wireguardwatch.pid`
		rm -f /tmp/wgwatch.pid
		sleep 1
	fi
echo $$ >/tmp/wgwatch.pid
while :
do
	if [ -f $WGDIR/darp0.pending.conf ]; then
		echo `date` pushing pending darp config change 
		/usr/bin/wg-quick down $WGDIR/darp0.conf
		mv -f $WGDIR/darp0.pending.conf $WGDIR/darp0.conf
		/usr/bin/wg-quick up $WGDIR/darp0.conf
	fi
    sleep 60   #for now check config and redo at most once a minute
done
