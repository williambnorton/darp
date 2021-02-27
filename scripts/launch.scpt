#!/usr/bin/osascript
tell application "iTerm2"
    tell current session of current tab of current window
        write text "~/scripts/sshA sshA ubuntu@52.53.222.151 AWS-US-WEST-1A"
	write text "(sleep 50;~/wireguard/wgwatch.bash) & "
	write text "(sleep 110; docker run -p 80:80 -d williambnorton/srwan ) &"
        write text "(sleep 30; docker run --network=host --restart=on-failure:10 --cap-add=NET_ADMIN --cap-add=SYS_MODULE -v /var/run/docker.sock:/var/run/docker.sock:ro --device /dev/net/tun:/dev/net/tun --name=syntropy-agent -e SYNTROPY_NETWORK_API='docker' -e SYNTROPY_API_KEY=YUeDgQNAg4qbOSL0kA2gIUyiehoB1kLC -d syntropynet/agent:stable ) &"
	write text "docker rm -f $(docker ps -a -q);docker rmi -f $(docker images -q); docker run --rm -p 65013:65013 -p 65013:65013/udp  -e PUID=1000 -e PGID=1000 -v ~/wireguard:/etc/wireguard  -e HOSTNAME=`hostname`   -e WALLET=auto   -it williambnorton/darp"
        split horizontally with default profile
        split vertically with default profile
    end tell
    tell second session of current tab of current window
        write text "echo sleeping for 40 seconds before starting Genesis nodes "		
	write text "sleep 40;cd ~/Development/noia/;./startall.bash GEN;open http://52.53.222.151:65013/ & open http://52.53.222.151:80/ & "
        split vertically with default profile
    end tell
    tell third session of current tab of current window
        write text "echo sleeping for 100 seconds ibefore starting all non-genesis nodes "		
	write text "sleep 80;cd ~/Development/noia/;./startAll.bash MEM"
    end tell
    tell fourth session of current tab of current window
        write text "tail -f /tmp/x"
	split vertically with default profile
    end tell
end tell
