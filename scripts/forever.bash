#!/bin/bash
#       forever.bash
#
#       HOSTNAME,WALLET is set as a param passed to Docker
#       /etc/wireguard is a mount of ~/wireguard
#       when changes are made they are reflected outside Docker
#       the watch script will run wg-quick when files change in this direvtory
#
HOSTNAME=`echo $HOSTNAME|awk -F. '{print $1}'`

redis-server &          #start up our data server

#
#       Forever loop running in docker
#
echo `date` STARTING Measurement Apparatus
cd

echo $0 Loop started `date` > forever
echo $0 `date` > NOIA.log
while [ -f forever ]
do
        #clear
        #
        #       Configure Wireguard with new public and private keys
        #
        echo `date` Configuring *NEW* Wireguard Public and Private eKeys
        /configWG.bash
        PUBLICKEY=`cat /etc/wireguard/publickey`

        rm forever      #UNCOMMENT TO MAKE IT STOP ON CRASH
        echo `date` Starting SR Simulator on $HOSTNAME
        echo "http://drpeering.com/noia.php?geo=${HOSTNAME}&publickey=${PUBLICKEY}"
        curl "http://drpeering.com/noia.php?geo=${HOSTNAME}&publickey=${PUBLICKEY}" > noia.`date +%y%m%d`.js

        #
        #       We exitted the code - see if we are to restart
        #
        YYMMDD=`date +%y%m%d`
        node <noia.$YYMMDD.js
        rc=$?
        echo node rc=$rc
        if [ $rc -eq 120 ]; then
                echo `date` "PAUSE MESSAGE RECEIVED"
                echo `date` `hostname` Sleeping for 120 seconds
                sleep 120
        fi
        if [ $rc -eq 36 ]; then
                echo `date` "SOFTWARE RELOAD MESSAGE RECEIVED"
                echo `date` > forever
        fi
        if [ $rc -eq 32 ]; then
                echo `date` "REBOOT MESSAGE RECEIVED"
                rm forever #loop wil not run unless this file exists
                ${SUDO} apt-get update
                ${SUDO} reboot
                exit 1
        fi
        if [ $rc -eq 99 ]; then
                echo `date` "STOP MESSAGE RECEIVED"
                rm forever #loop wil not run unless this file exists
                exit 1
        fi
        echo `date` SLEEPING - should probably gen new keys or docker pull
        sleep 15
done


