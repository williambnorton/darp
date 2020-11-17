#!/bin/bash
#       convenince test bash script
PORT=65014
if [ $# -gt 1 ]; then
    PORT=$2
fi
echo `date` $0 Testing port $PORT
/usr/bin/timeout 20 bash -c -- "(while true; do date +%s.%N;sleep 1;done ) | nc -u  $1 $PORT"
echo `date` $0 Done
