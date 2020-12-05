#!/bin/bash
#       launch  darp clean up
#       remove history files that are old
#
echo `date` "Starting $0 to clean up older than 20 mminuites history files"
cd /root/darp/history
while [ "" = "" ]; 
do
    cd /root/darp/history
    node cleanOldfiles
    sleep 20
done