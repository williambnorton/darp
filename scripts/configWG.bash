#!/bin/bash
#
#       configWG.bash - Configure Wireguard public and private for DARP 
#			~/wireguard outside the Docker is our $WGDIR/wireguard
#			(outside Docker watcher script will re-run wg-quick UP)
#
echo `date` setting up our $WGDIR configuration directory for wireguard public keyes
if [ ! -d $WGDIR ]; then umask 077; mkdir -p $WGDIR; echo `date` "ERROR: Should not hve to but Created $WGDIR"; fi  #make sure wireguard directory exists
echo `date` $0 creating wireguard configuration in $WGDIR from $GENESIS
ls -l $WGDIR
#chown ubuntu $WGDIR  #we know our docker runs ubuntu HACK breaks in native mode where no ubuntu exists
#if [ $? -ne 0 ]; then sudo chown ubuntu $WGDIR; fi
#WGDIR=~/darp
#mkdir -p $WGDIR/wireguard
#cd $WGDIR/wireguard
touch $WGDIR
cd $WGDIR
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
#PRIVATEKEY=`echo $PRIVATEKEY | sed '1,$s/=//g'`
#PRIVATEKEY=`echo $PRIVATEKEY | sed '1,$s/=//g'`
echo PRIVATEKEY=$PRIVATEKEY PUBLICKEY=$PUBLICKEY
#
#	The wgbase model will be used to re-build the conf file
# Note: for security reasons we don't NEED to store privatekey in VM
touch $WGDIR/wgbase.conf $WGDIR/darp0.conf
chmod 600 $WGDIR/darp0.conf $WGDIR/wgbase.conf

echo '#'>$WGDIR/wgbase.conf
echo '# '`date` ' Base wireguard config file for ' $HOSTNAME  $VERSION >> $WGDIR/wgbase.conf
echo '[Interface]'>>$WGDIR/wgbase.conf
echo "PrivateKey = $PRIVATEKEY" >>$WGDIR/wgbase.conf
echo "# my PublicKey to share is $PUBLICKEY" >>$WGDIR/wgbase.conf
echo "#" >>$WGDIR/wgbase.conf

cp $WGDIR/wgbase.conf $WGDIR/darp0.conf
echo `date` "Base wireguard config: darp0.conf " `cat $WGDIR/darp0.conf` 

echo `date` $0 wgbase.conf below - the rest will be added by running code
cat $WGDIR/wgbase.conf

cp $DARPDIR/scripts/wgwatch.bash $WGDIR/.  #wireguard watch script - watch for wg pending files
cp $DARPDIR/scripts/udplistener.bash $WGDIR/.  #half of port checking script
cp $DARPDIR/scripts/portcheck.bash $WGDIR/.  #other half of port checking script

chmod 755 $WGDIR/wgwatch.bash $DARPDIR/scripts/udplistener.bash $DARPDIR/scripts/portcheck.bash
#ls -ld $WGDIR
#ls -l $WGDIR
