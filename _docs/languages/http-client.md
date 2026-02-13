---
title: HTTP Client
description: Standard-library-first HTTP patterns plus recommended third-party clients.
---

## Practical Rule

- Python: stdlib works, but `httpx` is often the most ergonomic modern client.
- Rust: use `reqwest` for production; raw stdlib TCP is educational but low-level.
- Go: stdlib `net/http` is production-grade and usually the default.

## GET Request with Headers and Timeout

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
import json
from urllib.request import Request, urlopen

req = Request(
    "https://httpbin.org/get?topic=http",
    headers={"User-Agent": "cs-cookbook/1.0"},
)

with urlopen(req, timeout=5) as resp:
    body = resp.read().decode("utf-8")
    payload = json.loads(body)
    print(resp.status, payload["url"])
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use std::io::{Read, Write};
use std::net::TcpStream;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Educational raw HTTP/1.1 request over TCP.
    let mut stream = TcpStream::connect("httpbin.org:80")?;
    stream.set_read_timeout(Some(std::time::Duration::from_secs(5)))?;

    let req = b"GET /get?topic=http HTTP/1.1\r\nHost: httpbin.org\r\nUser-Agent: cs-cookbook/1.0\r\nConnection: close\r\n\r\n";
    stream.write_all(req)?;

    let mut response = String::new();
    stream.read_to_string(&mut response)?;
    println!("{}", &response[..response.len().min(220)]);
    Ok(())
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "time"
)

func main() {
    client := &http.Client{Timeout: 5 * time.Second}

    req, err := http.NewRequest(http.MethodGet, "https://httpbin.org/get?topic=http", nil)
    if err != nil {
        panic(err)
    }
    req.Header.Set("User-Agent", "cs-cookbook/1.0")

    resp, err := client.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        panic(err)
    }

    var payload map[string]any
    if err := json.Unmarshal(body, &payload); err != nil {
        panic(err)
    }
    fmt.Println(resp.StatusCode, payload["url"])
}
```

</div>
</div>

## POST JSON

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
import json
from urllib.request import Request, urlopen

payload = {"name": "Ada", "role": "student"}
raw = json.dumps(payload).encode("utf-8")

req = Request(
    "https://httpbin.org/post",
    data=raw,
    method="POST",
    headers={
        "Content-Type": "application/json",
        "User-Agent": "cs-cookbook/1.0",
    },
)

with urlopen(req, timeout=5) as resp:
    print(resp.status)
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
// Cargo.toml: reqwest = { version = "0.12", features = ["blocking", "json"] }
// Cargo.toml: serde_json = "1"
use reqwest::blocking::Client;
use serde_json::json;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()?;

    let resp = client
        .post("https://httpbin.org/post")
        .json(&json!({"name": "Ada", "role": "student"}))
        .send()?;

    println!("{}", resp.status());
    Ok(())
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "bytes"
    "fmt"
    "net/http"
    "time"
)

func main() {
    client := &http.Client{Timeout: 5 * time.Second}

    raw := []byte(`{"name":"Ada","role":"student"}`)
    req, err := http.NewRequest(http.MethodPost, "https://httpbin.org/post", bytes.NewReader(raw))
    if err != nil {
        panic(err)
    }
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("User-Agent", "cs-cookbook/1.0")

    resp, err := client.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    fmt.Println(resp.StatusCode)
}
```

</div>
</div>

## Recommended Libraries (When You Need More)

### Python

- Recommended: [`httpx`](https://www.python-httpx.org/) (sync + async, modern API)
- Alternative: [`requests`](https://requests.readthedocs.io/) (widely used)

```python
import httpx

with httpx.Client(timeout=5.0) as client:
    r = client.get("https://httpbin.org/get")
    print(r.status_code, r.json()["url"])
```

### Rust

- Recommended: [`reqwest`](https://docs.rs/reqwest/latest/reqwest/) (blocking + async, TLS, middleware ecosystem)
- Alternatives:
  - [`ureq`](https://github.com/algesten/ureq) (simple sync client)
  - [`hyper`](https://github.com/hyperium/hyper) (lower-level, high-performance HTTP)

```rust
// Cargo.toml: reqwest = { version = "0.12", features = ["blocking"] }
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let body = reqwest::blocking::get("https://httpbin.org/get")?.text()?;
    println!("{}", &body[..body.len().min(120)]);
    Ok(())
}
```

### Go

- Recommended default: stdlib [`net/http`](https://pkg.go.dev/net/http)
- Alternatives:
  - [`resty`](https://github.com/go-resty/resty) (ergonomic higher-level client)
  - [`retryablehttp`](https://github.com/hashicorp/go-retryablehttp) (retry/backoff behavior)

```go
package main

import (
    "fmt"
    "time"

    "github.com/go-resty/resty/v2"
)

func main() {
    client := resty.New().SetTimeout(5 * time.Second)
    resp, err := client.R().Get("https://httpbin.org/get")
    if err != nil {
        panic(err)
    }
    fmt.Println(resp.StatusCode(), len(resp.Body()))
}
```

## Reliability Checklist

- Set explicit timeouts.
- Validate response status codes.
- Parse and validate response body shape.
- Add retry/backoff only for safe/idempotent operations unless API contract allows otherwise.
