---
title: Detailed Concurrency
description: Concurrency primitives in Python, Rust, and Go with when-to-use guidance and idiomatic examples.
permalink: /languages/general/detailed-concurrency/
---

## Big Picture

Concurrency is about making progress on multiple units of work by interleaving execution.

For practical backend engineering, you need three lenses:

- **Execution unit**: thread, goroutine, async task
- **Coordination primitive**: mutex, channel/queue, condition variable, semaphore
- **Safety model**: runtime checks (Python), ownership + type system (Rust), discipline + tools (Go)

## Primitive Matrix

| Primitive | Python | Rust | Go | Typical use |
| --- | --- | --- | --- | --- |
| Thread | `threading.Thread` | `std::thread::spawn` | goroutine (`go f()`) | CPU or blocking parallel work |
| Mutex | `threading.Lock` | `std::sync::Mutex` | `sync.Mutex` | Protect shared mutable state |
| RwLock | custom / limited stdlib | `std::sync::RwLock` | `sync.RWMutex` | Many readers, few writers |
| CondVar | `threading.Condition` | `std::sync::Condvar` | `sync.Cond` | Wait for state transition |
| Semaphore | `threading.Semaphore` | `tokio::sync::Semaphore` (async) | buffered channel pattern | Limit concurrency |
| Channel / queue | `queue.Queue`, `asyncio.Queue` | `std::sync::mpsc`, `crossbeam`, `tokio::mpsc` | channels | Message passing |
| Atomics | limited stdlib patterns | `std::sync::atomic::*` | `sync/atomic` | lock-free counters/flags |
| Async runtime | `asyncio` | `tokio`/`async-std` | goroutines in runtime + nonblocking netpoll | high-concurrency I/O |

## 1. Threads and Tasks

### When to use

- Use threads/goroutines for blocking work and parallelism.
- Use async tasks when many I/O operations are mostly waiting.

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
import threading
import time


def worker(name: str) -> None:
    for i in range(3):
        print(name, i)
        time.sleep(0.1)


t1 = threading.Thread(target=worker, args=("A",))
t2 = threading.Thread(target=worker, args=("B",))
t1.start()
t2.start()
t1.join()
t2.join()
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use std::thread;
use std::time::Duration;

fn worker(name: &'static str) {
    for i in 0..3 {
        println!("{} {}", name, i);
        thread::sleep(Duration::from_millis(100));
    }
}

fn main() {
    let t1 = thread::spawn(|| worker("A"));
    let t2 = thread::spawn(|| worker("B"));
    t1.join().expect("thread A panicked");
    t2.join().expect("thread B panicked");
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

func worker(name string, wg *sync.WaitGroup) {
    defer wg.Done()
    for i := 0; i < 3; i++ {
        fmt.Println(name, i)
        time.Sleep(100 * time.Millisecond)
    }
}

func main() {
    var wg sync.WaitGroup
    wg.Add(2)
    go worker("A", &wg)
    go worker("B", &wg)
    wg.Wait()
}
```

</div>
</div>

## 2. Mutex (Mutual Exclusion)

### Why

A mutex protects a critical section so only one execution unit mutates shared state at a time.

### Common mistake

- Holding lock while doing slow I/O or network calls.

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
import threading

counter = 0
lock = threading.Lock()


def inc() -> None:
    global counter
    for _ in range(10000):
        with lock:
            counter += 1

threads = [threading.Thread(target=inc) for _ in range(4)]
for t in threads:
    t.start()
for t in threads:
    t.join()

print(counter)  # 40000
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = Vec::new();

    for _ in 0..4 {
        let c = Arc::clone(&counter);
        handles.push(thread::spawn(move || {
            for _ in 0..10_000 {
                *c.lock().expect("mutex poisoned") += 1;
            }
        }));
    }

    for h in handles {
        h.join().expect("thread panicked");
    }

    println!("{}", *counter.lock().expect("mutex poisoned"));
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "fmt"
    "sync"
)

func main() {
    var mu sync.Mutex
    counter := 0
    var wg sync.WaitGroup

    for i := 0; i < 4; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for j := 0; j < 10000; j++ {
                mu.Lock()
                counter++
                mu.Unlock()
            }
        }()
    }

    wg.Wait()
    fmt.Println(counter)
}
```

</div>
</div>

## 3. Read-Write Lock

### When to use

- Many readers, infrequent writers.
- Expensive to serialize all reads behind a plain mutex.

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
# Python stdlib has no direct RWLock. Use a proven library if needed,
# or redesign around queues/channels to avoid custom lock complexity.
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use std::sync::{Arc, RwLock};
use std::thread;

fn main() {
    let data = Arc::new(RwLock::new(vec![1, 2, 3]));
    let d1 = Arc::clone(&data);

    let reader = thread::spawn(move || {
        let r = d1.read().expect("rwlock poisoned");
        println!("len={} first={}", r.len(), r[0]);
    });

    {
        let mut w = data.write().expect("rwlock poisoned");
        w.push(4);
    }

    reader.join().expect("reader panicked");
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "fmt"
    "sync"
)

func main() {
    var rw sync.RWMutex
    nums := []int{1, 2, 3}

    rw.RLock()
    fmt.Println(len(nums), nums[0])
    rw.RUnlock()

    rw.Lock()
    nums = append(nums, 4)
    rw.Unlock()
}
```

</div>
</div>

## 4. Condition Variable

### Why

Use condition variables when a worker must wait for a state change rather than spin.

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
import threading

ready = False
cond = threading.Condition()


def waiter() -> None:
    global ready
    with cond:
        while not ready:
            cond.wait()
        print("ready received")


def notifier() -> None:
    global ready
    with cond:
        ready = True
        cond.notify_all()

threading.Thread(target=waiter).start()
threading.Thread(target=notifier).start()
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use std::sync::{Arc, Condvar, Mutex};
use std::thread;

fn main() {
    let pair = Arc::new((Mutex::new(false), Condvar::new()));
    let pair2 = Arc::clone(&pair);

    let waiter = thread::spawn(move || {
        let (lock, cv) = &*pair2;
        let mut ready = lock.lock().expect("mutex poisoned");
        while !*ready {
            ready = cv.wait(ready).expect("condvar wait failed");
        }
        println!("ready received");
    });

    {
        let (lock, cv) = &*pair;
        let mut ready = lock.lock().expect("mutex poisoned");
        *ready = true;
        cv.notify_all();
    }

    waiter.join().expect("waiter panicked");
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "fmt"
    "sync"
)

func main() {
    var mu sync.Mutex
    cond := sync.NewCond(&mu)
    ready := false

    go func() {
        mu.Lock()
        for !ready {
            cond.Wait()
        }
        mu.Unlock()
        fmt.Println("ready received")
    }()

    mu.Lock()
    ready = true
    cond.Broadcast()
    mu.Unlock()
}
```

</div>
</div>

## 5. Semaphores / Concurrency Limits

### Why

Semaphores bound the number of tasks in flight.

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
import threading
import time

sem = threading.Semaphore(2)


def task(i: int) -> None:
    with sem:
        print("start", i)
        time.sleep(0.2)
        print("done", i)

threads = [threading.Thread(target=task, args=(i,)) for i in range(5)]
for t in threads:
    t.start()
for t in threads:
    t.join()
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
// Async ecosystems typically provide semaphores (e.g., tokio::sync::Semaphore).
// In pure std sync code, a common alternative is worker-pool + channel.
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

func main() {
    sem := make(chan struct{}, 2)
    var wg sync.WaitGroup

    for i := 0; i < 5; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            sem <- struct{}{}
            fmt.Println("start", id)
            time.Sleep(200 * time.Millisecond)
            fmt.Println("done", id)
            <-sem
        }(i)
    }

    wg.Wait()
}
```

</div>
</div>

## 6. Message Passing (Queue/Channel)

### Why

Message passing reduces shared-state contention and makes ownership transfer explicit.

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
from queue import Queue
from threading import Thread

q: Queue[int] = Queue()


def producer() -> None:
    for x in [1, 2, 3]:
        q.put(x)
    q.put(-1)


def consumer() -> None:
    while True:
        v = q.get()
        if v == -1:
            break
        print("got", v)

Thread(target=producer).start()
Thread(target=consumer).start()
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel::<i32>();

    thread::spawn(move || {
        for x in [1, 2, 3] {
            tx.send(x).expect("send failed");
        }
    });

    for v in rx {
        println!("got {}", v);
    }
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

func main() {
    ch := make(chan int)

    go func() {
        for _, x := range []int{1, 2, 3} {
            ch <- x
        }
        close(ch)
    }()

    for v := range ch {
        fmt.Println("got", v)
    }
}
```

</div>
</div>

## 7. Async I/O and Cancellation

### Practical guidance

- Use async when tasks are mostly waiting (network, disk, RPC).
- Always include timeout + cancellation strategy.

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
import asyncio


async def io_task(name: str) -> str:
    await asyncio.sleep(0.2)
    return f"done {name}"


async def main() -> None:
    try:
        result = await asyncio.wait_for(io_task("A"), timeout=1.0)
        print(result)
    except asyncio.TimeoutError:
        print("timed out")


asyncio.run(main())
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
// Async runtime example (Tokio):
// - spawn async task
// - wrap with timeout
// See tokio::time::timeout in production async code.
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "context"
    "fmt"
    "time"
)

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
    defer cancel()

    select {
    case <-time.After(200 * time.Millisecond):
        fmt.Println("done")
    case <-ctx.Done():
        fmt.Println("timeout", ctx.Err())
    }
}
```

</div>
</div>

## 8. Atomics

### When to use

- Counters, flags, sequence numbers.
- Very small critical state where lock-free update is simple and safe.

Use atomics carefully; lock-free does not mean simpler.

## Pros

- High throughput under contention for narrow operations.
- Can avoid lock convoy in hotspots.

## Cons

- Harder correctness reasoning (memory ordering, visibility).
- Easy to introduce subtle race bugs.

## Edge Cases

1. Deadlock:
   Lock ordering inversion across goroutines/threads can halt progress.
2. Livelock/starvation:
   Tasks keep running but no useful progress; fair scheduling and backoff strategies matter.
3. Lost wakeups:
   Condition variable waits must loop on predicate checks, never assume one notify implies readiness.
4. Goroutine/thread leaks:
   Missing cancellation or channel close can leave workers blocked forever.
5. Mixed primitives without protocol:
   Combining mutex + channels + atomics without clear ownership contracts often causes heisenbugs.

## Recommended Strategy

1. Prefer message passing for independent work units.
2. Use mutexes for simple shared-state invariants.
3. Introduce condition variables/semaphores only when clearly needed.
4. Add explicit cancellation and timeouts for all external I/O workflows.
5. Write stress tests with high concurrency and deterministic assertions.
