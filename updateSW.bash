#!/bin/bash
#		    bootdarp.bash - fetch updated darp software and launch forever script
#
echo `date` compiling typescript into javascript 
#this should be a check to see if code has changed and the do soft reload.
# for now, just replace code with new
cd /tmp
rm -rf /tmp/darp
mv /darp /tmp/darp
echo `date` Cloning new darp code from github
git clone https://github.com/williambnorton/darp.git    /darp     
cd /darp
echo `date` Completed git clone for `ls build*`
