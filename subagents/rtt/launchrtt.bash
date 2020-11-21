#!/bin/bash
echo `date` "Starting $0 sub agent to measure round trip time "
cd /root/darp/subagents/rtt/
sleep 10
while [ "" = "" ]; 
do
    node rtt
done