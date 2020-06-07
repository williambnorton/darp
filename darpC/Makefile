#
#	Makefile - two low level measurement "C" modules
#
all:
	make clean
	make pulser
	make handlePulse

clean:
	-rm *.o pulser handlePulse  

pulser:
	gcc -o pulser pulser.c

handlePulse: 
	gcc -o handlePulse handlePulse.c
