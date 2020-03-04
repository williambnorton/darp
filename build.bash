#!/bin/bash
tsc express/express && tsc pulser/pulser && tsc handlepulse/handlepulse && git add . && git commit -m "$0 working on CI" && git push
