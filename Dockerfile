#
# Dockerfile for DARP - eventually add in popular open source network 
#	diagnostics and debugging tools (ping, traceroute, tcpdump/netcat/...)
#
FROM ubuntu:18.04 as base
RUN apt-get update && \ 
    apt install node-typescript -y \
    apt install -y npm  
WORKDIR /opt

FROM node:current-alpine3.10
RUN apk add wireguard-tools wget curl iproute2 git && \
    rm -rf /var/cache/apk/* && \
    git clone https://github.com/williambnorton/darp.git /root/darp
# COPY . /root/dare
RUN npm update && npm install express && npm install ejs

#My docker couldn't find the node express module...
ADD node_modules node_modules

EXPOSE 65013/tcp 65013-65200/udp
WORKDIR /root/darp
ENTRYPOINT ["/bin/bash","-c","./bootdarp.bash"]
