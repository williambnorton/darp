#!/usr/bin/osascript
#
#
#
tell application "iTerm2"
    set newWindow to (create window with default profile)
    tell current session of newWindow
        write text "echo it works!"
            write text "~/scripts/sshA sshA ubuntu@52.53.222.151 AWS-US-WEST-1A"
            write text "(sleep 70; docker run -p 80:80 -d williambnorton/srwan 2>&1) >>/tmp/x &"
            write text "(sleep 50;~/wireguard/wgwatch.bash 2>&1 ) >>/tmp/x & "
            write text "(sleep 30; docker run --network=host --restart=on-failure:10 --cap-add=NET_ADMIN --cap-add=SYS_MODULE -v /var/run/docker.sock:/var/run/docker.sock:ro --device /dev/net/tun:/dev/net/tun --name=syntropy-agent -e SYNTROPY_NETWORK_API='docker' -e SYNTROPY_API_KEY=YUeDgQNAg4qbOSL0kA2gIUyiehoB1kLC -d syntropynet/agent:stable 2>&1) &"
            write text "(docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q); docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e HOSTNAME=`hostname`   -e WALLET=auto   -it williambnorton/darp 2>&1 ) >>/tmp/x "
            split horizontally with default profile
            split vertically with default profile
    end tell
end tell
