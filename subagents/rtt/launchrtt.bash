#!/bin/bash
cd /root/darp/subagents/rtt/
sleep 10
while [ "" = "" ]; 
do
    echo `date` Running $0 for a minute of samples
    node rtt
    echo `date` Done with 1 minuute of samples 
done