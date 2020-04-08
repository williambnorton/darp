#!/bin/bash
echo `date` compiling typescript into javascript 
rm Build.??????.????
find . -name '*.pid' -delete
MESSAGE="Simulator stable Redis-based nodes"
date>"Build."`date +%y%m%d.%H%M`
ls -l "Build."`date +%y%m%d.%H%M`

tsc config/config && tsc express/express && tsc pulser/pulser && tsc handlepulse/handlepulse && git add . && git commit -m "$MESSAGE + stabliizing base platform for launch" && git push

echo `date` Completed compiles and git push for `ls Build*`
