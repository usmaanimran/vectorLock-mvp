CC = gcc
CFLAGS = -Wall -Wextra -fPIC -O3
LDFLAGS = -shared

ifeq ($(OS),Windows_NT)
	TARGET = build/engine.dll
	LDFLAGS += -Wl,--out-implib,build/libengine.a
else
	TARGET = build/libengine.so
endif

SRCS = src/mapping.c src/functionSpecs.c
OBJS = $(SRCS:.c=.o)

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(LDFLAGS) -o $@ $^

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f $(OBJS) $(TARGET) build/libengine.a
