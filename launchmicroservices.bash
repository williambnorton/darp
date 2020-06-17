#!/bin/bash
#
#	DARP Extensibility goes here - add new code here, it will be started with DARP 
#			and have access to the REDIS data structures, subscribe to pulses and matrixes
#	
# 1) Put all microservices code here - 
#     every directory in this directory will have a same samed microservice to launch
# 2) Killing off should also use the same process
#	

microservices=`cd microservices;ls;cd ..`
echo `date` $0 launching $microservices

(echo $0 | grep launchmicroservices 2>&1)>/dev/null
if [ $? -eq 0 ]; then
	MODE=Launching
	echo `date` Launching but first killing 
	./killmicroservices.bash
	echo `date` Launching DARP microservices
else
	MODE=Killing
	echo `date` Killing DARP microservices
fi
if [ "$MODE" == "Launching" ]; then
	echo `date` launching redis
	redis-server &
	sleep 1; #wait to let redis start
else
	pid=`ps aux | grep redis-server | grep -v grep | awk '{ print $2 }'`
	echo `date` Killing redis server pid=$pid
	kill $pid
fi

for microservice in $microservices
do
  #
  #   cd into microserviuce directory and launch service as independent backgorund process
  #
  cd $microservice
  echo `date` "$MODE  $microservice... "
  if [ "$MODE" == "Launching" ]; then
	node $microservice &
  	echo $$ > $microservice.pid
  else 
	echo `date` Killing $microservice
        kill `cat $microservice.pid`
	pid=`ps aux | grep $microservice | grep -v grep | awk '{ print $2 }'`
	kill $pid
  fi
  #sleep 1     #each service should  independently wait or retry on launch as needed
   cd ..
done


