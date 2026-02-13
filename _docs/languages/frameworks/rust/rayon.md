---
title: Rayon
description: Data-parallel execution in Rust with work-stealing parallel iterators.
permalink: /languages/frameworks/rust/rayon/
---

## Big Picture

`rayon` makes CPU-parallel workloads ergonomic by extending iterators to run in parallel.

Use it for:

- CPU-heavy batch transforms
- map/filter/reduce over large collections
- parallel sorting and analytics

## Core Concepts

- `par_iter()` / `into_par_iter()`
- `map`, `filter`, `reduce`, `sum` in parallel
- work-stealing scheduler

## Example: Parallel Sum of Squares

```rust
use rayon::prelude::*;

fn main() {
    let nums: Vec<i64> = (1..=5_000_000).collect();
    let total: i64 = nums
        .par_iter()
        .map(|x| x * x)
        .sum();

    println!("{}", total);
}
```

## Example: Parallel Grouped Processing Sketch

```rust
use rayon::prelude::*;
use std::collections::HashMap;

fn main() {
    let words = vec!["ada", "alan", "grace", "guido", "linus"];

    let counts = words
        .par_iter()
        .fold(
            HashMap::<char, usize>::new,
            |mut acc, w| {
                let c = w.chars().next().unwrap();
                *acc.entry(c).or_insert(0) += 1;
                acc
            },
        )
        .reduce(
            HashMap::<char, usize>::new,
            |mut a, b| {
                for (k, v) in b {
                    *a.entry(k).or_insert(0) += v;
                }
                a
            },
        );

    println!("{:?}", counts);
}
```

## Tradeoffs

### Pros

- easy parallelization of iterator workflows
- good scaling for CPU-bound tasks
- minimal synchronization boilerplate

### Cons

- overhead can outweigh gains on small inputs
- not suitable for IO-bound async tasks (Tokio fits those better)
- shared mutable state still needs careful design

## Edge Cases and Gotchas

1. Tiny collections:
   parallel overhead may be slower than sequential iterators.
2. Side effects in parallel closures:
   avoid shared mutation unless synchronized correctly.
3. Non-associative reductions:
   floating-point reductions may differ slightly across run order.
4. CPU saturation:
   coordinate with other thread pools to avoid oversubscription.

## Documentation Links

- Rayon docs: [docs.rs/rayon](https://docs.rs/rayon/latest/rayon/)
- Parallel iterators: [docs.rs/rayon/latest/rayon/iter](https://docs.rs/rayon/latest/rayon/iter/index.html)
- Rust std iterators (for comparison): [doc.rust-lang.org/std/iter](https://doc.rust-lang.org/std/iter/)

## Deep Dive Cookbook Additions

### Workload Fit Checklist

Use Rayon when:

- per-item work is CPU-heavy enough to amortize scheduling overhead
- work units are independent or reduction is associative
- memory bandwidth is not the dominant bottleneck

### How-To: Parallel Sort + Transform

```rust
use rayon::prelude::*;

fn main() {
    let mut values: Vec<i64> = (0..2_000_000).rev().collect();
    values.par_sort_unstable();

    let out: Vec<i64> = values
        .par_iter()
        .map(|x| x * 2)
        .collect();

    println!("{} {}", out[0], out[out.len() - 1]);
}
```

### Operational Guidance

1. Benchmark sequential baseline first.
2. Tune data chunking when custom splits are needed.
3. Avoid hidden shared mutable state inside closures.

## Choosing Parallel Granularity

Rayon works best when each task has enough CPU work to amortize scheduling overhead.

Guideline:

- tiny operations on tiny vectors: keep sequential
- medium/large independent operations: parallel iterators shine
- extremely uneven work distribution: consider custom chunking

## Complete Example: Parallel File Hash Pipeline

```rust
use rayon::prelude::*;
use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::io;
use std::path::PathBuf;

fn hash_file(path: &PathBuf) -> io::Result<u64> {
    let bytes = fs::read(path)?;
    let mut hasher = DefaultHasher::new();
    bytes.hash(&mut hasher);
    Ok(hasher.finish())
}

fn hash_many(paths: &[PathBuf]) -> Vec<io::Result<u64>> {
    paths.par_iter().map(hash_file).collect()
}
```

This pattern parallelizes independent CPU-heavy work units safely.

## How-To: Custom Thread Pool for Isolation

```rust
use rayon::ThreadPoolBuilder;

fn run_isolated_pool() {
    let pool = ThreadPoolBuilder::new().num_threads(4).build().unwrap();
    pool.install(|| {
        let sum: i64 = (0..1_000_000_i64).into_par_iter().sum();
        println!("{}", sum);
    });
}
```

Custom pools are useful when sharing a machine with other latency-sensitive workloads.

## Reduction Correctness Notes

For reductions, operation should be associative (and ideally commutative). If not, parallel execution may produce different results compared with sequential order.

Examples:

- integer sum: usually safe
- floating-point sum: order-dependent rounding differences
- string concatenation with ordering expectations: not safe without explicit ordering strategy

## Performance Tuning Checklist

1. benchmark sequential vs parallel for realistic input sizes
2. avoid shared mutable state inside `par_iter` closures
3. reduce temporary allocations in per-item closures
4. inspect CPU utilization and memory bandwidth saturation
5. cap threads when co-running other thread pools

## Common Pitfalls

1. parallelizing IO-bound work (Tokio or async IO often better)
2. parallelizing too-small datasets where overhead dominates
3. assuming deterministic element processing order
4. hiding panics in parallel tasks without structured error handling
