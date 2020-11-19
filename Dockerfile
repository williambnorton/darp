#
# Dockerfile for DARP - eventually add in popular open source network i
#	diagnostics and debugging tools
#
FROM alpine as base

RUN apk update
RUN apk add curl wget git 
RUN apk add nodejs npm
RUN apk add iputils iproute2 
RUN apk add wireguard-tools
#RUN apk add --no-cache --update wireguard-tools

WORKDIR /opt
#COPY package.json /opt

RUN git clone https://github.com/williambnorton/darp.git /root/darp
#COPY . /root/darp
RUN ls -l /root/darp/Build*
RUN echo INSTALLING EXPRESS AND EJS

RUN npm update 
RUN npm install express
RUN npm install ejs

#My docker couldn't find the node express module...
#ADD node_modules darp/dist/node_modules

EXPOSE 65013/tcp 65013/udp 80/udp 80/tcp
WORKDIR /root/darp
ENTRYPOINT ["/bin/bash","-c","./bootdarp.bash"]
