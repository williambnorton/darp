#!/bin/bash
#       convenince test bash script
PORT=65014
echo `date` $0 Testing port $PORT
timeout 20 (while true; do date +%s.%N;sleep 1;done ) | nc -u  $1 $PORT
echo `date` $0 Done

