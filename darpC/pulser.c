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
int pulse(char *message, char *ipaddr, char *inPort) {
	printf("pulse(): message=%s ipaddr=%s port=%s\n",message, ipaddr, inPort);
	if ((message==NULL) || (ipaddr==NULL) || (inPort==NULL) ) { fprintf(stderr,"pulser.c(): NULL message exitting\n");exit(-1); }

	int port=atoi(inPort);
	if (port<=0 || port>65534) { fprintf(stderr,"pulser.c: pulse(): Bad port %s on call message exitting\n",inPort);exit(-1); }
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
	
	//printf("pulse done\n");
	return 0; 
} 

int pulser(char *token) {
	//printf("pulser() token=%s\n",token);
	if (token==NULL) { fprintf(stderr,"pulser.c(): NULL message exitting\n"); exit(-1); }
	char *msg=token;
	while( (token=strtok(NULL," ,\t\n")) != NULL ) {
		//printf("token=%s\n",token);
		char *ipaddr=token;
		char *s=strchr(token,':');  //s is the pointer to a colon
		//printf(" s=%s\n",s);

		char * port=PORT; //default port
		if (s) {
			port=s+1;
			*s='\0';  //null terminate ip
		}
		pulse(msg,ipaddr,port);
	}
	return 0;
}

//
//
//
int main(int argc, char *argv[]) 
{ 
		// Creating socket file descriptor 
		if ((sockfd = socket(AF_INET, SOCK_DGRAM, 0)) < 0) { 
			printf("pulser.c: ERROR **** socket creation failed"); 
			exit(0); 
		} 
		
   for (; ; ) {

		//this reads from stdin safely
		char *buffer = NULL;
		int read;
		size_t len;

		read = getline(&buffer, &len, stdin);
		printf("buffer=%s\n",buffer);
		if (-1 != read)
			pulser(strtok(buffer," ,\t\n")); //HERE WE invoke pulser
		else
			printf("No line read...\n");
		char *message=buffer;

		if (strlen(message)>MAXLINE) {
			printf("pulser.c: %s: message too big: %lu bytes\n",argv[0],strlen(message));
			exit(-1);
		}


		//printf("Size read: %d\n Len: %zu\n", read, len);
		free(buffer);
   }



}
