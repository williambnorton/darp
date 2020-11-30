#!/bin/bash
echo `date` "Starting $0 sub agent to measure round trip time - DELETEING PING measures and waiting 10 seconds for wireguard connections to come up"
cd /root/darp/subagents/rtt/
rm -f ip.*
sleep 10
while [ "" = "" ]; 
do
    node rtt
done