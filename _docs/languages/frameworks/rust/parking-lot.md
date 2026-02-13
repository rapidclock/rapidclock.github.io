---
title: parking_lot
description: High-performance synchronization primitives in Rust with pragmatic locking patterns.
permalink: /languages/frameworks/rust/parking-lot/
---

## Big Picture

`parking_lot` provides synchronization primitives (`Mutex`, `RwLock`, etc.) with lower overhead and richer APIs than stdlib equivalents in many workloads.

Use it when:

- lock contention is a measurable bottleneck
- you need advanced lock ergonomics
- you want predictable lock performance in hot paths

## Core Concepts

- `parking_lot::Mutex` / `RwLock`
- faster lock/unlock paths in many cases
- no poisoning semantics by default

## Example: Shared Counter

```rust
use parking_lot::Mutex;
use std::sync::Arc;
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0_u64));
    let mut handles = Vec::new();

    for _ in 0..4 {
        let shared = Arc::clone(&counter);
        handles.push(thread::spawn(move || {
            for _ in 0..100_000 {
                *shared.lock() += 1;
            }
        }));
    }

    for h in handles {
        h.join().unwrap();
    }

    println!("{}", *counter.lock());
}
```

## Example: Read-Mostly State with `RwLock`

```rust
use parking_lot::RwLock;
use std::sync::Arc;

#[derive(Default)]
struct Cache {
    values: Vec<i32>,
}

fn main() {
    let cache = Arc::new(RwLock::new(Cache { values: vec![1, 2, 3] }));

    {
        let read = cache.read();
        println!("len={}", read.values.len());
    }

    {
        let mut write = cache.write();
        write.values.push(4);
    }
}
```

## Tradeoffs

### Pros

- often faster lock primitives under contention
- ergonomic APIs
- broad ecosystem usage in performance-sensitive Rust services

### Cons

- extra dependency vs stdlib primitives
- no lock poisoning may hide some failure signals if your policy depends on it
- misuse patterns (lock scope too broad) still cause contention/deadlocks

## Edge Cases and Gotchas

1. Lock scope creep:
   keep critical sections short.
2. Nested locks:
   define and enforce lock ordering globally.
3. Read-to-write upgrade assumptions:
   design explicitly; avoid accidental deadlock scenarios.
4. Performance assumptions:
   benchmark real workload before/after replacing std locks.

## Documentation Links

- parking_lot docs: [docs.rs/parking_lot](https://docs.rs/parking_lot/latest/parking_lot/)
- Rust std `Mutex`: [doc.rust-lang.org/std/sync/struct.Mutex.html](https://doc.rust-lang.org/std/sync/struct.Mutex.html)
- Rust std `RwLock`: [doc.rust-lang.org/std/sync/struct.RwLock.html](https://doc.rust-lang.org/std/sync/struct.RwLock.html)

## Deep Dive Cookbook Additions

### Lock Design Strategy

- prefer ownership/message-passing first
- introduce locks when shared mutation is truly required
- shard locks when hot-key contention appears

### How-To: Sharded Counter Pattern

```rust
use parking_lot::Mutex;
use std::sync::Arc;

const SHARDS: usize = 16;

type Counters = Vec<Mutex<u64>>;

fn inc(c: &Arc<Counters>, key: usize) {
    let idx = key % SHARDS;
    *c[idx].lock() += 1;
}
```

### Debugging Contention

- sample lock hold durations in traces
- inspect queueing at high-percentile latency windows
- reduce critical section scope before trying lock replacement

## Locking Strategy (Beginner to Advanced)

Start simple:

1. single `Mutex` around shared mutable structure
2. profile contention and lock hold time
3. shard lock or refactor ownership only when data proves a bottleneck

Premature lock micro-optimization adds complexity without clear benefit.

## Complete Example: Sharded Map Counter

```rust
use parking_lot::Mutex;
use std::collections::hash_map::DefaultHasher;
use std::collections::HashMap;
use std::hash::{Hash, Hasher};
use std::sync::Arc;

const SHARDS: usize = 32;

type Shard = Mutex<HashMap<String, u64>>;

#[derive(Clone)]
struct CounterMap {
    shards: Arc<Vec<Shard>>,
}

impl CounterMap {
    fn new() -> Self {
        let mut shards = Vec::with_capacity(SHARDS);
        for _ in 0..SHARDS {
            shards.push(Mutex::new(HashMap::new()));
        }
        Self {
            shards: Arc::new(shards),
        }
    }

    fn shard_for(key: &str) -> usize {
        let mut hasher = DefaultHasher::new();
        key.hash(&mut hasher);
        (hasher.finish() as usize) % SHARDS
    }

    fn inc(&self, key: &str) {
        let idx = Self::shard_for(key);
        let mut shard = self.shards[idx].lock();
        *shard.entry(key.to_string()).or_insert(0) += 1;
    }

    fn get(&self, key: &str) -> u64 {
        let idx = Self::shard_for(key);
        let shard = self.shards[idx].lock();
        *shard.get(key).unwrap_or(&0)
    }
}
```

## How-To: Deadlock Avoidance Discipline

1. define global lock order (`A -> B -> C`) and document it
2. never acquire locks in opposite order across code paths
3. avoid calling external code while lock is held
4. keep critical sections as short as possible

## How-To: Read-Heavy Config with `RwLock`

- write lock only during config reload/update
- read lock for request-time lookup
- avoid expensive parsing while holding write lock

## Observability for Lock Contention

Track:

- time spent waiting for lock
- time spent holding lock
- number of lock acquisitions by code path

If p99 lock wait is high, reduce critical section work before changing lock primitive.

## Pitfalls

1. assuming `parking_lot` alone solves poor shared-state design
2. storing large unrelated state under one lock
3. calling blocking IO while lock guard is alive
4. swapping std locks to parking_lot without benchmark evidence
