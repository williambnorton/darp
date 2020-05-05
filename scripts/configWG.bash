#!/bin/bash
#
#       configWG.bash - Configure Wireguard public and private for DARP 
#			~/wireguard outside the Docker is our /etc/wireguard
#			(outside Docker watcher script will re-run wg-quick UP)
#
#GENESIS=71.202.2.184:65013

#if [ "$GENESIS" != "" ]; then
#	startsWith=`curl $GENESIS/mintStack`
#	startsWith=$startsWith$startsWith 
#	echo `date` Get a publicKey that starts with $startsWith
#fi
echo `date` $0 creating wireguard configuration from $GENESIS
DARPDIR=~/darp
mkdir -p $DARPDIR/etc/wireguard
cd $DARPDIR/etc/wireguard
umask 077
echo `date` "This will create publickey and privatekey We do not want them to include space characters, braces or brackets or commas"
DONE=0
while [ $DONE -eq 0 ]
do
        wg genkey |  tee privatekey | wg pubkey |  tee publickey >/dev/null
        PRIVATEKEY=`cat privatekey`
        PUBLICKEY=`cat publickey`

        echo $PRIVATEKEY| grep -v ' ' | grep -v '|' | grep -v + | grep -v '/' | grep -v '\\' | grep '='
        if [ $? -eq 0 ]; then
                echo $PUBLICKEY| grep -v ' ' | grep -v '|' | grep -v + | grep -v '/' | grep -v '\\' | grep '='
                if [ $? -eq 0 ]; then
			#if [ "$GENESIS" != "" ]; then
			#	echo $PUBLICKEY | grep ^$startsWith
			#	if [ $? -eq 0 ]; then
                        		DONE=1
					echo "FOUND PUBLIC KEY: $PUBLICKEY"
                        		#PRIVATEKEY=`echo $PRIVATEKEY|sed '1,$s/=//g'`
                        		#PUBLICKEY=`echo $PUBLICKEY|sed '1,$s/=//g'`
			#	fi
			#else 
				DONE=1
			#fi
                fi
        fi
done
echo PRIVATEKEY=$PRIVATEKEY PUBLICKEY=$PUBLICKEY
#
#	The wgbase model will be used to re-build the conf file
# Note: for security reasons we don't NEED to store privatekey on disk
#       in addition to our wireguard conf. No need to privatekey or publickey files
touch $DARPDIR/etc/wireguard/wgbase.conf $DARPDIR/etc/wireguard/wg0.conf
chmod 600 $DARPDIR/etc/wireguard/wg0.conf $DARPDIR/etc/wireguard/wgbase.conf

echo ''>$DARPDIR/etc/wireguard/wgbase.conf
echo '# Created by '$0 `date` >> $DARPDIR/etc/wireguard/wgbase.conf
echo '[Interface]'>>$DARPDIR/etc/wireguard/wgbase.conf
echo "PrivateKey = $PRIVATEKEY" >>$DARPDIR/etc/wireguard/wgbase.conf
echo "# my PublicKey to share is $PRIVATEKEY" >>$DARPDIR/etc/wireguard/wgbase.conf
echo "#" >>$DARPDIR/etc/wireguard/wgbase.conf

cp $DARPDIR/etc/wireguard/wgbase.conf $DARPDIR/etc/wireguard/wg0.conf

echo `date` $0 wgbase.conf below - the rest will be added by noiaSR c ode
cat $DARPDIR/etc/wireguard/wgbase.conf
