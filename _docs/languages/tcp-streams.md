---
title: TCP Streams
description: Client and server TCP basics with framing and timeout considerations.
---

## Basic Explanation

TCP gives a reliable ordered byte stream between peers.

Important: TCP is a stream, not message packets. You must define framing (for example newline-delimited or length-prefixed messages).

## Minimal Client (HTTP over raw TCP)

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
import socket

with socket.create_connection(("example.com", 80), timeout=5) as sock:
    request = (
        b"GET / HTTP/1.1\r\n"
        b"Host: example.com\r\n"
        b"Connection: close\r\n\r\n"
    )
    sock.sendall(request)

    chunks: list[bytes] = []
    while True:
        data = sock.recv(4096)
        if not data:
            break
        chunks.append(data)

print(b"".join(chunks).decode("utf-8", errors="replace"))
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use std::io::{Read, Write};
use std::net::TcpStream;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut stream = TcpStream::connect("example.com:80")?;
    stream.set_read_timeout(Some(std::time::Duration::from_secs(5)))?;

    let request = b"GET / HTTP/1.1\r\nHost: example.com\r\nConnection: close\r\n\r\n";
    stream.write_all(request)?;

    let mut response = String::new();
    stream.read_to_string(&mut response)?;
    println!("{}", response);
    Ok(())
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "fmt"
    "io"
    "net"
    "time"
)

func main() {
    conn, err := net.DialTimeout("tcp", "example.com:80", 5*time.Second)
    if err != nil {
        panic(err)
    }
    defer conn.Close()

    _ = conn.SetDeadline(time.Now().Add(5 * time.Second))

    request := "GET / HTTP/1.1\r\nHost: example.com\r\nConnection: close\r\n\r\n"
    if _, err := conn.Write([]byte(request)); err != nil {
        panic(err)
    }

    b, err := io.ReadAll(conn)
    if err != nil {
        panic(err)
    }
    fmt.Println(string(b))
}
```

</div>
</div>

## Minimal Line-Based Echo Server

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
import socket

HOST, PORT = "127.0.0.1", 9000

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((HOST, PORT))
    server.listen()
    print(f"listening on {HOST}:{PORT}")

    conn, addr = server.accept()
    with conn:
        print("client:", addr)
        with conn.makefile("rwb") as stream:
            while True:
                line = stream.readline()
                if not line:
                    break
                stream.write(line)
                stream.flush()
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use std::io::{BufRead, BufReader, Write};
use std::net::{TcpListener, TcpStream};

fn handle_client(mut stream: TcpStream) -> Result<(), Box<dyn std::error::Error>> {
    let mut reader = BufReader::new(stream.try_clone()?);
    loop {
        let mut line = String::new();
        let n = reader.read_line(&mut line)?;
        if n == 0 {
            break;
        }
        stream.write_all(line.as_bytes())?;
        stream.flush()?;
    }
    Ok(())
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let listener = TcpListener::bind("127.0.0.1:9000")?;
    println!("listening on 127.0.0.1:9000");

    for stream in listener.incoming() {
        match stream {
            Ok(s) => {
                handle_client(s)?;
                break;
            }
            Err(e) => eprintln!("accept error: {}", e),
        }
    }
    Ok(())
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "bufio"
    "fmt"
    "net"
)

func handle(conn net.Conn) {
    defer conn.Close()

    r := bufio.NewReader(conn)
    w := bufio.NewWriter(conn)

    for {
        line, err := r.ReadString('\n')
        if err != nil {
            return
        }
        if _, err := w.WriteString(line); err != nil {
            return
        }
        if err := w.Flush(); err != nil {
            return
        }
    }
}

func main() {
    ln, err := net.Listen("tcp", "127.0.0.1:9000")
    if err != nil {
        panic(err)
    }
    defer ln.Close()

    fmt.Println("listening on 127.0.0.1:9000")
    conn, err := ln.Accept()
    if err != nil {
        panic(err)
    }
    handle(conn)
}
```

</div>
</div>

## Production Notes

- Set read/write deadlines to avoid stuck sockets.
- Handle partial reads/writes; never assume one `read` equals one message.
- Use TLS for Internet traffic (`ssl` in Python, `rustls`/`native-tls` ecosystem in Rust, `crypto/tls` in Go).
- Use protocol-level framing (length-prefix, varint-length, newline, etc.).

## Advanced Cookbook Additions

### TCP Reality Checklist

1. TCP is a byte stream, not a message protocol.
2. One `send` does not imply one `recv` on peer side.
3. Reads may return partial frames; framing is your responsibility.
4. Backpressure must be respected to avoid memory blowups.

### Framing Strategies

Common options:

- delimiter-based (line protocol)
- length-prefixed binary frames
- fixed-size records (only for constrained formats)

Pick one and make it explicit in protocol docs and tests.

### Half-Close and Connection Lifecycle

- peer may close write side while still reading
- distinguish EOF from transient timeout
- ensure graceful shutdown semantics are documented

### Reliability and Security Notes

1. enforce read/write deadlines
2. validate frame size bounds before allocation
3. protect against slowloris-style peer behavior
4. handle reconnect policy separately from transport parsing logic
