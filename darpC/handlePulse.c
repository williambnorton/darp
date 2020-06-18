// 	handlePulse.c
//		- print out each message
//
#include <arpa/inet.h> 
#include <errno.h> 
#include <netinet/in.h> 
#include <signal.h> 
#include <stdio.h> 
#include <stdlib.h> 
#include <strings.h> 
#include <sys/socket.h> 
#include <sys/types.h> 
#include <sys/time.h> 
#include <unistd.h> 
#define PORT "65013" 
#define MAXLINE 1400

int max(int x, int y) 
{ 
	if (x > y) 
		return x; 
	else
		return y; 
} 

unsigned long long now() {
struct timeval tv;
	gettimeofday(&tv, NULL);

	unsigned long long millisecondsSinceEpoch =
    	        (unsigned long long)(tv.tv_sec) * 1000 +
    		(unsigned long long)(tv.tv_usec) / 1000;

	//printf("%llu\n", millisecondsSinceEpoch);
	return millisecondsSinceEpoch;
}

int main(int argc, char *argv[]) 
{ 
	int listenfd, connfd, udpfd, nready, maxfdp1; 
	char buffer[MAXLINE]; 
	pid_t childpid; 
	fd_set rset; 
	ssize_t n; 
	socklen_t len; 
	const int on = 1; 
	struct sockaddr_in cliaddr, servaddr; 
	char* message = "Hello Client"; 
	void sig_chld(int); 

	char *port=argv[1];
	if (!port) port=PORT;
	printf("Starting %s listening on UDP port %s\n",argv[0],port);

	/* create listening socket */
	listenfd = socket(AF_INET, SOCK_STREAM, 0); 
	bzero(&servaddr, sizeof(servaddr)); 
	servaddr.sin_family = AF_INET; 
	servaddr.sin_addr.s_addr = htonl(INADDR_ANY); 
	servaddr.sin_port = htons(atoi(port)); 
	//servaddr.sin_port = htons(atoi(PORT)); 

	// binding server addr structure to listenfd 
	//bind(listenfd, (struct sockaddr*)&servaddr, sizeof(servaddr)); 
	//listen(listenfd, 10); 

	/* create UDP socket */
	udpfd = socket(AF_INET, SOCK_DGRAM, 0); 
	// binding server addr structure to udp sockfd 
	int rc=bind(udpfd, (struct sockaddr*)&servaddr, sizeof(servaddr)); 
	if (rc!=0) {
		printf("bind failed for UDP port %s rc=%d\n",port,rc);
		exit(-1);
	}
	// clear the descriptor set 
	FD_ZERO(&rset); 

	// get maxfd 
	maxfdp1 = max(listenfd, udpfd) + 1; 
	for (;;) { 

		// set listenfd and udpfd in readset 
		//FD_SET(listenfd, &rset); 
		FD_SET(udpfd, &rset); 

		// select the ready descriptor 
		nready = select(maxfdp1, &rset, NULL, NULL, NULL); 

		// if udp socket is readable receive the message. 
		if (FD_ISSET(udpfd, &rset)) { 
			len = sizeof(cliaddr); 
			bzero(buffer, sizeof(buffer)); 
			printf("\nMessage from UDP client: "); 
			n = recvfrom(udpfd, buffer, sizeof(buffer), 0, 
						(struct sockaddr*)&cliaddr, &len); 

			//puts(buffer); 
			char incomingMessage[1500];
			*incomingMessage='\0';
			sprintf(incomingMessage,"%s", buffer);
			//printf("incomingMessage=%s\n",incomingMessage);
			//
			//	handle Pulse here
			//
			unsigned long long ts=now();
			char incomingTimestamp[MAXLINE];
			sprintf(incomingTimestamp,"%llu",ts);
			//printf("RECV: %s,%s\n",incomingTimestamp,incomingMessage);
			char bigBuffer[3000];
			sprintf(bigBuffer,"%s,%s\n",incomingTimestamp,incomingMessage);
			//printf("bigBuffer=%s\n",bigBuffer);

			printf("submitting msg to msgBus: %s\n",bigBuffer);

			//sendto(udpfd, (const char*)message, sizeof(buffer), 0, 
			//	(struct sockaddr*)&cliaddr, sizeof(cliaddr)); 
		} 
	} 
} 

