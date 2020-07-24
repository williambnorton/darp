#!/bin/bash
#		wgwatch - invoke wg-quick when this file is created by docker
#
while :
do
	if [ -f darp.pending.conf ]; then
		wg-quick DOWN $WGDIR/darp0.conf
		mv $WGDIR/darp0.pending.conf $WGDIR/darp0.conf
		wg-quick UP $WGDIR/darp0.conf
	fi
    sleep 60   #for now check config and redo at most once a minute
done
