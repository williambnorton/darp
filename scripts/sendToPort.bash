#!/bin/bash
#
timeout 30 (while true; do date +%s.%N;sleep 1;done ) | nc -u  $1   65014
echo `date` $0 Done

