---
title: Async IO
description: Deep cross-language guide to asynchronous I/O in Python, Rust, and Go, including runtimes, scheduling, cancellation, and production patterns.
permalink: /languages/general/async-io/
---

## Big Picture

Async I/O is about handling many waiting operations (network, disk, RPC) without blocking a thread per operation.

The important distinction:

- **Concurrency**: many tasks in flight
- **Parallelism**: many tasks executing at the same instant on different CPU cores

Async I/O gives concurrency efficiently, especially for I/O-bound systems.

## Mental Model: Cooperative Progress

In async systems, code yields control at await points, allowing runtime/scheduler to run other ready tasks.

Core pieces in every language:

1. async task representation
2. runtime/scheduler
3. nonblocking I/O integration (poll/epoll/kqueue/IOCP abstractions)
4. cancellation/timeouts/backpressure strategy

## Language Matrix

| Aspect | Python | Rust | Go |
| --- | --- | --- | --- |
| Primary model | `asyncio` coroutines | `Future` + runtime (`tokio`) | goroutines + runtime netpoll |
| Execution style | single-thread event loop by default | runtime-driven polling of futures | M:N scheduler over OS threads |
| Yield point | `await` | `.await` | blocking calls/yield points managed by runtime |
| Cancellation | task cancellation exceptions | drop/cancel handles + select/timeout | context cancellation + channel signaling |
| Typical HTTP client | `httpx` async | `reqwest` async | stdlib `net/http` with goroutines |

## How Async Actually Progresses

### High-level flow

```mermaid
flowchart LR
  A[Task Created] --> B[Task Runs Until Await]
  B --> C[Registers Interest In IO/Timer]
  C --> D[Runtime Schedules Other Ready Tasks]
  D --> E[IO/Timer Becomes Ready]
  E --> F[Task Resumed]
  F --> G[Complete or Await Again]
```

### What this means in practice

- `await` is not "sleep". It is "yield until dependency ready".
- If you do CPU-heavy work without yielding, you starve other tasks.
- Blocking operations inside async functions defeat async benefits.

## 1. Python Async I/O (`asyncio`)

### Runtime Model

- Coroutine functions (`async def`) create coroutine objects.
- Event loop runs ready tasks and resumes them at `await` points.
- One loop thread commonly handles thousands of sockets.

### Example: Concurrent HTTP Calls

```python
import asyncio
import httpx


async def fetch(client: httpx.AsyncClient, url: str) -> int:
    r = await client.get(url)
    r.raise_for_status()
    return len(r.text)


async def main() -> None:
    urls = [
        "https://example.com",
        "https://www.python.org",
        "https://httpbin.org/get",
    ]

    timeout = httpx.Timeout(10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        results = await asyncio.gather(*(fetch(client, u) for u in urls), return_exceptions=True)

    for u, out in zip(urls, results):
        print(u, out)


asyncio.run(main())
```

### Python Async Pitfalls

1. Calling blocking APIs in async code:
   move blocking tasks to thread/process executors.
2. Overusing `gather` without limits:
   use semaphores for fan-out caps.
3. Missing cancellation handling:
   handle `asyncio.CancelledError` in long-lived tasks.
4. Forgetting timeouts:
   network calls need explicit timeout policies.

## 2. Rust Async I/O (`Future` + Runtime)

### Runtime Model

- `async fn` compiles into a `Future` state machine.
- Future does nothing until polled by runtime/executor.
- Runtimes like Tokio poll ready futures and reschedule as wakers fire.

### Example: Tokio Task Orchestration

```rust
use tokio::task::JoinSet;
use tokio::time::{sleep, Duration};

async fn work(id: u32) -> String {
    sleep(Duration::from_millis(100 * id as u64)).await;
    format!("task-{id} done")
}

#[tokio::main]
async fn main() {
    let mut set = JoinSet::new();

    for id in 1..=5 {
        set.spawn(work(id));
    }

    while let Some(res) = set.join_next().await {
        println!("{}", res.expect("task panicked"));
    }
}
```

### Example: Timeout + Cancellation

```rust
use tokio::time::{sleep, timeout, Duration};

async fn slow() {
    sleep(Duration::from_secs(2)).await;
}

#[tokio::main]
async fn main() {
    if timeout(Duration::from_millis(200), slow()).await.is_err() {
        println!("timed out");
    }
}
```

### Rust Async Pitfalls

1. Blocking in async tasks:
   use `spawn_blocking` for blocking/CPU chunks.
2. Runtime mismatch:
   ensure crates are compatible with runtime used.
3. Lifetime and ownership complexity:
   design async boundaries with clear ownership.
4. Missing cancellation contracts:
   define what cleanup occurs when futures are dropped/cancelled.

## 3. Go Async-Like I/O (Goroutines + Runtime)

Go does not use `async`/`await`, but runtime-managed goroutines + nonblocking netpoll provide similar high-concurrency I/O behavior.

### Runtime Model

- goroutines are lightweight tasks scheduled on worker threads
- scheduler maps many goroutines onto fewer OS threads
- network operations integrate with runtime poller to avoid thread-per-connection scaling

### Example: Concurrent HTTP Fetches

```go
package main

import (
    "fmt"
    "io"
    "net/http"
    "sync"
    "time"
)

func fetch(url string, wg *sync.WaitGroup) {
    defer wg.Done()

    client := &http.Client{Timeout: 10 * time.Second}
    resp, err := client.Get(url)
    if err != nil {
        fmt.Println(url, "err:", err)
        return
    }
    defer resp.Body.Close()

    b, err := io.ReadAll(resp.Body)
    if err != nil {
        fmt.Println(url, "read err:", err)
        return
    }
    fmt.Println(url, "bytes:", len(b))
}

func main() {
    urls := []string{
        "https://example.com",
        "https://go.dev",
        "https://httpbin.org/get",
    }

    var wg sync.WaitGroup
    wg.Add(len(urls))
    for _, u := range urls {
        u := u
        go fetch(u, &wg)
    }
    wg.Wait()
}
```

### Example: Cancellation with Context

```go
package main

import (
    "context"
    "fmt"
    "time"
)

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
    defer cancel()

    done := make(chan struct{})
    go func() {
        defer close(done)
        time.Sleep(1 * time.Second)
    }()

    select {
    case <-done:
        fmt.Println("completed")
    case <-ctx.Done():
        fmt.Println("cancelled:", ctx.Err())
    }
}
```

### Go Pitfalls

1. Goroutine leaks:
   always have stop/cancel conditions.
2. Unbounded fan-out:
   use worker pools/semaphores for caps.
3. Missing request timeouts:
   define timeout policies for all external calls.
4. Channel ownership confusion:
   establish clear close/send ownership rules.

## Async vs Threads vs Processes

| Workload | Preferred model |
| --- | --- |
| Many network calls waiting on IO | async/goroutines |
| CPU-heavy numeric workload | threads/processes/rayon-style data parallel |
| Blocking legacy libraries | threads or offloading wrappers |

No single model wins globally. Choose by bottleneck profile.

## Backpressure and Concurrency Limits

Even with async, uncontrolled parallelism can collapse downstream systems.

Patterns:

- semaphore around outbound calls
- bounded queues/channels
- per-service concurrency budgets

### Example Pattern (Python)

```python
import asyncio

sem = asyncio.Semaphore(50)

async def guarded_call(fn):
    async with sem:
        return await fn()
```

### Example Pattern (Rust)

```rust
use std::sync::Arc;
use tokio::sync::Semaphore;

let limiter = Arc::new(Semaphore::new(50));
```

### Example Pattern (Go)

```go
sem := make(chan struct{}, 50)
// acquire: sem <- struct{}{}
// release: <-sem
```

## Error Handling and Cancellation Strategy

### Recommended baseline

1. Every external call gets timeout budget.
2. Cancellation signal propagates to child operations.
3. Partial failures are aggregated with context.
4. Retries are explicit and mostly for idempotent operations.

## Testing Async Code

### Python

- `pytest-asyncio`
- mock async dependencies (`AsyncMock`)

### Rust

- `#[tokio::test]` for async tests
- deterministic unit tests around cancellation and timeout behavior

### Go

- context-aware tests
- race detector (`go test -race`)
- avoid sleeping-only synchronization in tests

## Practical Selection Guide

| Situation | Python | Rust | Go |
| --- | --- | --- | --- |
| API server with many outbound calls | FastAPI + `httpx` async | Axum + Tokio + Reqwest | `net/http`/Gin/Echo + goroutines |
| CLI automation with many remote waits | `asyncio` + AsyncSSH | Tokio tasks | goroutines + context |
| CPU-heavy pipeline | multiprocessing / native libs | Rayon / native threads | goroutines + worker pools (or specialized libs) |

## Global Async IO Gotchas Checklist

1. Blocking calls in async path:
   this is the #1 cause of event-loop/scheduler starvation.
2. Missing timeout policy:
   default infinite waits create cascading failures.
3. Unbounded concurrency:
   add caps to protect your own service and dependencies.
4. Leaked tasks/goroutines:
   always define cancellation and shutdown paths.
5. Overly broad retries:
   can amplify incidents if retries ignore idempotency and backoff.

## Documentation Links

- Python `asyncio`: [docs.python.org/3/library/asyncio.html](https://docs.python.org/3/library/asyncio.html)
- Python `asyncio` tasks: [docs.python.org/3/library/asyncio-task.html](https://docs.python.org/3/library/asyncio-task.html)
- HTTPX async guide: [www.python-httpx.org/async](https://www.python-httpx.org/async/)
- Rust async book: [rust-lang.github.io/async-book](https://rust-lang.github.io/async-book/)
- Tokio docs: [docs.rs/tokio](https://docs.rs/tokio/latest/tokio/)
- Futures crate: [docs.rs/futures](https://docs.rs/futures/latest/futures/)
- Go scheduler overview: [go.dev/doc](https://go.dev/doc/)
- Go `context`: [pkg.go.dev/context](https://pkg.go.dev/context)
- Go `net/http`: [pkg.go.dev/net/http](https://pkg.go.dev/net/http)

## Deep Dive Cookbook Additions

### Structured Concurrency Patterns

Structured concurrency means child work is owned by parent scope and cannot outlive it silently.

- Python: task groups / explicit task tracking + cancellation fan-out
- Rust: scoped task sets and explicit join/cancel behavior
- Go: `context` trees + wait groups/channel orchestration

### How-To: Graceful Shutdown Checklist

1. stop accepting new requests
2. cancel/notify background workers
3. drain in-flight operations with deadline
4. flush buffered telemetry/logging
5. close shared clients/connections

### Backpressure Design Patterns

| Pattern | Python | Rust | Go |
| --- | --- | --- | --- |
| semaphore cap | `asyncio.Semaphore` | `tokio::sync::Semaphore` | buffered channel token bucket |
| bounded queue | `asyncio.Queue(maxsize=n)` | `tokio::sync::mpsc::channel(n)` | `make(chan T, n)` |
| drop/reject policy | custom | explicit branch on send failure/full queue | non-blocking select with default |

### Debugging Async Incidents

1. Collect per-operation timeout cause and dependency endpoint.
2. Track queue depth and semaphore saturation over time.
3. Distinguish "slow dependency" from "scheduler starvation".
4. Add traces around await boundaries for long-tail paths.

### Anti-Patterns

- spawning untracked background tasks/goroutines
- no cancellation propagation to downstream calls
- retries without jitter/backoff/idempotency awareness
- combining heavy CPU loops with event-loop threads
