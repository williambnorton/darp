#!/bin/bash
  

while [ "$1" != "" ]; do
    case $1 in
        -g | --genesis )           shift
                                GENESIS=`curl ifconfig.io`
                                echo `date` You are Genesis Node
                                echo `date` Invite others to your VPN

                                ;;
        -i | --interactive )    interactive=1
                                ;;
        -h | --help )           echo 'usage [ <genesisIPaddr> | -g ]'
                                echo '-g means you are the genesis node'
                                echo '   and others can join'
                                exit
                                ;;
        * )                     GENESIS=$1
                                exit 1
    esac
    shift
done

GENESIS_CONNECT_CMD="docker run -p 65013:65013 -p 65013:65013/udp -p 80:80/udp -v ${HOME}/wireguard:/etc/wireguard -e \"GENESIS="${GENESIS}"\" -e \"HOSTNAME=`hostname`\"  -e \"WALLET=auto\" -it williambnorton/darp:latest"
echo
echo
echo
echo Invite others to join with this docker cmd:
echo
echo $GENESIS_CONNECT_CMD
echo
echo running it now:
docker run -p 65013:65013 -p 65013:65013/udp -p 80:80/udp -v ${HOME}/wireguard:/etc/wireguard -e GENESIS=${GENESIS} -e HOSTNAME=`hostname`  -e WALLET=auto -it williambnorton/darp:latest 


