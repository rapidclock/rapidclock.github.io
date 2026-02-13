---
title: Dictionaries
description: Hash map patterns and practical key-value workflows in Python, Rust, and Go.
---

## Mental Model

Dictionary/map types store key-value pairs with hash-based lookup.

- Average O(1) insert/get/delete
- Worst-case can degrade with collisions
- Iteration order rules differ by language

## Create, Read, Update, Delete (CRUD)

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
counts: dict[str, int] = {"apple": 2}
counts["banana"] = 1
counts["apple"] = counts.get("apple", 0) + 1

print(counts["apple"])       # 3
print(counts.get("orange", 0))

removed = counts.pop("banana", None)
print(removed, counts)
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use std::collections::HashMap;

fn main() {
    let mut counts: HashMap<String, i32> = HashMap::new();
    counts.insert("apple".to_string(), 2);
    counts.insert("banana".to_string(), 1);

    *counts.entry("apple".to_string()).or_insert(0) += 1;

    println!("{}", counts.get("apple").copied().unwrap_or(0));
    println!("{}", counts.get("orange").copied().unwrap_or(0));

    let removed = counts.remove("banana");
    println!("{:?} {:?}", removed, counts);
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

func main() {
    counts := map[string]int{"apple": 2}
    counts["banana"] = 1
    counts["apple"] = counts["apple"] + 1

    fmt.Println(counts["apple"]) // 3

    // Comma-ok for existence check.
    if v, ok := counts["orange"]; ok {
        fmt.Println(v)
    } else {
        fmt.Println(0)
    }

    removed := counts["banana"]
    delete(counts, "banana")
    fmt.Println(removed, counts)
}
```

</div>
</div>

## Frequency Counting Pattern

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
text = "banana"
freq: dict[str, int] = {}

for ch in text:
    freq[ch] = freq.get(ch, 0) + 1

print(freq)  # {'b': 1, 'a': 3, 'n': 2}
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use std::collections::HashMap;

fn main() {
    let text = "banana";
    let mut freq: HashMap<char, i32> = HashMap::new();

    for ch in text.chars() {
        *freq.entry(ch).or_insert(0) += 1;
    }

    println!("{:?}", freq);
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

func main() {
    text := "banana"
    freq := map[rune]int{}

    for _, ch := range text {
        freq[ch]++
    }

    fmt.Println(freq)
}
```

</div>
</div>

## Iteration and Stable Ordering

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
d = {"c": 3, "a": 1, "b": 2}

# Python dict preserves insertion order.
for k, v in d.items():
    print(k, v)

# For sorted key order:
for k in sorted(d):
    print(k, d[k])
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use std::collections::{BTreeMap, HashMap};

fn main() {
    let mut hm = HashMap::new();
    hm.insert("c", 3);
    hm.insert("a", 1);
    hm.insert("b", 2);

    // HashMap iteration order is unspecified.
    for (k, v) in &hm {
        println!("{} {}", k, v);
    }

    // Use BTreeMap for sorted key order.
    let mut bt = BTreeMap::new();
    bt.insert("c", 3);
    bt.insert("a", 1);
    bt.insert("b", 2);
    for (k, v) in &bt {
        println!("{} {}", k, v);
    }
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "fmt"
    "sort"
)

func main() {
    m := map[string]int{"c": 3, "a": 1, "b": 2}

    // Map iteration order is randomized.
    for k, v := range m {
        fmt.Println(k, v)
    }

    // Sort keys for deterministic order.
    keys := make([]string, 0, len(m))
    for k := range m {
        keys = append(keys, k)
    }
    sort.Strings(keys)
    for _, k := range keys {
        fmt.Println(k, m[k])
    }
}
```

</div>
</div>

## Merge and Default Patterns

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
a = {"x": 1, "y": 2}
b = {"y": 99, "z": 3}

merged = a | b  # Python 3.9+, right side wins on key conflict
print(merged)   # {'x': 1, 'y': 99, 'z': 3}
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use std::collections::HashMap;

fn main() {
    let mut a = HashMap::from([("x", 1), ("y", 2)]);
    let b = HashMap::from([("y", 99), ("z", 3)]);

    // Values from b overwrite existing keys.
    for (k, v) in b {
        a.insert(k, v);
    }

    println!("{:?}", a);
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

func main() {
    a := map[string]int{"x": 1, "y": 2}
    b := map[string]int{"y": 99, "z": 3}

    for k, v := range b {
        a[k] = v // overwrite on conflict
    }

    fmt.Println(a)
}
```

</div>
</div>

## Complexity

| Operation | Average | Space |
| --- | --- | --- |
| Insert | O(1) | O(n) total table |
| Lookup | O(1) | O(1) extra |
| Delete | O(1) | O(1) extra |
| Iterate all pairs | O(n) | O(1) extra |

## Advanced Cookbook Additions

### Pattern: Dictionary as Aggregation Engine

Dictionaries/maps are often the safest default for aggregation tasks:

- frequency counting
- grouping by key
- last-seen index tracking
- dedup with metadata

### How-To: Group Records by Key

```python
from collections import defaultdict


def group_by_country(rows: list[dict]) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        key = row.get("country", "UNKNOWN")
        out[key].append(row)
    return dict(out)
```

### Pattern: Defensive Access at Boundaries

When parsing untrusted payloads, do not chain direct key access blindly (`obj["a"]["b"]["c"]`).

Use explicit validation or guarded access with clear error handling.

### Hash-Map Caveats

1. Key mutability must be controlled (`hash`/equality contract).
2. Iteration order guarantees differ by language/runtime version.
3. For large maps, memory overhead can dominate if values are tiny.
4. Concurrent writes require synchronization strategy.

### Performance Checklist

1. Reserve capacity when large map growth is expected.
2. Avoid repeated recomputation of expensive keys in hot loops.
3. Use integer/enum keys where practical for tighter memory/perf behavior.
