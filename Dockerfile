#
# Dockerfile for DARP - eventually add in popular open source network i
#	diagnostics and debugging tools
#   build a new docker when bootdarp.bash changes or when node_modules needs change
#
FROM alpine as base

RUN apk update
RUN apk add curl wget git 
RUN apk add nodejs npm
RUN apk add iputils iproute2 
RUN apk add wireguard-tools
#RUN apk add --no-cache --update wireguard-tools

WORKDIR /opt
COPY package.json /opt

#woud be cool to allow fastest nodes be able to build darp and send to github and build a docker to docker hub
#RUN npm install tsc -g
#RUN npm install docker



#RUN git clone https://github.com/williambnorton/darp.git /root/darp
COPY . /root/darp
RUN ls -l /root/darp/Build*
RUN echo INSTALLING EXPRESS AND EJS

RUN npm update 
RUN npm install express
RUN npm install ejs
RUN npm install

#My docker couldn't find the node express module...
COPY node_modules /root/node_modules
COPY package.json .

EXPOSE 65013/tcp 65013/udp 80/udp 80/tcp
WORKDIR /root/darp

#ENTRYPOINT ["/bin/bash"]
#ENTRYPOINT ["/bin/bash","-c","./bootdarp.bash"]
#ENTRYPOINT ["/bin/bash","-c","./forever.bash"]
# ONLY LAST ONE GETS USED
CMD ["/bin/bash","-c","./forever.bash"]
CMD ["/bin/bash","-c","./bootdarp.bash"]
#CMD ["/bin/bash"]