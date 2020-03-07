#!/bin/bash
#
#       configWG.bash - Configure Wireguard public and private for noiaSR-WAN model
#			~/wireguard outside the Docker is our /etc/wireguard
#			(outside Docker watcher script will re-run wg-quick UP)
#
echo `date` $0 creating wireguard configuration
cd /etc/wireguard
umask 077
echo `date` This will create publickey and privatekey We do not want them to include space characters, braces or brackets or commas
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
                        DONE=1
                        #PRIVATEKEY=`echo $PRIVATEKEY|sed '1,$s/=//g'`
                        #PUBLICKEY=`echo $PUBLICKEY|sed '1,$s/=//g'`
                fi
        fi
done
echo PRIVATEKEY=$PRIVATEKEY PUBLICKEY=$PUBLICKEY
#
#	The wgbase model will be used to re-build the conf file
# Note: for security reasons we don't NEED to store privatekey on disk
#       in addition to our wireguard conf. No need to privatekey or publickey files
touch /etc/wireguard/wgbase.conf /etc/wireguard/wg0.conf
chmod 600 /etc/wireguard/wg0.conf /etc/wireguard/wgbase.conf

echo ''>/etc/wireguard/wgbase.conf
echo '# Created by '$0 `date` >> /etc/wireguard/wgbase.conf
echo '[Interface]'>>/etc/wireguard/wgbase.conf
echo "PrivateKey = $PRIVATEKEY" >>/etc/wireguard/wgbase.conf
echo "# my PublicKey to share is $PRIVATEKEY" >>/etc/wireguard/wgbase.conf
echo "#" >>/etc/wireguard/wgbase.conf

cp /etc/wireguard/wgbase.conf /etc/wireguard/wg0.conf

echo `date` $0 wgbase.conf below - the rest will be added by noiaSR c ode
cat /etc/wireguard/wgbase.conf
