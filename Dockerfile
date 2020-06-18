FROM ubuntu:18.04 as base
RUN apt-get update && \ 
    apt install -y npm && \
    npm install express redis jstat
WORKDIR /opt

FROM node:current-alpine3.10
RUN apk add wireguard-tools redis wget curl iproute2 git && \
    rm -rf /var/cache/apk/* && \
    git clone https://github.com/williambnorton/darp.git /root/darp
COPY --from=base /node_modules .
EXPOSE 65013/tcp 65013/udp 80/udp 80/tcp
WORKDIR /root/darp
ENTRYPOINT ["/bin/bash","-c","./bootdarp.bash"]
