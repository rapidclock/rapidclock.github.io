---
title: Functional Programming
description: Functional programming concepts that are practical and idiomatic in Python, Rust, and Go.
permalink: /languages/functional-programming/
---

## Big Picture

Functional programming (FP) is about how you model logic:

- prefer pure functions when possible
- treat data as values, not hidden mutable state
- compose small transformations into larger workflows

Python, Rust, and Go are not purely functional languages. That is good for production work.

The goal here is pragmatic FP:

- use FP ideas where they improve clarity and correctness
- avoid dogma where imperative code is simpler

## Concept Map

| Concept | Python | Rust | Go |
| --- | --- | --- | --- |
| pure functions | common and easy | common and compiler-friendly | common in small helpers |
| immutable data style | tuples, frozen dataclasses, copy/update | immutable by default, ownership checks | value-copy style + explicit clone/copy |
| map/filter/reduce | built-ins + comprehensions | iterators (`map`, `filter`, `fold`) | usually explicit loops |
| optional/failure as data | `None`, `Result`-like patterns | `Option`, `Result` | `(value, error)` |
| lazy pipelines | generators | lazy iterators | channels/goroutines or pull loops |
| algebraic-style modeling | `match` + tagged variants | enums + `match` (strongest) | interfaces + type switches |

## 1. Pure Functions

### What It Means

A pure function:

- depends only on its inputs
- has no side effects
- always returns the same output for the same input

Pure functions are easy to test and compose.

### Example

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
def discounted_total(subtotal: float, discount_pct: float) -> float:
    return round(subtotal * (1.0 - discount_pct), 2)


print(discounted_total(100.0, 0.15))  # 85.0
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
fn discounted_total(subtotal: f64, discount_pct: f64) -> f64 {
    (subtotal * (1.0 - discount_pct) * 100.0).round() / 100.0
}

fn main() {
    println!("{}", discounted_total(100.0, 0.15)); // 85.0
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "fmt"
    "math"
)

func discountedTotal(subtotal float64, discountPct float64) float64 {
    v := subtotal * (1.0 - discountPct)
    return math.Round(v*100) / 100
}

func main() {
    fmt.Println(discountedTotal(100.0, 0.15)) // 85
}
```

</div>
</div>

### Caveats

- Keep I/O at boundaries and keep core computation pure.
- Floating-point rounding is still a domain caveat; purity does not remove numeric precision issues.

## 2. Immutability-Oriented Updates

### What It Means

Instead of mutating shared objects in place, create updated values.

Benefits:

- fewer hidden side effects
- safer concurrent reasoning
- easier undo/replay behavior

### Example

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
from dataclasses import dataclass, replace


@dataclass(frozen=True)
class User:
    name: str
    quota: int


u1 = User(name="Ada", quota=10)
u2 = replace(u1, quota=u1.quota + 5)
print(u1, u2)  # original unchanged
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
#[derive(Debug, Clone)]
struct User {
    name: String,
    quota: u32,
}

fn main() {
    let u1 = User {
        name: "Ada".to_string(),
        quota: 10,
    };
    let u2 = User {
        quota: u1.quota + 5,
        ..u1.clone()
    };
    println!("{:?} {:?}", u1, u2);
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

type User struct {
    Name  string
    Quota int
}

func withQuota(u User, quota int) User {
    v := u
    v.Quota = quota
    return v
}

func main() {
    u1 := User{Name: "Ada", Quota: 10}
    u2 := withQuota(u1, u1.Quota+5)
    fmt.Println(u1, u2)
}
```

</div>
</div>

### Caveats

- Python and Go need discipline; immutability is not the default for all structures.
- In Go, maps and slices are reference-like; copying the header is not a deep copy.

## 3. First-Class and Higher-Order Functions

### What It Means

Functions can be passed to other functions, returned from functions, and stored in variables.

Higher-order functions (HOFs) take functions as input or return functions.

### Example

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
def apply_twice(fn, x):
    return fn(fn(x))


print(apply_twice(lambda n: n + 3, 10))  # 16
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
fn apply_twice<F>(f: F, x: i32) -> i32
where
    F: Fn(i32) -> i32,
{
    f(f(x))
}

fn main() {
    println!("{}", apply_twice(|n| n + 3, 10)); // 16
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

func applyTwice(fn func(int) int, x int) int {
    return fn(fn(x))
}

func main() {
    fmt.Println(applyTwice(func(n int) int { return n + 3 }, 10)) // 16
}
```

</div>
</div>

### Caveats

- Keep callback signatures simple; deeply nested function types reduce readability.
- In Rust, choose `Fn`, `FnMut`, or `FnOnce` intentionally.

## 4. Map, Filter, Fold (Reduce)

### What It Means

This is the core FP transform pattern:

1. map: transform values
2. filter: keep only matching values
3. fold/reduce: combine into one result

### Example

Compute sum of squares of even numbers.

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
nums = [1, 2, 3, 4, 5, 6]
answer = sum(x * x for x in nums if x % 2 == 0)
print(answer)  # 56
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
fn main() {
    let nums = [1, 2, 3, 4, 5, 6];
    let answer: i32 = nums
        .iter()
        .copied()
        .filter(|x| x % 2 == 0)
        .map(|x| x * x)
        .sum();
    println!("{}", answer); // 56
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

func main() {
    nums := []int{1, 2, 3, 4, 5, 6}
    sum := 0
    for _, x := range nums {
        if x%2 == 0 {
            sum += x * x
        }
    }
    fmt.Println(sum) // 56
}
```

</div>
</div>

### Caveats

- Python comprehensions are often clearer than nested `map`/`filter` calls.
- Go usually favors explicit loops over heavy functional helper layers.

## 5. Closures and Captured State

### What It Means

A closure is a function that captures values from its outer scope.

Closures can still be "functional style" when captured state is immutable.

### Example

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
def make_adder(delta: int):
    return lambda x: x + delta


add10 = make_adder(10)
print(add10(7))  # 17
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
fn make_adder(delta: i32) -> impl Fn(i32) -> i32 {
    move |x| x + delta
}

fn main() {
    let add10 = make_adder(10);
    println!("{}", add10(7)); // 17
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

func makeAdder(delta int) func(int) int {
    return func(x int) int {
        return x + delta
    }
}

func main() {
    add10 := makeAdder(10)
    fmt.Println(add10(7)) // 17
}
```

</div>
</div>

### Caveats

- Be careful with loop-variable capture in goroutines and closures in Go.
- In Rust, `move` captures by value; that is often the safest for async/concurrent use.

## 6. Function Composition and Pipelines

### What It Means

Compose small functions into larger ones:

- output of one becomes input of next

This helps you keep each function focused.

### Example

Normalize a username with `trim -> lowercase -> replace spaces`.

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
def trim(s: str) -> str:
    return s.strip()


def lower(s: str) -> str:
    return s.lower()


def slugify_spaces(s: str) -> str:
    return s.replace(" ", "-")


def compose(*funcs):
    def run(x):
        for f in funcs:
            x = f(x)
        return x
    return run


normalize = compose(trim, lower, slugify_spaces)
print(normalize("  Ada Lovelace  "))  # ada-lovelace
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
fn main() {
    let raw = "  Ada Lovelace  ";
    let normalized = raw
        .trim()
        .to_ascii_lowercase()
        .replace(' ', "-");
    println!("{}", normalized); // ada-lovelace
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "fmt"
    "strings"
)

func normalize(s string) string {
    s = strings.TrimSpace(s)
    s = strings.ToLower(s)
    s = strings.ReplaceAll(s, " ", "-")
    return s
}

func main() {
    fmt.Println(normalize("  Ada Lovelace  ")) // ada-lovelace
}
```

</div>
</div>

### Caveats

- Over-abstracted composition helpers can hide intent; explicit step-by-step code is often better in Go.
- Prefer readable pipelines over clever one-liners.

## 7. Modeling Absence and Failure as Values

### What It Means

FP style avoids hidden control flow for common error cases.

Represent absence/failure explicitly:

- Python: `None` or typed unions
- Rust: `Option<T>` / `Result<T, E>`
- Go: `(T, error)`

### Example

Parse a positive integer.

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
from typing import Optional


def parse_positive(raw: str) -> Optional[int]:
    try:
        v = int(raw)
    except ValueError:
        return None
    return v if v > 0 else None


print(parse_positive("42"))   # 42
print(parse_positive("-1"))   # None
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
fn parse_positive(raw: &str) -> Result<u32, &'static str> {
    let v: i32 = raw.parse().map_err(|_| "not an integer")?;
    if v <= 0 {
        return Err("must be positive");
    }
    Ok(v as u32)
}

fn main() {
    println!("{:?}", parse_positive("42"));
    println!("{:?}", parse_positive("-1"));
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "errors"
    "fmt"
    "strconv"
)

func parsePositive(raw string) (int, error) {
    v, err := strconv.Atoi(raw)
    if err != nil {
        return 0, err
    }
    if v <= 0 {
        return 0, errors.New("must be positive")
    }
    return v, nil
}

func main() {
    fmt.Println(parsePositive("42"))
    fmt.Println(parsePositive("-1"))
}
```

</div>
</div>

### Caveats

- Keep error values informative; "invalid input" everywhere is not enough in production.
- In Python, decide clearly when to return `None` vs raising exceptions.

## 8. Algebraic-Style Data Modeling and Pattern Matching

### What It Means

Represent a closed set of states/events, then handle each case explicitly.

This reduces invalid states and makes control flow clearer.

### Example

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
from dataclasses import dataclass
from typing import Union


@dataclass(frozen=True)
class Credit:
    amount: int


@dataclass(frozen=True)
class Debit:
    amount: int


Event = Union[Credit, Debit]


def apply(balance: int, event: Event) -> int:
    match event:
        case Credit(amount=a):
            return balance + a
        case Debit(amount=a):
            return balance - a


print(apply(100, Credit(25)))  # 125
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
enum Event {
    Credit(i32),
    Debit(i32),
}

fn apply(balance: i32, event: Event) -> i32 {
    match event {
        Event::Credit(a) => balance + a,
        Event::Debit(a) => balance - a,
    }
}

fn main() {
    println!("{}", apply(100, Event::Credit(25))); // 125
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

type Event interface {
    isEvent()
}

type Credit struct{ Amount int }
type Debit struct{ Amount int }

func (Credit) isEvent() {}
func (Debit) isEvent()  {}

func apply(balance int, event Event) int {
    switch e := event.(type) {
    case Credit:
        return balance + e.Amount
    case Debit:
        return balance - e.Amount
    default:
        panic("unknown event type")
    }
}

func main() {
    fmt.Println(apply(100, Credit{Amount: 25})) // 125
}
```

</div>
</div>

### Caveats

- Rust gives strongest compile-time exhaustiveness checks.
- In Go, type switches are open-world; define package boundaries carefully.

## 9. Laziness and Streaming

### What It Means

Lazy processing computes values only when needed.

This is useful for:

- large datasets
- streaming I/O
- avoiding intermediate allocations

### Example

Take first 3 even squares from a longer stream.

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
def numbers():
    i = 1
    while True:
        yield i
        i += 1


out = []
for x in numbers():
    if x % 2 == 0:
        out.append(x * x)
    if len(out) == 3:
        break

print(out)  # [4, 16, 36]
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
fn main() {
    let out: Vec<i32> = (1..)
        .filter(|x| x % 2 == 0)
        .map(|x| x * x)
        .take(3)
        .collect();

    println!("{:?}", out); // [4, 16, 36]
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

func main() {
    out := []int{}
    for i := 1; len(out) < 3; i++ {
        if i%2 == 0 {
            out = append(out, i*i)
        }
    }
    fmt.Println(out) // [4 16 36]
}
```

</div>
</div>

### Caveats

- Infinite generators/iterators must have explicit stop conditions.
- In Go, channel-based pipelines need cancellation paths to avoid goroutine leaks.

## 10. Recursion, Folds, and Pragmatism

### What It Means

Recursion is a functional tool, but in these languages, deep recursion is often less practical than iteration.

### Practical Guidance

- Python: recursion depth is limited; prefer loops for deep traversals.
- Rust: recursion is fine for moderate depth, but iterative solutions are often clearer for systems code.
- Go: no tail-call optimization; deep recursion can grow stacks significantly.

Use recursion where it matches the domain shape (tree traversals), not as a blanket rule.

## Functional Style Checklist

1. Keep side effects at boundaries (I/O, logging, network).
2. Use small pure functions for core business transforms.
3. Prefer explicit data flow over hidden mutable shared state.
4. Use language-idiomatic error/absence modeling (`Result`, `error`, `None`).
5. Prefer readability over clever functional abstraction.
