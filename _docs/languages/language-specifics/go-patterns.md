---
title: Go Specific Patterns
description: Idiomatic Go patterns with practical tradeoffs, use cases, and production edge cases.
permalink: /languages/language-specifics/go-patterns/
---

## Big Picture

Go emphasizes simple constructs that compose well under production load.

Strong Go codebases tend to use a few consistent patterns repeatedly rather than deep abstraction layers.

## Pattern 1: Context-First API Boundaries

### Basic Idea

Put `context.Context` as the first parameter for operations that can block, time out, or be canceled.

### Pros

- standardized cancellation/deadline propagation
- request-scoped values where needed

### Cons

- misuse of context values can turn it into a hidden parameter bag

### When To Use

- network/database calls
- long-running background operations

### Example

```go
package main

import (
    "context"
    "fmt"
    "time"
)

func fetchUser(ctx context.Context, id int) (string, error) {
    select {
    case <-time.After(200 * time.Millisecond):
        return fmt.Sprintf("user-%d", id), nil
    case <-ctx.Done():
        return "", ctx.Err()
    }
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
    defer cancel()

    user, err := fetchUser(ctx, 7)
    fmt.Println(user, err)
}
```

### Edge Cases

- Always call cancel function (`defer cancel()`) to release resources.
- Do not store context in structs for long-term reuse.

## Pattern 2: Functional Options For Configurable Constructors

### Basic Idea

Avoid long constructor parameter lists by passing option functions.

### Pros

- readable call sites
- backward-compatible extension
- optional parameters without overloads

### Cons

- extra indirection in initialization path

### When To Use

- clients, servers, SDK wrappers with optional tuning knobs

### Example

```go
package main

import "fmt"

type Client struct {
    timeoutMs int
    retries   int
}

type Option func(*Client)

func WithTimeout(ms int) Option {
    return func(c *Client) { c.timeoutMs = ms }
}

func WithRetries(n int) Option {
    return func(c *Client) { c.retries = n }
}

func NewClient(opts ...Option) *Client {
    c := &Client{timeoutMs: 1000, retries: 2}
    for _, opt := range opts {
        opt(c)
    }
    return c
}

func main() {
    c := NewClient(WithTimeout(2500), WithRetries(4))
    fmt.Printf("%+v\n", c)
}
```

### Edge Cases

- Validate option values and return errors when invalid combinations exist.
- Keep option set coherent; avoid dozens of narrowly scoped options.

## Pattern 3: Consumer-Side Interfaces

### Basic Idea

Define small interfaces where they are consumed, not where implementations are produced.

### Pros

- less coupling
- easier testing with small fakes
- avoids large, generic interface anti-patterns

### Cons

- can create many local interfaces if done excessively

### When To Use

- service layers calling repositories/clients

### Example

```go
package main

import "fmt"

type UserStore interface {
    Exists(id int) bool
}

type MemoryStore struct {
    users map[int]struct{}
}

func (m MemoryStore) Exists(id int) bool {
    _, ok := m.users[id]
    return ok
}

func ensureUser(id int, store UserStore) error {
    if !store.Exists(id) {
        return fmt.Errorf("user %d not found", id)
    }
    return nil
}
```

### Edge Cases

- Keep interfaces minimal. One or two methods is often enough.
- Avoid naming everything `*er` unless it expresses real behavior.

## Pattern 4: Explicit Error Wrapping and Inspection

### Basic Idea

Return errors explicitly and wrap with `%w` so callers can inspect root cause.

### Pros

- transparent failure propagation
- preserves context chain

### Cons

- repetitive if helper boundaries are poorly designed

### When To Use

- all operations that can fail

### Example

```go
package main

import (
    "errors"
    "fmt"
    "strconv"
)

var ErrInvalidPort = errors.New("invalid port")

func parsePort(raw string) (int, error) {
    p, err := strconv.Atoi(raw)
    if err != nil {
        return 0, fmt.Errorf("parsePort: %w", ErrInvalidPort)
    }
    if p <= 0 || p > 65535 {
        return 0, fmt.Errorf("parsePort: %w", ErrInvalidPort)
    }
    return p, nil
}
```

### Edge Cases

- Preserve original error when available for diagnostics.
- Avoid string matching on errors; use sentinel errors or typed errors.

## Pattern 5: Worker Pool With Backpressure

### Basic Idea

Use buffered channels and a fixed worker count to control throughput.

### Pros

- bounded concurrency
- predictable resource usage
- natural pipeline architecture

### Cons

- requires careful channel lifecycle management

### When To Use

- batch processing
- background jobs
- fan-out/fan-in workflows

### Example

```go
package main

import (
    "fmt"
    "sync"
)

func worker(id int, jobs <-chan int, out chan<- int, wg *sync.WaitGroup) {
    defer wg.Done()
    for j := range jobs {
        out <- j * j
        fmt.Println("worker", id, "processed", j)
    }
}

func main() {
    jobs := make(chan int, 8)
    out := make(chan int, 8)

    var wg sync.WaitGroup
    for i := 0; i < 3; i++ {
        wg.Add(1)
        go worker(i, jobs, out, &wg)
    }

    for j := 1; j <= 6; j++ {
        jobs <- j
    }
    close(jobs)

    wg.Wait()
    close(out)

    for v := range out {
        fmt.Println("result", v)
    }
}
```

### Edge Cases

- Always close producer-owned channels.
- Do not close a channel from multiple goroutines.

## Pattern 6: Pipeline Cancellation With `select`

### Basic Idea

Every stage should listen for cancellation and terminate cleanly.

### Pros

- prevents goroutine leaks
- enables fast shutdown

### Cons

- more branching in pipeline code

### When To Use

- streaming pipelines
- continuously running workers

### Example

```go
package main

import (
    "context"
    "fmt"
    "time"
)

func producer(ctx context.Context, out chan<- int) {
    defer close(out)
    for i := 0; i < 10; i++ {
        select {
        case out <- i:
        case <-ctx.Done():
            return
        }
    }
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
    defer cancel()

    ch := make(chan int)
    go producer(ctx, ch)

    for v := range ch {
        fmt.Println(v)
        time.Sleep(20 * time.Millisecond)
    }
}
```

### Edge Cases

- If one stage exits early, ensure upstream/downstream can also exit.
- Drain or cancel to avoid blocked sends.

## Pattern 7: `sync.Once` For One-Time Initialization

### Basic Idea

Use `sync.Once` to guarantee exactly-once initialization in concurrent programs.

### Pros

- thread-safe lazy initialization
- simple semantics

### Cons

- difficult reset behavior in tests

### When To Use

- lazy loading config or expensive singleton resources

### Example

```go
package main

import (
    "fmt"
    "sync"
)

var (
    once sync.Once
    data map[string]string
)

func getData() map[string]string {
    once.Do(func() {
        data = map[string]string{"status": "ready"}
    })
    return data
}

func main() {
    fmt.Println(getData()["status"])
}
```

### Edge Cases

- `Once` closure should not panic; panic marks it as done in older runtime behavior assumptions and can confuse startup paths.
- For testability, consider explicit dependency injection instead of globals.

## Pattern 8: Table-Driven Tests

### Basic Idea

Represent test cases as data and loop through them.

### Pros

- concise
- easy to extend
- consistent naming and coverage

### Cons

- large tables can become hard to read without structure

### When To Use

- parsing and validation logic
- algorithmic function tests

### Example

```go
package calc

import "testing"

func Add(a, b int) int { return a + b }

func TestAdd(t *testing.T) {
    cases := []struct {
        name string
        a    int
        b    int
        want int
    }{
        {name: "positive", a: 2, b: 3, want: 5},
        {name: "with zero", a: 0, b: 7, want: 7},
        {name: "negative", a: -1, b: -2, want: -3},
    }

    for _, tc := range cases {
        t.Run(tc.name, func(t *testing.T) {
            got := Add(tc.a, tc.b)
            if got != tc.want {
                t.Fatalf("got %d want %d", got, tc.want)
            }
        })
    }
}
```

### Edge Cases

- When loop variable capture is involved in goroutine/subtest closures, bind explicitly in older Go codebases.
- Keep case names meaningful for quick failure triage.

## Pattern Selection Guide

| Problem | Recommended pattern |
| --- | --- |
| cancellation/deadline propagation | context-first APIs |
| constructor sprawl | functional options |
| loose coupling and testability | consumer-side interfaces |
| actionable failure flow | wrapped explicit errors |
| bounded parallel processing | worker pool |
| clean pipeline shutdown | select + context cancellation |
| one-time init in concurrent code | sync.Once |
| compact function verification | table-driven tests |

## Global Edge Cases Checklist

1. Goroutine leaks:
   Missing cancellation/close discipline can accumulate blocked goroutines.
2. Channel ownership confusion:
   Define exactly who sends, who receives, and who closes each channel.
3. Context misuse:
   Do not use context as a general parameter container.
4. Error swallowing:
   Ignoring errors hides operational problems.
5. Data races:
   Use `go test -race` regularly on concurrent paths.
