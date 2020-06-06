all:
	make clean
	make udpcli

clean:
	-rm *.o ser udpcli 

udpcli:
	gcc -o udpcli UDP_client.c

ser: 
	gcc -o ser server.c
