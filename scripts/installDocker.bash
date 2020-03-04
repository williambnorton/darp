#!/bin/bash
#	installDocker - install docker
#
SUDO=sudo
${SUDO} npm update
#install docker
(docker 2>&1)>/dev/null
if [ $? -ne 0 ]; then
                echo `date` Installing Docker for NOIA model to run in
                echo "Y" | ${SUDO} apt-get remove docker docker-engine docker.io
                ${SUDO} apt install docker.io
                ${SUDO} systemctl start docker
                ${SUDO} systemctl enable docker
                ${SUDO} usermod -aG docker $USER
                echo `date` DOCKER installed - may need to log out and back in
fi
