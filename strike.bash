#!/bin/bash
while :
do
	echo `date` Strike a key to launch $*
	read x
	echo Running $*
	$*
done
