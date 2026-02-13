---
title: Reqwest
description: Production HTTP client patterns in Rust for async and blocking use cases.
permalink: /languages/frameworks/rust/reqwest/
---

## Big Picture

`reqwest` is the most common high-level HTTP client in Rust.

Use it for:

- outbound REST/gRPC-gateway calls
- typed JSON request/response workflows
- TLS/auth/header handling with connection pooling

## Core Concepts

- `Client` for connection reuse
- async and blocking clients
- per-request and global timeout controls
- response validation with `error_for_status`

## Example: Async JSON Request

```rust
use reqwest::Client;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct User {
    id: u64,
    name: String,
}

async fn fetch_user(client: &Client, id: u64) -> Result<User, reqwest::Error> {
    client
        .get(format!("https://api.example.com/users/{id}"))
        .send()
        .await?
        .error_for_status()?
        .json::<User>()
        .await
}
```

## Example: Client Builder with Timeouts

```rust
use reqwest::Client;
use std::time::Duration;

fn build_client() -> Result<Client, reqwest::Error> {
    Client::builder()
        .connect_timeout(Duration::from_secs(2))
        .timeout(Duration::from_secs(5))
        .pool_max_idle_per_host(8)
        .build()
}
```

## Tradeoffs

### Pros

- ergonomic API, broad ecosystem usage
- robust TLS and serialization integration
- works well with Tokio-based services

### Cons

- retry policy is not automatic; must be designed explicitly
- improper client lifecycle can waste connections

## Edge Cases and Gotchas

1. Creating client per request:
   reuse shared `Client` for pool effectiveness.
2. Missing timeout policy:
   avoid infinite waits by setting explicit timeouts.
3. Retry semantics:
   retries should usually target idempotent operations.
4. Large payloads:
   stream body when needed to avoid memory spikes.

## Documentation Links

- Reqwest docs: [docs.rs/reqwest](https://docs.rs/reqwest/latest/reqwest/)
- Client builder: [docs.rs/reqwest/latest/reqwest/struct.ClientBuilder.html](https://docs.rs/reqwest/latest/reqwest/struct.ClientBuilder.html)
- Tokio runtime: [docs.rs/tokio](https://docs.rs/tokio/latest/tokio/)

## Deep Dive Cookbook Additions

### Client Policy Pattern

Define one client policy module:

- timeout budgets
- retry classification
- auth headers
- user agent

### How-To: Authenticated JSON POST

```rust
use reqwest::Client;
use serde::Serialize;

#[derive(Serialize)]
struct CreateOrder { sku: String, qty: u32 }

async fn create_order(client: &Client, token: &str) -> Result<(), reqwest::Error> {
    client
        .post("https://api.example.com/orders")
        .bearer_auth(token)
        .json(&CreateOrder { sku: "ABC-1".into(), qty: 2 })
        .send()
        .await?
        .error_for_status()?;
    Ok(())
}
```

### Operational Guidance

1. Separate retry policy for network vs application errors.
2. Redact auth/PII fields in outbound request logs.
3. Emit metrics by endpoint and status class.

## Error Taxonomy Pattern

Avoid leaking raw `reqwest::Error` through your whole codebase. Map errors into domain categories:

- timeout
- transient network
- client contract error (4xx)
- upstream unavailable (5xx)
- decode/validation error

This keeps retry and alerting behavior predictable.

## Complete Example: Resilient API Client Wrapper

```rust
use reqwest::{Client, StatusCode};
use serde::Deserialize;
use std::time::Duration;

#[derive(Debug)]
enum ApiError {
    Timeout,
    Network(String),
    BadRequest(String),
    Unavailable(u16),
    Decode(String),
}

#[derive(Debug, Deserialize)]
struct Profile {
    id: u64,
    email: String,
}

fn build_client() -> Result<Client, reqwest::Error> {
    Client::builder()
        .connect_timeout(Duration::from_secs(1))
        .timeout(Duration::from_secs(3))
        .pool_max_idle_per_host(16)
        .build()
}

async fn fetch_profile(client: &Client, id: u64) -> Result<Profile, ApiError> {
    let resp = client
        .get(format!("https://api.example.com/profiles/{id}"))
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                ApiError::Timeout
            } else {
                ApiError::Network(e.to_string())
            }
        })?;

    match resp.status() {
        StatusCode::OK => resp
            .json::<Profile>()
            .await
            .map_err(|e| ApiError::Decode(e.to_string())),
        StatusCode::BAD_REQUEST => Err(ApiError::BadRequest(resp.text().await.unwrap_or_default())),
        s if s.is_server_error() => Err(ApiError::Unavailable(s.as_u16())),
        s => Err(ApiError::Network(format!("unexpected status: {s}"))),
    }
}
```

## How-To: Retry Idempotent Calls

- retry only idempotent methods by default
- use exponential backoff with jitter
- cap max attempts and total deadline budget
- include retry count in logs/metrics

For non-idempotent writes, add idempotency keys or explicit dedupe semantics.

## How-To: Stream Large Response to Disk

```rust
use futures_util::StreamExt;
use tokio::io::AsyncWriteExt;

async fn download_to_file(url: &str, path: &str) -> anyhow::Result<()> {
    let client = reqwest::Client::new();
    let mut stream = client.get(url).send().await?.error_for_status()?.bytes_stream();
    let mut file = tokio::fs::File::create(path).await?;

    while let Some(chunk) = stream.next().await {
        file.write_all(&chunk?).await?;
    }
    Ok(())
}
```

## Operational Checklist

1. shared client instance per service process
2. endpoint-level timeout budgets
3. status-class and timeout metrics
4. sensitive header redaction in logs
5. staged rollout for new upstream integrations
