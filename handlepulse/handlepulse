#!/bin/bash
echo `date` Starting $0
kill `cat $0.pid`
sleep 1
node $0 &
echo $$ > $0.pid
echo $0 is Process #$$
