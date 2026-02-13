---
title: Go Features
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

## Edge Cases

1. Goroutine leaks:
   Unbounded goroutines waiting on never-read channels can exhaust memory.
2. Nil map writes:
   Reading nil map is okay; writing panics.
3. Interface nil traps:
   Interface value with typed nil can be non-nil interface.
4. Slice aliasing:
   Two slices can share backing array, causing accidental cross-mutation.
5. Ignored errors:
   Skipping error checks hides operational failures.
