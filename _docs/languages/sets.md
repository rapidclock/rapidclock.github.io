---
title: Sets
description: Fast membership, deduplication, and set algebra in Python, Rust, and Go.
---

## Mental Model

A set stores unique values only.

Common operations:

- membership test
- union
- intersection
- difference

## Create and Membership

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
s = {1, 2, 3}
s.add(4)

print(2 in s)   # True
print(10 in s)  # False
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use std::collections::HashSet;

fn main() {
    let mut s: HashSet<i32> = [1, 2, 3].into_iter().collect();
    s.insert(4);

    println!("{}", s.contains(&2));  // true
    println!("{}", s.contains(&10)); // false
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

func main() {
    s := map[int]struct{}{1: {}, 2: {}, 3: {}}
    s[4] = struct{}{}

    _, has2 := s[2]
    _, has10 := s[10]
    fmt.Println(has2, has10) // true false
}
```

</div>
</div>

## Union, Intersection, Difference

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
a = {1, 2, 3}
b = {3, 4, 5}

print(a | b)  # union
print(a & b)  # intersection
print(a - b)  # difference
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use std::collections::HashSet;

fn main() {
    let a: HashSet<i32> = [1, 2, 3].into_iter().collect();
    let b: HashSet<i32> = [3, 4, 5].into_iter().collect();

    let union: HashSet<_> = a.union(&b).copied().collect();
    let inter: HashSet<_> = a.intersection(&b).copied().collect();
    let diff: HashSet<_> = a.difference(&b).copied().collect();

    println!("{:?}", union);
    println!("{:?}", inter);
    println!("{:?}", diff);
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

func main() {
    a := map[int]struct{}{1: {}, 2: {}, 3: {}}
    b := map[int]struct{}{3: {}, 4: {}, 5: {}}

    union := map[int]struct{}{}
    for k := range a {
        union[k] = struct{}{}
    }
    for k := range b {
        union[k] = struct{}{}
    }

    inter := map[int]struct{}{}
    for k := range a {
        if _, ok := b[k]; ok {
            inter[k] = struct{}{}
        }
    }

    diff := map[int]struct{}{}
    for k := range a {
        if _, ok := b[k]; !ok {
            diff[k] = struct{}{}
        }
    }

    fmt.Println(union)
    fmt.Println(inter)
    fmt.Println(diff)
}
```

</div>
</div>

## Deduplication Pattern

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
items = ["a", "b", "a", "c", "b"]
seen: set[str] = set()
out: list[str] = []

for x in items:
    if x not in seen:
        seen.add(x)
        out.append(x)

print(out)  # ['a', 'b', 'c']
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use std::collections::HashSet;

fn main() {
    let items = vec!["a", "b", "a", "c", "b"];
    let mut seen = HashSet::new();
    let mut out = Vec::new();

    for x in items {
        if seen.insert(x) {
            out.push(x);
        }
    }

    println!("{:?}", out); // ["a", "b", "c"]
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

func main() {
    items := []string{"a", "b", "a", "c", "b"}
    seen := map[string]struct{}{}
    out := []string{}

    for _, x := range items {
        if _, ok := seen[x]; ok {
            continue
        }
        seen[x] = struct{}{}
        out = append(out, x)
    }

    fmt.Println(out) // [a b c]
}
```

</div>
</div>

## Subset/Superset Checks

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
a = {1, 2}
b = {1, 2, 3}

print(a.issubset(b))
print(b.issuperset(a))
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use std::collections::HashSet;

fn main() {
    let a: HashSet<i32> = [1, 2].into_iter().collect();
    let b: HashSet<i32> = [1, 2, 3].into_iter().collect();

    println!("{}", a.is_subset(&b));
    println!("{}", b.is_superset(&a));
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

func isSubset(a, b map[int]struct{}) bool {
    for x := range a {
        if _, ok := b[x]; !ok {
            return false
        }
    }
    return true
}

func main() {
    a := map[int]struct{}{1: {}, 2: {}}
    b := map[int]struct{}{1: {}, 2: {}, 3: {}}

    fmt.Println(isSubset(a, b))
}
```

</div>
</div>

## Complexity

| Operation | Average |
| --- | --- |
| Insert | O(1) |
| Membership check | O(1) |
| Delete | O(1) |
| Union/intersection/difference | O(len(a) + len(b)) |

## Advanced Cookbook Additions

### Pattern: Set Algebra for State Transitions

Sets are ideal for expressing changes between snapshots:

- `added = new - old`
- `removed = old - new`
- `unchanged = old & new`

This is common in sync engines, permissions diffing, and cache invalidation logic.

### How-To: Snapshot Diff

```python
def diff_snapshots(old_ids: set[int], new_ids: set[int]) -> dict[str, set[int]]:
    return {
        "added": new_ids - old_ids,
        "removed": old_ids - new_ids,
        "unchanged": old_ids & new_ids,
    }
```

### Pattern: Membership Guard Rails

Use sets to protect expensive operations:

1. build set of already-processed IDs
2. skip duplicate work early
3. keep side effects idempotent where possible

### Caveats

1. Sets are unordered; order-sensitive behavior needs additional structure.
2. Elements must be hashable and stable.
3. Very large sets can consume significant memory; consider compressed/bitmap alternatives when domain is dense and bounded.
4. Concurrent mutation of shared sets requires synchronization.
