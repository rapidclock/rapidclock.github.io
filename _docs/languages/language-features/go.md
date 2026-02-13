---
title: Go
description: Detailed Go language features, runtime model, and idiomatic patterns.
permalink: /languages/language-features/go/
---

## Big Picture

Go optimizes for simplicity, readability, fast builds, and production concurrency.

Core characteristics:

- lightweight goroutines and channels
- explicit error returns
- structural interfaces
- simple, predictable standard library

## 1. Packages and Modules

Go organizes code by packages and modules.

```go
package mathx

func Add(a, b int) int {
    return a + b
}
```

## 2. Structural Typing with Interfaces

Types satisfy interfaces implicitly by method set.

```go
package main

import "fmt"

type Speaker interface {
    Speak() string
}

type Dog struct{}

func (Dog) Speak() string { return "woof" }

func talk(s Speaker) {
    fmt.Println(s.Speak())
}
```

## 3. Composition over Inheritance (Embedding)

Go favors composition with struct embedding.

```go
package main

import "fmt"

type Logger struct{}

func (Logger) Log(msg string) {
    fmt.Println("log:", msg)
}

type Service struct {
    Logger
}
```

## 4. Error Returns and Wrapping

Idiomatic Go uses explicit error values.

```go
package main

import (
    "fmt"
    "strconv"
)

func parsePort(raw string) (int, error) {
    p, err := strconv.Atoi(raw)
    if err != nil {
        return 0, fmt.Errorf("invalid port: %w", err)
    }
    return p, nil
}
```

## 5. `defer`, `panic`, `recover`

Use `defer` for cleanup; reserve panic for truly exceptional programmer faults.

```go
package main

import "fmt"

func main() {
    defer fmt.Println("cleanup")
    fmt.Println("work")
}
```

## 6. Slices as Core Sequence Type

Slices are views over arrays with length/capacity semantics.

```go
package main

import "fmt"

func main() {
    s := []int{1, 2, 3}
    s = append(s, 4)
    fmt.Println(len(s), cap(s), s)
}
```

## 7. Maps and `comma ok`

Maps return zero value on missing key; use `comma ok` to test presence.

```go
m := map[string]int{"a": 1}
v, ok := m["b"]
fmt.Println(v, ok)
```

## 8. Goroutines and Channels

Concurrency is a language-level feature.

```go
package main

import "fmt"

func main() {
    ch := make(chan int)
    go func() {
        ch <- 42
    }()
    fmt.Println(<-ch)
}
```

## 9. `context` for cancellation and deadlines

Context is the standard mechanism for request-scoped cancellation.

```go
package main

import (
    "context"
    "fmt"
    "time"
)

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), time.Second)
    defer cancel()

    select {
    case <-time.After(2 * time.Second):
        fmt.Println("done")
    case <-ctx.Done():
        fmt.Println("cancelled", ctx.Err())
    }
}
```

## 10. Generics

Go generics support type parameters with interface constraints.

```go
package main

import "fmt"

type Number interface {
    ~int | ~int64 | ~float64
}

func Sum[T Number](xs []T) T {
    var out T
    for _, x := range xs {
        out += x
    }
    return out
}

func main() {
    fmt.Println(Sum([]int{1, 2, 3}))
}
```

## 11. Standard Tooling Culture

First-class tooling is part of language design:

- `go test`
- `go fmt`
- `go vet`
- race detector (`-race`)

## 12. Goroutine Design Patterns (Production Guide)

Goroutines are cheap, but not free.

Most production bugs come from lifecycle mistakes:

- no shutdown path
- no cancellation propagation
- no backpressure
- no error propagation contract

Use explicit patterns so the lifecycle is obvious to readers.

### Pattern 1: One-Shot Async Task + Done Channel

#### Basic Idea

Run one background task and wait for a completion signal.

#### Pros

- simple mental model
- minimal moving parts

#### Cons

- weak error/cancellation model unless added explicitly

#### When To Use

- short independent task where caller must wait for completion

#### Example

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    done := make(chan struct{})

    go func() {
        defer close(done)
        time.Sleep(100 * time.Millisecond)
        fmt.Println("background work complete")
    }()

    <-done
    fmt.Println("main exiting")
}
```

#### Gotchas

- Always signal completion on all code paths (`defer close(done)` helps).
- Avoid unbuffered "fire-and-forget" sends with no receiver.

### Pattern 2: Fan-Out + Join (`sync.WaitGroup`)

#### Basic Idea

Start multiple goroutines for independent work, then join all of them.

#### Pros

- easy parallelization of independent tasks
- no channel needed if no data return path

#### Cons

- no built-in cancellation or error aggregation

#### When To Use

- independent computations where all tasks should finish

#### Example

```go
package main

import (
    "fmt"
    "sync"
)

func main() {
    tasks := []int{2, 4, 6, 8}
    var wg sync.WaitGroup

    for _, n := range tasks {
        n := n // capture loop value
        wg.Add(1)
        go func() {
            defer wg.Done()
            fmt.Println(n * n)
        }()
    }

    wg.Wait()
}
```

#### Gotchas

- Capture loop variable (`n := n`) before launching goroutine.
- Call `Add` before starting the goroutine.

### Pattern 3: Worker Pool (Bounded Concurrency)

#### Basic Idea

Keep a fixed number of workers consuming jobs from a channel.

#### Pros

- bounded memory/CPU pressure
- natural backpressure via channel capacity

#### Cons

- more wiring than naive goroutine-per-job
- shutdown protocol must be explicit

#### When To Use

- many homogeneous jobs (I/O, parsing, ETL tasks)

#### Example

```go
package main

import (
    "fmt"
    "sync"
)

func worker(id int, jobs <-chan int, results chan<- int, wg *sync.WaitGroup) {
    defer wg.Done()
    for j := range jobs {
        results <- j * j
        fmt.Printf("worker %d processed %d\n", id, j)
    }
}

func main() {
    const workers = 3
    jobs := make(chan int, 8)
    results := make(chan int, 8)

    var wg sync.WaitGroup
    for i := 0; i < workers; i++ {
        wg.Add(1)
        go worker(i, jobs, results, &wg)
    }

    for j := 1; j <= 8; j++ {
        jobs <- j
    }
    close(jobs)

    go func() {
        wg.Wait()
        close(results)
    }()

    for r := range results {
        fmt.Println("result:", r)
    }
}
```

#### Gotchas

- Close job channel from producer side only.
- Do not close results channel from workers; close once all workers are done.

### Pattern 4: Pipeline Stages

#### Basic Idea

Compose stages where each stage reads from one channel and writes to another.

#### Pros

- clean stage separation
- streaming behavior (low memory)

#### Cons

- cancellation/early-stop logic must be deliberate

#### When To Use

- transform flows: read -> parse -> filter -> aggregate

#### Example

```go
package main

import "fmt"

func generate(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            out <- n
        }
    }()
    return out
}

func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            out <- n * n
        }
    }()
    return out
}

func main() {
    for n := range square(generate(1, 2, 3, 4)) {
        fmt.Println(n)
    }
}
```

#### Gotchas

- Every stage must close its outbound channel.
- If downstream stops early, upstream may block forever unless cancellation exists.

### Pattern 5: Fan-Out / Fan-In

#### Basic Idea

Fan-out: multiple workers consume from same input stream.  
Fan-in: merge multiple output channels into one.

#### Pros

- parallel processing with a single output consumer
- scalable throughput pattern

#### Cons

- merge logic introduces synchronization complexity

#### When To Use

- CPU-heavy transforms or slow I/O operations that parallelize well

#### Example

```go
package main

import (
    "fmt"
    "sync"
)

func worker(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            out <- n * 10
        }
    }()
    return out
}

func merge(cs ...<-chan int) <-chan int {
    var wg sync.WaitGroup
    out := make(chan int)

    output := func(c <-chan int) {
        defer wg.Done()
        for n := range c {
            out <- n
        }
    }

    wg.Add(len(cs))
    for _, c := range cs {
        go output(c)
    }

    go func() {
        wg.Wait()
        close(out)
    }()
    return out
}

func main() {
    in := make(chan int)
    go func() {
        defer close(in)
        for i := 1; i <= 6; i++ {
            in <- i
        }
    }()

    out := merge(worker(in), worker(in), worker(in))
    for n := range out {
        fmt.Println(n)
    }
}
```

#### Gotchas

- Multiple workers reading one input channel split work nondeterministically.
- Preserve ordering only if your design explicitly requires and enforces it.

### Pattern 6: Semaphore Channel (Concurrency Limit)

#### Basic Idea

Use a buffered channel as a token semaphore to cap concurrent goroutines.

#### Pros

- small, stdlib-only pattern
- easy to enforce global concurrency limits

#### Cons

- easy to forget token release
- no built-in cancellation semantics

#### When To Use

- limit outbound API calls, DB queries, or file processing concurrency

#### Example

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

func main() {
    items := []string{"a", "b", "c", "d", "e", "f"}
    sem := make(chan struct{}, 2) // at most 2 concurrent tasks
    var wg sync.WaitGroup

    for _, item := range items {
        item := item
        wg.Add(1)
        go func() {
            defer wg.Done()
            sem <- struct{}{}          // acquire
            defer func() { <-sem }()   // release

            time.Sleep(80 * time.Millisecond)
            fmt.Println("processed", item)
        }()
    }
    wg.Wait()
}
```

#### Gotchas

- Always release token in `defer` to avoid deadlocks on panic/error paths.
- Token channels control concurrency, not request cancellation.

### Pattern 7: Context-Aware Cancellation

#### Basic Idea

Goroutines should select on `ctx.Done()` so cancellation propagates quickly.

#### Pros

- prevents leaks
- standard cancellation contract across package boundaries

#### Cons

- requires explicit plumbing through APIs

#### When To Use

- request-scoped work in servers and CLIs

#### Example

```go
package main

import (
    "context"
    "fmt"
    "time"
)

func poll(ctx context.Context, out chan<- string) {
    ticker := time.NewTicker(40 * time.Millisecond)
    defer ticker.Stop()
    defer close(out)

    for {
        select {
        case <-ctx.Done():
            return
        case t := <-ticker.C:
            out <- t.Format("15:04:05.000")
        }
    }
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 150*time.Millisecond)
    defer cancel()

    out := make(chan string)
    go poll(ctx, out)

    for msg := range out {
        fmt.Println(msg)
    }
}
```

#### Gotchas

- Always call cancel function (`defer cancel()`) to release timers/resources.
- Long blocking operations must also support context to be cancellable.

### Pattern 8: Request/Response Goroutine (Actor-Style Loop)

#### Basic Idea

Own mutable state inside one goroutine and interact via messages.

#### Pros

- avoids mutex-heavy shared-memory design
- serial access makes state reasoning simpler

#### Cons

- potential throughput bottleneck on one mailbox
- protocol design needs care

#### When To Use

- stateful components (caches, counters, connection managers)

#### Example

```go
package main

import "fmt"

type incReq struct {
    delta int
    reply chan int
}

func counterLoop(reqs <-chan incReq) {
    total := 0
    for r := range reqs {
        total += r.delta
        r.reply <- total
    }
}

func main() {
    reqs := make(chan incReq)
    go counterLoop(reqs)

    reply := make(chan int)
    reqs <- incReq{delta: 3, reply: reply}
    fmt.Println(<-reply)
    reqs <- incReq{delta: 5, reply: reply}
    fmt.Println(<-reply)

    close(reqs)
}
```

#### Gotchas

- Define who closes channels; usually sender closes request channel.
- Consider buffered reply channels to avoid deadlock in complex protocols.

### Pattern 9: Error Propagation (Fail Fast)

#### Basic Idea

If one goroutine fails, cancel siblings and return first error.

#### Pros

- predictable failure semantics
- avoids background tasks running after request has already failed

#### Cons

- requires an explicit coordination layer

#### When To Use

- multi-step concurrent request handlers
- parallel I/O where one failure should abort all work

#### Example (stdlib-only sketch)

```go
package main

import (
    "context"
    "errors"
    "fmt"
    "sync"
)

func main() {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    errCh := make(chan error, 1)
    var wg sync.WaitGroup

    run := func(name string, fail bool) {
        defer wg.Done()
        select {
        case <-ctx.Done():
            return
        default:
        }

        if fail {
            select {
            case errCh <- errors.New(name + " failed"):
                cancel()
            default:
            }
            return
        }
        fmt.Println(name, "ok")
    }

    wg.Add(3)
    go run("task-a", false)
    go run("task-b", true)
    go run("task-c", false)

    wg.Wait()
    close(errCh)

    if err, ok := <-errCh; ok {
        fmt.Println("error:", err)
    }
}
```

#### Gotchas

- Buffered error channel of size 1 avoids deadlock on "first error wins."
- For production, `golang.org/x/sync/errgroup` is a strong standard choice.

## Edge Cases

1. Goroutine leaks:
   Unbounded goroutines waiting on never-read channels can exhaust memory.
2. Channel ownership confusion:
   Double-close or send-on-closed-channel panics are common lifecycle bugs.
3. Missing backpressure:
   Unlimited goroutine-per-job patterns can overwhelm CPU, memory, or external services.
4. Loop variable capture:
   Launching goroutines in loops without rebinding can process wrong values.
5. Nil map writes:
   Reading nil map is okay; writing panics.
6. Interface nil traps:
   Interface value with typed nil can be non-nil interface.
7. Slice aliasing:
   Two slices can share backing array, causing accidental cross-mutation.
8. Ignored errors:
   Skipping error checks hides operational failures.
9. Cancellation gaps:
   Goroutines that ignore `ctx.Done()` continue running after caller timeout.
10. No race testing:
   Concurrency code without `go test -race` misses real data races.
