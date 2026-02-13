---
title: Rust Features
description: Detailed Rust language features, ownership model, and systems-level guarantees.
permalink: /languages/language-features/rust/
---

## Big Picture

Rust is designed for predictable performance and memory safety without garbage collection.

Core characteristics:

- ownership + borrowing enforced at compile time
- rich type system (enums, traits, generics)
- explicit error handling (`Result`/`Option`)
- fearless concurrency via type system constraints

## 1. Ownership

Each value has one owner. Values are dropped when owner goes out of scope.

```rust
fn main() {
    let s = String::from("hello");
    takes_ownership(s);
    // s is moved; cannot be used here.
}

fn takes_ownership(v: String) {
    println!("{}", v);
}
```

## 2. Borrowing and References

Borrowing allows access without ownership transfer.

```rust
fn len_of(s: &str) -> usize {
    s.len()
}

fn main() {
    let s = String::from("hello");
    println!("{}", len_of(&s));
}
```

## 3. Lifetimes

Lifetimes describe reference validity relationships.

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() >= y.len() { x } else { y }
}
```

## 4. Enums + Pattern Matching

Enums model closed sets of variants with data.

```rust
enum Event {
    Click { x: i32, y: i32 },
    Quit,
}

fn main() {
    let e = Event::Click { x: 1, y: 2 };
    match e {
        Event::Click { x, y } => println!("click {} {}", x, y),
        Event::Quit => println!("quit"),
    }
}
```

## 5. Traits and Generics

Traits define behavior contracts; generics enable reusable code.

```rust
trait Area {
    fn area(&self) -> f64;
}

struct Rect { w: f64, h: f64 }

impl Area for Rect {
    fn area(&self) -> f64 { self.w * self.h }
}

fn print_area<T: Area>(shape: &T) {
    println!("{}", shape.area());
}
```

## 6. Error Handling (`Result`, `Option`, `?`)

Rust prefers explicit recoverable error flow.

```rust
fn parse_port(raw: &str) -> Result<u16, String> {
    let p: u16 = raw.parse().map_err(|_| "invalid integer".to_string())?;
    if p == 0 { return Err("out of range".to_string()); }
    Ok(p)
}
```

## 7. Iterator Adapters

Iterators are lazy and composable.

```rust
fn main() {
    let nums = [1, 2, 3, 4, 5];
    let out: Vec<i32> = nums
        .iter()
        .copied()
        .filter(|x| x % 2 == 0)
        .map(|x| x * x)
        .collect();
    println!("{:?}", out);
}
```

## 8. Macros

Macros enable compile-time code generation patterns.

```rust
macro_rules! vec_of_strings {
    ($($x:expr),* $(,)?) => {
        vec![$($x.to_string()),*]
    };
}

fn main() {
    let v = vec_of_strings!("a", "b", "c");
    println!("{:?}", v);
}
```

## 9. Concurrency (`Send`, `Sync`, `Arc`, `Mutex`)

Type system blocks many data races before runtime.

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let n = Arc::new(Mutex::new(0));
    let n2 = Arc::clone(&n);
    let h = thread::spawn(move || {
        *n2.lock().expect("poisoned") += 1;
    });
    h.join().expect("thread panicked");
    println!("{}", *n.lock().expect("poisoned"));
}
```

## 10. Async/Await Ecosystem

Language supports async syntax; runtime is provided by ecosystem crates (e.g., Tokio).

```rust
// Example shape (requires runtime):
// async fn fetch() -> Result<String, reqwest::Error> { ... }
// let body = fetch().await?;
```

## 11. Unsafe Rust and FFI

Unsafe blocks allow low-level operations when compiler guarantees are insufficient.

```rust
fn main() {
    let x = 10;
    let p: *const i32 = &x;
    unsafe {
        println!("{}", *p);
    }
}
```

Use unsafe only with tight invariants and thorough tests.

## Edge Cases

1. Borrow checker conflicts:
   Usually indicate real aliasing/lifetime ambiguity that needs redesign.
2. `unwrap()` in production paths:
   Panics on error and can crash service logic.
3. Deadlocks with multiple mutexes:
   Lock ordering discipline is still required.
4. Unsafe contracts:
   Undefined behavior can leak in if invariants are violated.
5. Async + blocking calls:
   Blocking inside async tasks can starve executor threads.
