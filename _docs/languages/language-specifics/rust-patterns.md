---
title: Rust
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

## Pattern 9: `Deref` / `DerefMut` For Wrapper Ergonomics

### Basic Idea

`Deref` lets your custom type behave like a reference to another type.

`DerefMut` does the same for mutable references.

This is the core trick behind smart pointers (`Box<T>`, `Rc<T>`, `Arc<T>`), and it is also useful for domain wrappers where you want:

- stronger type safety than raw primitives
- but API ergonomics close to the wrapped type

### Build The Mental Model Slowly

1. You create a wrapper type:
   `struct Username(String);`
2. By default, `Username` does not expose `String` methods directly.
3. If you implement `Deref<Target = str>`, then `&Username` can coerce to `&str` in many places.
4. If you also implement `DerefMut`, then `&mut Wrapper` can expose mutable methods of the target type.

The compiler performs these conversions automatically when method resolution or function parameter types require it. This is called deref coercion.

### Pros

- keeps domain-specific wrapper type (safety + readability)
- removes repetitive `.0` field access
- integrates naturally with existing APIs that take references

### Cons

- can hide behavior if used too broadly
- surprising conversions can make APIs harder to reason about

### When To Use

- smart-pointer-like types
- wrapper/newtype types where the target relationship is obvious
- ergonomic adapters where reference behavior is expected

### Example 1: Read-Only Deref Coercion

```rust
use std::ops::Deref;

#[derive(Debug, Clone)]
struct Username(String);

impl Username {
    fn new(raw: &str) -> Self {
        Self(raw.trim().to_ascii_lowercase())
    }
}

impl Deref for Username {
    type Target = str;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

fn greet(name: &str) {
    println!("hello, {name}");
}

fn main() {
    let user = Username::new("  Ada_Lovelace  ");

    // `&Username` coerces to `&str` because of Deref.
    greet(&user);

    // `str` methods are available through deref coercion.
    println!("length = {}", user.len());
    println!("starts_with_ada = {}", user.starts_with("ada"));
}
```

### Example 2: Mutable Wrapper With `DerefMut`

```rust
use std::ops::{Deref, DerefMut};

#[derive(Debug, Default)]
struct Scores(Vec<i32>);

impl Deref for Scores {
    type Target = [i32];

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl DerefMut for Scores {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}

fn main() {
    let mut scores = Scores(vec![30, 10, 20]);

    // Slice methods become available through DerefMut.
    scores.sort();
    scores.reverse();

    println!("{:?}", &*scores); // [30, 20, 10]
}
```

### Edge Cases

- `Deref` should be cheap and unsurprising. Avoid hidden allocation or I/O in `deref`.
- Use `Deref` only when there is a clear primary target type.
- Prefer explicit methods when conversion is not obvious to a reader.

## Pattern 10: `PhantomData` For Compile-Time Type Or Lifetime Meaning

### Basic Idea

`PhantomData<T>` tells the compiler:

- "this type logically acts like it contains `T`"
- even when no `T` value is stored at runtime

It is a zero-sized marker used to model:

- type-level tags
- lifetime relationships
- ownership/drop-check intent for generic designs

### Build The Mental Model Slowly

1. You have generic type parameter `T`, but no field uses `T`.
2. Without `PhantomData<T>`, the compiler treats `T` as unused.
3. Adding `_marker: PhantomData<T>` ties the generic parameter to the struct at compile time.
4. Runtime size usually does not change because `PhantomData` is zero-sized.

### Pros

- stronger compile-time guarantees without runtime cost
- prevents accidental mixing of logically different IDs or handles
- models lifetime relationships when only raw indices/pointers are stored

### Cons

- confusing at first because it has no runtime data
- advanced effects (variance, auto traits, drop checking) require care

### When To Use

- typed IDs and resource handles
- FFI wrappers and raw-pointer abstractions
- generic/lifetime APIs that need compile-time marker semantics

### Example 1: Typed IDs That Cannot Be Mixed

```rust
use std::marker::PhantomData;
use std::mem::size_of;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct UserTag;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct OrderTag;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Id<Tag> {
    raw: u64,
    _tag: PhantomData<Tag>,
}

impl<Tag> Id<Tag> {
    fn new(raw: u64) -> Self {
        Self {
            raw,
            _tag: PhantomData,
        }
    }

    fn raw(self) -> u64 {
        self.raw
    }
}

fn load_user(id: Id<UserTag>) {
    println!("loading user {}", id.raw());
}

fn main() {
    let user_id = Id::<UserTag>::new(7);
    let order_id = Id::<OrderTag>::new(7);

    load_user(user_id);
    // load_user(order_id); // does not compile: expected Id<UserTag>

    println!("size of Id<UserTag>: {}", size_of::<Id<UserTag>>());
    println!("size of u64: {}", size_of::<u64>());

    let _ = order_id;
}
```

### Example 2: Lifetime Marker Without Storing A Borrow

```rust
use std::marker::PhantomData;

#[derive(Debug)]
struct TokenRef<'a> {
    offset: usize,
    _borrow: PhantomData<&'a str>,
}

fn token_at<'a>(source: &'a str, offset: usize) -> TokenRef<'a> {
    assert!(offset <= source.len());
    TokenRef {
        offset,
        _borrow: PhantomData,
    }
}

fn main() {
    let src = "alpha beta gamma";
    let t = token_at(src, 6);
    println!("{:?}", t);
}
```

This second example stores only an index, but the lifetime marker says: this token is only valid in contexts tied to the source lifetime.

### Edge Cases

- `PhantomData<T>` can affect `Send`/`Sync` auto-trait behavior; that is often exactly what you want.
- Choose marker shape deliberately (`PhantomData<T>` vs `PhantomData<&'a T>`), because ownership meaning differs.
- If behavior seems surprising, check variance and drop-check assumptions explicitly.

## Pattern 11: `Pin` / `Unpin` For Values That Must Not Move

### Basic Idea

Rust normally allows values to move in memory (for example, when reassigned, pushed, or swapped).

Some designs break if a value moves after internal references are created, such as:

- self-referential structs
- many async state machines/futures during polling

`Pin<P>` is a wrapper that promises: the pointee will not be moved after pinning.

`Unpin` is the marker trait for types that are safe to move even when pinned. Most normal Rust types are `Unpin` by default.

### Build The Mental Model Slowly

1. A normal `T` may move.
2. `Pin<&mut T>` or `Pin<Box<T>>` introduces a "do not move this pointee" contract.
3. This contract only matters for `!Unpin` types.
4. You can make a type `!Unpin` using `PhantomPinned`.

### Pros

- enables safe APIs for address-sensitive types
- foundation for async `Future::poll` design
- expresses movement invariants in type signatures

### Cons

- conceptual overhead for beginners
- often requires careful `unsafe` in low-level implementations

### When To Use

- custom futures/async primitives
- self-referential or intrusive data structures
- libraries exposing pin-sensitive APIs

### Example 1: Why `Pin` Exists (Self-Reference)

```rust
use std::marker::PhantomPinned;
use std::pin::Pin;
use std::ptr::NonNull;

#[derive(Debug)]
struct SelfRef {
    value: String,
    ptr_to_value: Option<NonNull<String>>,
    _pin: PhantomPinned, // makes this type !Unpin
}

impl SelfRef {
    fn new(text: &str) -> Self {
        Self {
            value: text.to_string(),
            ptr_to_value: None,
            _pin: PhantomPinned,
        }
    }

    fn init(self: Pin<&mut Self>) {
        let ptr = NonNull::from(&self.as_ref().get_ref().value);
        // SAFETY: once pinned, `self` will not move, so this pointer remains valid.
        unsafe {
            self.get_unchecked_mut().ptr_to_value = Some(ptr);
        }
    }

    fn value_via_ptr(self: Pin<&Self>) -> &str {
        let this = self.get_ref();
        let ptr = this.ptr_to_value.expect("call init first");
        // SAFETY: pointer was captured after pinning and pointee has not moved.
        unsafe { ptr.as_ref().as_str() }
    }
}

fn main() {
    let mut item = Box::pin(SelfRef::new("pinned data"));
    item.as_mut().init();

    println!("{}", item.as_ref().value_via_ptr());

    // Moving out is forbidden for this pinned !Unpin type:
    // let moved = *item; // does not compile
}
```

### Example 2: API Shape You Will See In Futures

```rust
use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};

struct CountDown {
    left: u8,
}

impl Future for CountDown {
    type Output = &'static str;

    fn poll(mut self: Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<Self::Output> {
        if self.left == 0 {
            Poll::Ready("done")
        } else {
            self.left -= 1;
            Poll::Pending
        }
    }
}
```

This example is simple, but it shows the core API contract: polling a future takes `Pin<&mut Self>`, not plain `&mut Self`.

### Edge Cases

- `Pin` does not freeze inner fields automatically; field-level movement rules still matter.
- For `Unpin` types, pinning is usually not meaningful beyond API compatibility.
- Avoid `unsafe` pin projection unless you are sure about invariants; prefer safe helper crates/patterns in production libraries.

## Pattern 12: `Drop` For Deterministic Cleanup (RAII)

### Basic Idea

`Drop` is Rust's cleanup hook.

When a value goes out of scope, Rust automatically runs its `drop` logic.

This is the core of RAII (Resource Acquisition Is Initialization):

- acquire resource when value is created
- release resource automatically when value is dropped

### Build The Mental Model Slowly

1. Every value has an owner.
2. When owner goes out of scope, value is dropped.
3. If type implements `Drop`, Rust calls `drop(&mut self)` first.
4. Then fields are dropped automatically.
5. Cleanup runs even on early return (`?`) and most panic-unwind paths.

### Pros

- deterministic cleanup timing (scope-based)
- fewer leaks from forgotten cleanup calls
- composes naturally with error handling

### Cons

- drop timing is scope-driven, so large scopes can hold resources too long
- expensive or blocking cleanup in `drop` can hurt latency
- panic inside `drop` is dangerous

### When To Use

- file/socket/db connection wrappers
- temporary filesystem artifacts (temp files/dirs)
- lock-like and guard-like APIs
- metrics/tracing spans that must always close

### Example 1: Resource Guard With Automatic Cleanup

```rust
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug)]
struct TempFile {
    path: PathBuf,
}

impl TempFile {
    fn create(path: impl AsRef<Path>) -> std::io::Result<Self> {
        let path = path.as_ref().to_path_buf();
        fs::write(&path, b"temporary data")?;
        Ok(Self { path })
    }

    fn path(&self) -> &Path {
        &self.path
    }
}

impl Drop for TempFile {
    fn drop(&mut self) {
        // Best effort cleanup: never panic in Drop.
        let _ = fs::remove_file(&self.path);
    }
}

fn main() -> std::io::Result<()> {
    let tmp = TempFile::create("scratch.tmp")?;
    println!("created {:?}", tmp.path());

    // file is removed automatically when tmp goes out of scope
    Ok(())
}
```

### Example 2: Early Release With `std::mem::drop`

```rust
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

fn main() {
    let shared = Arc::new(Mutex::new(0));
    let worker_shared = Arc::clone(&shared);

    let handle = thread::spawn(move || {
        thread::sleep(Duration::from_millis(50));
        let mut g = worker_shared.lock().expect("poisoned");
        *g += 1;
    });

    {
        let mut guard = shared.lock().expect("poisoned");
        *guard += 10;

        // Explicitly release lock before doing slow work.
        drop(guard);
        thread::sleep(Duration::from_millis(100));
    }

    handle.join().expect("worker panic");
    println!("{}", *shared.lock().expect("poisoned"));
}
```

### Drop Order Gotcha (Important)

Within a struct, fields are dropped in declaration order (top to bottom).

If field A's drop logic depends on field B still being alive, declaration order matters.

Keep dependent resources ordered intentionally and document the invariant.

### Edge Cases

- Do not call `x.drop()` directly; use `drop(x)` for early release.
- Avoid panicking in `Drop`; panic during unwinding can abort the process.
- `Drop` is not guaranteed on `std::process::exit` or abrupt termination.
- Keep `drop` fast and non-blocking when possible.

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
| safe wrapper ergonomics over inner references | `Deref` / `DerefMut` |
| type-level marker without runtime payload | `PhantomData` |
| value must not move after setup/polling | `Pin` / `Unpin` |
| deterministic resource cleanup at scope end | `Drop` |

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
6. Overusing `Deref`:
   If conversion is surprising, prefer explicit methods over implicit coercion.
7. Mis-modeled marker types:
   Wrong `PhantomData` shape can accidentally change `Send`/`Sync` or lifetime semantics.
8. Pinning assumptions:
   `Pin` only protects pointee movement contracts; verify field-level invariants explicitly.
9. Drop behavior surprises:
   Overly large scopes, expensive drops, or panics in `Drop` can create production failures.

## Advanced Pattern Layer

## Pattern 13: Typestate For Compile-Time Workflow Safety

### Basic Idea

Model workflow phases as distinct types so invalid state transitions are impossible to compile.

### Pros

- illegal call order prevented at compile time
- clearer API contracts for multi-step builders/workflows

### Cons

- more generic/type boilerplate

### When To Use

- protocols with strict phase ordering
- connection/session setup sequences
- transaction lifecycle APIs

### Example

```rust
use std::marker::PhantomData;

struct New;
struct Connected;

struct Client<State> {
    endpoint: String,
    _state: PhantomData<State>,
}

impl Client<New> {
    fn new(endpoint: impl Into<String>) -> Self {
        Self { endpoint: endpoint.into(), _state: PhantomData }
    }

    fn connect(self) -> Client<Connected> {
        Client { endpoint: self.endpoint, _state: PhantomData }
    }
}

impl Client<Connected> {
    fn send(&self, payload: &str) {
        println!("send to {} => {}", self.endpoint, payload);
    }
}

fn main() {
    let connected = Client::<New>::new("tcp://example").connect();
    connected.send("hello");
}
```

### Edge Cases

- Keep typestate graph simple; too many states can harm readability.
- Provide ergonomic wrappers for common "happy path" flows.

## Pattern 14: Parsing Boundaries With `FromStr` / `TryFrom`

### Basic Idea

Move string-to-domain parsing into type implementations so call sites stay clean and validation remains centralized.

### Pros

- single source of truth for parse/validation logic
- integrates with idiomatic Rust conversion traits

### Cons

- conversion trait implementations require careful error design

### When To Use

- config parsing
- CLI/env boundary parsing
- external payload normalization

### Example

```rust
use std::str::FromStr;

#[derive(Debug)]
struct Port(u16);

#[derive(Debug)]
enum PortError {
    NotNumber,
    OutOfRange,
}

impl FromStr for Port {
    type Err = PortError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let n: u16 = s.parse().map_err(|_| PortError::NotNumber)?;
        if !(1..=65535).contains(&n) {
            return Err(PortError::OutOfRange);
        }
        Ok(Port(n))
    }
}
```

### Edge Cases

- Keep parse errors actionable; avoid generic `InvalidInput` everywhere.
- Separate wire-format errors from domain invariants when helpful.

## Pattern 15: `Cow<'a, str>` For Borrowed-Or-Owned Flexibility

### Basic Idea

Use `Cow` (clone-on-write) when function inputs may be borrowed most of the time but occasionally require owned transformed data.

### Pros

- avoids unnecessary allocation on common paths
- keeps API ergonomic for both borrowed and owned callers

### Cons

- can add conceptual overhead for newcomers

### When To Use

- normalization pipelines with conditional mutation
- formatting wrappers where many values pass through unchanged

### Example

```rust
use std::borrow::Cow;

fn normalize_label(input: &str) -> Cow<'_, str> {
    let trimmed = input.trim();
    if trimmed == input && !trimmed.contains(' ') {
        return Cow::Borrowed(input);
    }
    Cow::Owned(trimmed.replace(' ', "_"))
}

fn main() {
    let a = normalize_label("user_id");
    let b = normalize_label("  user id  ");
    println!("{} {}", a, b);
}
```

### Edge Cases

- Do not use `Cow` where ownership semantics are already clear and stable.
- Benchmark before introducing `Cow` in hot paths for micro-optimization reasons.

## Architecture Playbooks (Rust Specifics)

### Service Core

- domain types modeled via newtypes and enums
- error boundaries explicit with typed errors
- ownership model chosen first, synchronization second

### IO + CPU Hybrid

- borrowed input parsing into owned domain outputs
- async boundaries isolated from CPU-heavy transforms
- typed conversion traits at ingress points

### Library Crate API

- public API favors typed errors and stable trait contracts
- internal modules hide implementation details behind narrow interfaces
- avoid `anyhow` in core public library contracts unless intentionally opaque

## Testing and Verification Checklist

1. Add compile-time tests/examples for typestate transition correctness.
2. Test conversion trait failures (`FromStr`, `TryFrom`) with edge payloads.
3. Add property-style tests for parser invariants when possible.
4. Verify drop/cleanup behavior with explicit scope tests.
5. Run concurrency tests with lock ordering and cancellation scenarios.

## Rust-Specific Anti-Patterns and Fixes

1. Converting to opaque errors too early.
   Fix: keep typed domain errors until boundary layer.
2. Over-synchronizing shared state with broad mutex scope.
   Fix: narrow critical sections and prefer ownership/message passing.
3. Excessive cloning to satisfy borrow checker quickly.
   Fix: redesign ownership flow and borrow scopes.
4. Public APIs exposing overly concrete internal types.
   Fix: expose traits/newtypes and keep internals private.
5. Ignoring panic paths in drop/cleanup-heavy code.
   Fix: keep cleanup best-effort and panic-safe.

## Advanced Pattern Selection Guide

| Problem | Strong pattern |
| --- | --- |
| call order must be compile-time safe | typestate |
| robust string-to-domain conversion | `FromStr` / `TryFrom` parsing boundary |
| borrowed fast path with occasional owned transform | `Cow<'a, str>` |
| semantic safety over primitive types | newtype |
| deterministic cleanup and scope guards | `Drop` + RAII |
