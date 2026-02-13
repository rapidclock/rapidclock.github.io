---
title: Rabin-Karp
description: Hash-based pattern matching with rolling hash updates.
---

## Basic Explanation

Rabin-Karp compares hash values of the pattern and each text window.

- Compute pattern hash once.
- Slide a window and update hash in O(1) with a rolling formula.
- Verify exact characters on hash match to avoid false positives.

## Detailed Explanation

### Complexity

| Case | Time | Space |
| --- | --- | --- |
| Average | O(n + m) | O(1) |
| Worst (many collisions) | O(nm) | O(1) |

### Why Collisions Matter

Different strings can share a hash. Always verify the substring when hashes match.

## Pseudocode

```text
compute hash(pattern) and hash(first_window)
for each window i:
  if hashes equal and text[i:i+m] == pattern:
    report match
  roll window hash to i+1
```

## Edge Cases

1. Empty pattern:
   Commonly treated as matching all boundaries; code should define this behavior clearly.
2. Pattern longer than text:
   Immediate no-match return avoids unnecessary setup.
3. Hash collisions:
   Equal hash does not guarantee equal substring; always verify exact slice.
4. Negative rolling hash updates:
   Languages with signed modulo semantics need normalization (`+mod` or `rem_euclid`) after subtraction.
5. Poor hash parameters:
   Weak base/mod choices increase collision probability and degrade toward worst-case behavior.

## Full Examples

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
def rabin_karp(text: str, pattern: str) -> list[int]:
    n, m = len(text), len(pattern)
    if m == 0:
        return list(range(n + 1))
    if m > n:
        return []

    base = 256
    mod = 1_000_000_007

    high = pow(base, m - 1, mod)
    ph = 0
    wh = 0

    for i in range(m):
        ph = (ph * base + ord(pattern[i])) % mod
        wh = (wh * base + ord(text[i])) % mod

    out: list[int] = []
    for i in range(n - m + 1):
        if ph == wh and text[i:i + m] == pattern:
            out.append(i)
        if i < n - m:
            wh = (wh - ord(text[i]) * high) % mod
            wh = (wh * base + ord(text[i + m])) % mod

    return out

print(rabin_karp("abracadabra", "abra"))  # [0, 7]
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
fn rabin_karp(text: &str, pattern: &str) -> Vec<usize> {
    let t = text.as_bytes();
    let p = pattern.as_bytes();
    let n = t.len();
    let m = p.len();

    if m == 0 {
        return (0..=n).collect();
    }
    if m > n {
        return vec![];
    }

    let base: i64 = 256;
    let modu: i64 = 1_000_000_007;

    let mut high = 1i64;
    for _ in 0..(m - 1) {
        high = (high * base) % modu;
    }

    let (mut ph, mut wh) = (0i64, 0i64);
    for i in 0..m {
        ph = (ph * base + p[i] as i64) % modu;
        wh = (wh * base + t[i] as i64) % modu;
    }

    let mut out = Vec::new();
    for i in 0..=n - m {
        if ph == wh && &t[i..i + m] == p {
            out.push(i);
        }
        if i < n - m {
            wh = (wh - (t[i] as i64) * high).rem_euclid(modu);
            wh = (wh * base + t[i + m] as i64) % modu;
        }
    }

    out
}

fn main() {
    println!("{:?}", rabin_karp("abracadabra", "abra")); // [0, 7]
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

func rabinKarp(text, pattern string) []int {
    t := []byte(text)
    p := []byte(pattern)
    n, m := len(t), len(p)

    if m == 0 {
        out := make([]int, n+1)
        for i := range out {
            out[i] = i
        }
        return out
    }
    if m > n {
        return nil
    }

    const base int64 = 256
    const mod int64 = 1_000_000_007

    high := int64(1)
    for i := 0; i < m-1; i++ {
        high = (high * base) % mod
    }

    var ph, wh int64
    for i := 0; i < m; i++ {
        ph = (ph*base + int64(p[i])) % mod
        wh = (wh*base + int64(t[i])) % mod
    }

    out := []int{}
    for i := 0; i <= n-m; i++ {
        if ph == wh && string(t[i:i+m]) == pattern {
            out = append(out, i)
        }
        if i < n-m {
            wh = (wh - int64(t[i])*high) % mod
            if wh < 0 {
                wh += mod
            }
            wh = (wh*base + int64(t[i+m])) % mod
        }
    }

    return out
}

func main() {
    fmt.Println(rabinKarp("abracadabra", "abra")) // [0 7]
}
```

</div>
</div>
