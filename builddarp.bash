#!/bin/bash
#		builddarp.bash - faster than building a docker (5 min) this compiles and pushes
#	so when first node started (called a 'Genesis' node) launches new SW
#	all nodes in the pulsegroup hear about it and reloads to update
#	This ensures all nodes in a pulse group are always running the latest SW so 
#	fewer incompaitibilities to wirry about
echo `date` compiling typescript into javascript 
rm Build.??????.????
find . -name '*.pid' -delete
MESSAGE="Version 2 - simple javascript pulseGroup object model"
date>"Build."`date +%y%m%d.%H%M`
echo `ls Build*` > SWVersion
ls -l Build.*

#
#	The same flow should work on boot darp - simple extensible loop
#
cd messagelayer
tsc *.ts
cd ..

git add *.bash
git add . && git commit -m "$MESSAGE + " && git push
echo `date` Completed compiles + git push for `ls Build*`
