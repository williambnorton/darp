// UDP client program 
#include <arpa/inet.h> 
#include <netinet/in.h> 
#include <stdio.h> 
#include <stdlib.h> 
#include <strings.h> 
#include <sys/socket.h> 
#include <sys/types.h> 
#include <sys/time.h> 

     #include <unistd.h>
#define PORT "65013"
#define MAXLINE 1400 


/*
#include <stdio.h>
#include <signal.h>
#include <unistd.h>

void poll(int s) {
     printf("copyit: Still working...\n" );
     alarm(1);    //for every second
     signal(SIGALRM, display_message);
}

*/


unsigned long long now() {
struct timeval tv;
        gettimeofday(&tv, NULL);

        unsigned long long millisecondsSinceEpoch =
                (unsigned long long)(tv.tv_sec) * 1000 +
                (unsigned long long)(tv.tv_usec) / 1000;

        //printf("%llu\n", millisecondsSinceEpoch);
        return millisecondsSinceEpoch;
}


int sockfd; 
//
//	pulse() - send a quick pulse msg to a list of nodes 
//
int pulse(char *message, char *ipaddr, int port) {
	printf("pulse(): message=%s ipaddr=%s port=%d\n",message, ipaddr, port);
	char buf[1500];
	sprintf(buf,"%llu,%s",now(),message);
	//printf("Pulsing message with ts=%s\n",buf);
	char buffer[MAXLINE]; 
	struct sockaddr_in servaddr; 
	int n, len; 

	memset(&servaddr, 0, sizeof(servaddr)); 

	// Filling server information 
	servaddr.sin_family = AF_INET; 
	servaddr.sin_port = htons(port); 
    servaddr.sin_addr.s_addr = inet_addr(ipaddr); 

	printf("pulse() sending %s:%d  buf=%s \n",ipaddr,port,buf);
	// send pulse to peer 
	sendto(sockfd, (const char*)buf, strlen(buf), 
		0, (const struct sockaddr*)&servaddr, 
		sizeof(servaddr)); 
	
	printf("pulse done\n");
	return 0; 
} 


//
//
//
int main(int argc, char *argv[]) 
{ 

char* message = "0,Build.200527.1810,DEVOPS,DEVOPS.1,508,1590689309646,1590688799453,1,1=2,2=78,3=115,4=171,5=10,"; 

	if (argc <=2) {
		printf("Usage: %s msg ip[:port] ... [ip[:port]]\n",argv[0]);
		 exit(0);
	}

	message=argv[1];
	if (strlen(message)>MAXLINE) {
		printf("%s: message too big: %lu bytes\n",argv[0],strlen(message));
		exit(-1);
	}
	// Creating socket file descriptor 
	if ((sockfd = socket(AF_INET, SOCK_DGRAM, 0)) < 0) { 
		printf("drpC ERROR **** socket creation failed"); 
		exit(0); 
	} 
  	printf("Starting %s sending %s \n",argv[0],argv[1]);
  		//printf(" ipaddr=%s\n",argv[2]);
   for (; ; ) {
  	for (int i=2; i<argc; i++) {
			char *ipaddr=argv[i];
			char *port=PORT; //default
			char *sep=strchr(ipaddr,':');
			if (sep) {
				port=(sep+1);
				*sep='\0';
			} else printf("null sep-defaulting to 65013");
			printf("PULSE: pulsing %s port %s with msg=%s\n",ipaddr,port,message);
			pulse(message,ipaddr,atoi(port));
  	}
	sleep(1);
   }
}
