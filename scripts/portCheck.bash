#!/bin/bash
#
timeout 30 nc -l -u 65014 | while read line ; do echo "$(date +%s.%N) ${line}" ; done | awk '{ if ($1<$2) print 1000*($2-$1);else  print 1000*($1-$2)" ms"}' 
echo `date` $0 Done