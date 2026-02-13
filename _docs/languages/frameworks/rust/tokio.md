---
title: Tokio
description: Async runtime fundamentals for Rust services with task orchestration, timing, and cancellation patterns.
permalink: /languages/frameworks/rust/tokio/
---

## Big Picture

`tokio` is the dominant async runtime in Rust for networked services.

Use it for:

- high-concurrency IO servers/clients
- timers and async scheduling
- async channels/task orchestration

## Core Concepts

- async runtime (`#[tokio::main]`)
- tasks (`tokio::spawn`)
- cancellation (`select!`, drop handles, timeout)
- async sync primitives (`Mutex`, channels)

## Example: Concurrent Task Fan-Out

```rust
use tokio::task::JoinSet;

async fn fetch(id: u32) -> Result<String, &'static str> {
    Ok(format!("user-{id}"))
}

#[tokio::main]
async fn main() {
    let mut set = JoinSet::new();

    for id in 1..=5 {
        set.spawn(fetch(id));
    }

    while let Some(result) = set.join_next().await {
        match result {
            Ok(Ok(v)) => println!("ok {v}"),
            Ok(Err(e)) => println!("domain err {e}"),
            Err(e) => println!("task panic {e}"),
        }
    }
}
```

## Example: Timeout and Cancellation

```rust
use tokio::time::{sleep, timeout, Duration};

async fn slow_op() -> &'static str {
    sleep(Duration::from_secs(2)).await;
    "done"
}

#[tokio::main]
async fn main() {
    match timeout(Duration::from_millis(500), slow_op()).await {
        Ok(v) => println!("{v}"),
        Err(_) => println!("timed out"),
    }
}
```

## Tradeoffs

### Pros

- mature ecosystem and broad crate compatibility
- strong performance for IO-heavy services
- good tooling and docs

### Cons

- async architecture complexity (lifecycle, cancellation, backpressure)
- mixing blocking code causes latency spikes if unmanaged

## Edge Cases and Gotchas

1. Blocking work in async tasks:
   use `spawn_blocking` for CPU/blocking operations.
2. Unbounded channels:
   can cause memory pressure; prefer bounded channels.
3. Lost task errors:
   always inspect `JoinHandle` results or centralize task supervision.
4. Silent cancellation:
   document cancellation semantics at boundaries.

## Documentation Links

- Tokio docs: [docs.rs/tokio](https://docs.rs/tokio/latest/tokio/)
- Tokio tutorial: [tokio.rs/tokio/tutorial](https://tokio.rs/tokio/tutorial)
- `tokio::select!`: [docs.rs/tokio/latest/tokio/macro.select.html](https://docs.rs/tokio/latest/tokio/macro.select.html)

## Deep Dive Cookbook Additions

### Structured Concurrency Pattern

Use parent task scopes to own child task lifecycle:

- spawn children
- await completion or cancellation
- propagate error/cancel signals intentionally

### How-To: Graceful Shutdown with `select!`

```rust
use tokio::signal;
use tokio::sync::broadcast;

#[tokio::main]
async fn main() {
    let (shutdown_tx, _) = broadcast::channel::<()>(1);
    let mut shutdown_rx = shutdown_tx.subscribe();

    let worker = tokio::spawn(async move {
        loop {
            tokio::select! {
                _ = shutdown_rx.recv() => break,
                _ = tokio::time::sleep(std::time::Duration::from_millis(100)) => {}
            }
        }
    });

    let _ = signal::ctrl_c().await;
    let _ = shutdown_tx.send(());
    let _ = worker.await;
}
```

### Performance/Operations

1. Use bounded channels for backpressure.
2. Tag tasks with operation context in logs.
3. Keep `spawn_blocking` usage visible and measured.
4. Establish per-operation timeout budgets.

## Runtime Model (Novice-Friendly)

Tokio gives you cooperative multitasking:

- tasks run until they `.await`
- `.await` yields control so other tasks can run
- blocking CPU work without yielding can stall unrelated async tasks

Rule of thumb:

- IO-bound work -> async task
- CPU-heavy or blocking syscall -> `spawn_blocking` or dedicated worker pool

## Complete Example: Worker Pool with Bounded Queue

```rust
use std::sync::Arc;
use tokio::sync::{mpsc, Semaphore};
use tokio::time::{sleep, Duration};

#[derive(Debug)]
struct Job {
    id: u64,
    payload: String,
}

async fn process(job: Job) {
    // Simulate async IO work.
    sleep(Duration::from_millis(50)).await;
    println!("processed {} {}", job.id, job.payload);
}

#[tokio::main]
async fn main() {
    let (tx, mut rx) = mpsc::channel::<Job>(100);
    let concurrency_limit = Arc::new(Semaphore::new(4));

    let consumer = tokio::spawn({
        let concurrency_limit = Arc::clone(&concurrency_limit);
        async move {
            let mut workers = Vec::new();
            while let Some(job) = rx.recv().await {
                let permit = Arc::clone(&concurrency_limit).acquire_owned().await.unwrap();
                workers.push(tokio::spawn(async move {
                    process(job).await;
                    drop(permit);
                }));
            }

            for w in workers {
                let _ = w.await;
            }
        }
    });

    // Producer: bounded channel provides backpressure.
    for i in 0..50_u64 {
        tx.send(Job {
            id: i,
            payload: format!("event-{i}"),
        })
        .await
        .unwrap();
    }
    drop(tx);
    let _ = consumer.await;
}
```

## How-To: Cancellation Contract

Define cancellation behavior explicitly for each task category:

1. idempotent read task: safe to drop immediately
2. side-effecting write task: needs cleanup/compensation path
3. batch task: checkpoint progress to allow resume

Use `select!` and shutdown channels to make this behavior explicit in code.

## How-To: Protect Runtime from Blocking Code

```rust
use tokio::task;

async fn hash_large_file(path: &str) -> Result<String, tokio::task::JoinError> {
    let path = path.to_string();
    task::spawn_blocking(move || {
        // blocking file + cpu work here
        format!("digest-for-{path}")
    })
    .await
}
```

## Observability Checklist

1. attach request/job IDs to task logs
2. record queue depth and task wait time metrics
3. classify errors by timeout/cancel/domain/internal
4. track dropped/cancelled task counts in dashboards

## Common Pitfalls

1. Unbounded channels that silently accumulate memory.
2. Spawning detached tasks with no error supervision.
3. Using `Mutex` in async hot paths without considering contention.
4. Assuming timeout cancellation automatically rolls back external effects.
