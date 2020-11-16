#!/bin/bash
PORT=65014
echo `date` $0 ready to receive UDP pkts on port $PORT
timeout 10 nc -l -u $PORT | while read line ; do echo "$(date +%s.%N) ${line}" ; done | awk '{ if ($1<$2) print 1000*($2-$1);else  print 1000*($1-$2)" ms"}'