#
# Dockerfile for DARP - eventually add in popular open source network i
#	diagnostics and debugging tools
#
FROM ubuntu:18.04 as base
RUN apt-get update -yq  && \ 
    apt-get install -yq curl git npm inetutils-traceroute traceroute && \
    apt-get upgrade -yq
WORKDIR /opt

FROM node:14
RUN apk add wireguard-tools wget curl iproute2 git && \
    rm -rf /var/cache/apk/* && \
    git clone https://github.com/williambnorton/darp.git /root/darp
# COPY . /root/dare

RUN echo INSTALLING EXPRESS AND EJS

RUN npm update 
RUN npm install express
RUN npm install ejs

#My docker couldn't find the node express module...
ADD node_modules node_modules

EXPOSE 65013/tcp 65013/udp 80/udp 80/tcp
WORKDIR /root/darp
ENTRYPOINT ["/bin/bash","-c","./bootdarp.bash"]
