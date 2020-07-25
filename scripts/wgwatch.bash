#!/bin/bash
#		wgwatch - invoke wg-quick when this file is created by docker - runs on host
#
WGDIR=$HOME/wireguard
while :
do
	if [ -f $WGDIR/darp.pending.conf ]; then
		echo `date` pushing pending darp config change 
		/usr/bin/wg-quick down $WGDIR/darp0.conf
		mv $WGDIR/darp0.pending.conf $WGDIR/darp0.conf
		/usr/bin/wg-quick up $WGDIR/darp0.conf
	fi
    sleep 60   #for now check config and redo at most once a minute
done
