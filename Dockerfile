FROM ubuntu:18.04 as base
RUN apt-get update && \ 
    apt install -y npm && \
    npm update && npm install
WORKDIR /opt

FROM node:current-alpine3.10
RUN apk add wireguard-tools wget curl iproute2 git && \
    rm -rf /var/cache/apk/* && \
    git clone https://github.com/williambnorton/darp.git /root/darp
# COPY . /root/darp
RUN cd /root/darp && npm install
EXPOSE 65013/tcp 65013/udp 80/udp 80/tcp
WORKDIR /root/darp
ENTRYPOINT ["/bin/bash","-c","./bootdarp.bash"]
