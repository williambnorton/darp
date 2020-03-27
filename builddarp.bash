#!/bin/bash
echo `date` compiling typescript into javascript 
rm Build.??????.????
find . -name '*.pid' -delete

date>"Build."`date +%y%m%d.%H%M`
ls -l "Build."`date +%y%m%d.%H%M`
npm i @types/node
tsc config/config && tsc express/express && tsc pulser/pulser && tsc handlepulse/handlepulse && git add . && git commit -m "working on config and express and scripts" && git push

echo `date` Completed compiles and git push for `ls Build*`
