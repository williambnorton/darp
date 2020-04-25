# darp
Distributed Autonomous Routing Protocol Simulation Code

This code helps us quantify the savings by sending traffic via an overlay

Components
bootdarp.bash - starts the processes that feed data into and out of redis
pulser/ - sends one way latency measurments by sending a single packet of all measurements to it
handlepulse/ - captures one-way latecy measurements and stores the data into a matrix in redis
config/ - initial setup code - 
express/ - instrumentation via the web, also runs http://node/nodefactory as genesis node
scripts/ - configWG.bash - configures wireguard

/etc/wireguard - in the docker is a mount of ~/wireguard in the host. 
Here SINGLESTEPs the keys and configuration files for wireguard

to start:
run the docker
