---
title: Rust Specific Patterns
description: Idiomatic Rust patterns with ownership-aware design, tradeoffs, and production edge cases.
permalink: /languages/language-specifics/rust-patterns/
---

## Big Picture

Rust patterns are shaped by ownership, borrowing, and explicit error handling.

The strongest Rust code usually has:

- clear ownership boundaries
- small, explicit APIs
- compile-time guarantees that remove runtime classes of bugs

## Pattern 1: Newtype For Domain Safety

### Basic Idea

Wrap primitive types in tuple structs to encode domain meaning and prevent value mixups.

### Pros

- compile-time semantic safety
- clearer function signatures
- zero runtime overhead

### Cons

- additional type definitions
- occasional conversion friction

### When To Use

- IDs (`UserId`, `OrderId`)
- validated strings (`Email`, `ApiKey`)
- unit-safe numeric values

### Example

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
struct UserId(u64);

fn load_user(id: UserId) {
    println!("loading {:?}", id);
}

fn main() {
    let id = UserId(42);
    load_user(id);
}
```

### Edge Cases

- Implement required traits (`Display`, `FromStr`) to keep ergonomics high.
- Avoid exposing inner primitive directly unless necessary.

## Pattern 2: Builder For Complex Construction

### Basic Idea

Use a builder when struct initialization has many optional fields.

### Pros

- explicit configuration
- readable call sites
- avoids positional-argument mistakes

### Cons

- more code than direct struct literal
- can be overkill for small types

### When To Use

- request objects
- clients with many optional settings

### Example

```rust
#[derive(Debug)]
struct HttpConfig {
    timeout_ms: u64,
    retries: u8,
    user_agent: String,
}

struct HttpConfigBuilder {
    timeout_ms: u64,
    retries: u8,
    user_agent: String,
}

impl HttpConfigBuilder {
    fn new() -> Self {
        Self {
            timeout_ms: 1_000,
            retries: 2,
            user_agent: "cs-cookbook".to_string(),
        }
    }

    fn timeout_ms(mut self, timeout_ms: u64) -> Self {
        self.timeout_ms = timeout_ms;
        self
    }

    fn retries(mut self, retries: u8) -> Self {
        self.retries = retries;
        self
    }

    fn build(self) -> HttpConfig {
        HttpConfig {
            timeout_ms: self.timeout_ms,
            retries: self.retries,
            user_agent: self.user_agent,
        }
    }
}

fn main() {
    let cfg = HttpConfigBuilder::new().timeout_ms(2_500).retries(4).build();
    println!("{:?}", cfg);
}
```

### Edge Cases

- Validate cross-field invariants inside `build`.
- Return `Result<T, E>` from `build` if invalid combinations are possible.

## Pattern 3: Enum-Centered Error Modeling

### Basic Idea

Represent recoverable failures with explicit error enums.

### Pros

- compiler checks all known error variants
- clear user-facing behavior mapping
- works naturally with `?`

### Cons

- requires conversion wiring (`From`, `map_err`)

### When To Use

- libraries and core service domains
- boundaries where error semantics matter

### Example

```rust
use std::num::ParseIntError;

#[derive(Debug)]
enum PortError {
    Parse(ParseIntError),
    OutOfRange,
}

fn parse_port(raw: &str) -> Result<u16, PortError> {
    let p: u16 = raw.parse().map_err(PortError::Parse)?;
    if p == 0 {
        return Err(PortError::OutOfRange);
    }
    Ok(p)
}

fn main() {
    println!("{:?}", parse_port("8080"));
}
```

### Edge Cases

- Do not default to `String` errors in reusable crates; typed errors age better.
- Distinguish expected user errors from internal invariant violations.

## Pattern 4: Borrowed Inputs, Owned Outputs

### Basic Idea

Accept borrowed data (`&str`, `&[T]`) and return owned values when needed.

### Pros

- flexible callers
- less cloning
- clear ownership transfer points

### Cons

- lifetime signatures can initially feel complex

### When To Use

- parsing/transform functions
- utility libraries

### Example

```rust
fn normalize(input: &str) -> String {
    input.trim().to_ascii_lowercase()
}

fn main() {
    let raw = "  Ada Lovelace  ";
    println!("{}", normalize(raw));
}
```

### Edge Cases

- Avoid returning references to temporary values.
- Clone intentionally only at ownership boundaries.

## Pattern 5: Interior Mutability With `RefCell` (Single-Thread)

### Basic Idea

Use `RefCell<T>` for runtime-checked mutable borrows when compile-time borrowing is too strict.

### Pros

- enables patterns like shared mutable graph nodes in single-threaded code

### Cons

- borrow rule violations become runtime panics
- not thread-safe by itself

### When To Use

- complex in-memory structures on one thread

### Example

```rust
use std::cell::RefCell;
use std::rc::Rc;

fn main() {
    let v = Rc::new(RefCell::new(vec![1, 2, 3]));
    {
        let mut w = v.borrow_mut();
        w.push(4);
    }
    println!("{:?}", v.borrow());
}
```

### Edge Cases

- Keep mutable borrow scope minimal to avoid borrow panics.
- Prefer plain ownership/mut references first; use `RefCell` only when needed.

## Pattern 6: Shared Mutable State Across Threads (`Arc<Mutex<T>>`)

### Basic Idea

Use `Arc` for shared ownership and `Mutex` for synchronized mutation.

### Pros

- straightforward and explicit
- safe shared mutation in multi-threaded code

### Cons

- contention and lock overhead
- lock ordering mistakes can deadlock

### When To Use

- shared counters/state where message passing is not a natural fit

### Example

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let total = Arc::new(Mutex::new(0u64));
    let mut handles = Vec::new();

    for _ in 0..4 {
        let shared = Arc::clone(&total);
        handles.push(thread::spawn(move || {
            for _ in 0..10_000 {
                *shared.lock().expect("mutex poisoned") += 1;
            }
        }));
    }

    for h in handles {
        h.join().expect("thread panicked");
    }

    println!("{}", *total.lock().expect("mutex poisoned"));
}
```

### Edge Cases

- Never hold lock while doing slow I/O.
- Define and document lock acquisition order when multiple locks exist.

## Pattern 7: Generic Algorithms + Trait Bounds

### Basic Idea

Write algorithms over trait contracts, then specialize only if needed.

### Pros

- reusable abstractions
- compile-time optimization via monomorphization

### Cons

- compile times may grow with many instantiations
- trait bounds can become verbose

### When To Use

- reusable library code
- data-structure/algorithm crates

### Example

```rust
fn max_value<T: Ord + Copy>(values: &[T]) -> Option<T> {
    values.iter().copied().max()
}

fn main() {
    let nums = [3, 9, 1, 7];
    println!("{:?}", max_value(&nums));
}
```

### Edge Cases

- Prefer `impl Trait` in parameters for simple public APIs.
- Use trait objects (`dyn Trait`) when runtime polymorphism is required.

## Pattern 8: Iterator-First Data Processing

### Basic Idea

Model transformations as iterator pipelines before materializing collections.

### Pros

- efficient and expressive
- easy local reasoning about transform stages

### Cons

- very long chains can hurt readability

### When To Use

- filtering, mapping, aggregation tasks

### Example

```rust
fn main() {
    let nums = [1, 2, 3, 4, 5, 6];
    let out: Vec<i32> = nums
        .iter()
        .copied()
        .filter(|x| x % 2 == 0)
        .map(|x| x * x)
        .collect();

    println!("{:?}", out);
}
```

### Edge Cases

- Materialize once at boundary; avoid repeated `collect` calls in hot paths.
- Consider readability breakpoints using named helper iterators/functions.

## Pattern Selection Guide

| Problem | Recommended pattern |
| --- | --- |
| prevent primitive misuse | newtype |
| many optional config fields | builder |
| stable, explicit failure handling | error enum |
| ergonomic API boundaries | borrowed input, owned output |
| single-thread shared mutation | `Rc<RefCell<T>>` |
| multi-thread shared mutation | `Arc<Mutex<T>>` |
| reusable algorithms | generics + trait bounds |
| transformation pipelines | iterators |

## Global Edge Cases Checklist

1. Accidental clones:
   Cloning to satisfy borrow checker can hide ownership design issues.
2. `unwrap` in core paths:
   Panics are unacceptable for normal operational failures.
3. Mutex poisoning:
   Decide project policy for poisoned locks and recovery.
4. Deadlocks:
   Multiple lock acquisition without global order can freeze systems.
5. `unsafe` expansion:
   Keep unsafe blocks minimal and document invariants inline.
