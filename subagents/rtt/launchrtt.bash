#!/bin/bash
echo `date` "Starting $0 sub agent to measure round trip time "
cd /root/darp/subagents/rtt/
sleep 10
while [ "" = "" ]; 
do
    echo `date` Running $0 for a minute of samples
    node rtt
    echo `date` Done with 1 minuute of samples 
done