#!/bin/bash
echo `date` compiling typescript into javascript 
date>"build."`date +%y%m%d.%H%M`
tsc config/config && tsc express/express && tsc pulser/pulser && tsc handlepulse/handlepulse && git add . && git commit -m "$0 working on CI" && git push
echo `date` Completed compiles and git push
