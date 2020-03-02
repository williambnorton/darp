FROM ubuntu:18.04
  
#       First fetch the wireguard files
RUN apt-get update && \
    apt-get install -y  software-properties-common && \
    add-apt-repository ppa:wireguard/wireguard && \
    apt-get install -y wireguard

#       Install the data store for all actitivities
RUN apt-get update && \
    apt-get install -y redis-server && \
    apt-get clean

#       install Tools
RUN apt-get install -y vim && \
        apt install -y nodejs npm wget curl iproute2

RUN npm install express --save
RUN npm install redis --save

COPY scripts/forever.bash /forever.bash
COPY scripts/configWG.bash /configWG.bash
RUN chmod +x /forever.bash /configWG.bash

EXPOSE 65013/tcp 65013/udp 80/udp 80/tcp

#CMD ["forever.bash"]
#CMD ["/bin/bash"]
CMD ["/bin/bash"]

RUN echo docker run -p 65013:65013 -p 65013:65013/udp -p 80:80/udp -v ~/wireguard:/etc/wireguard -e "HOSTNAME="`hostname` -e "WALLET=3BjDVN35cZdsRzyo4Q9VY3LFy1RteNBxPz" --rm -d -it williambnorton/noianode:latest



