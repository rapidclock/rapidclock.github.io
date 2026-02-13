---
title: Basic Syntax Cheatsheet
description: Core language fundamentals for Python, Rust, and Go in one fast-reference page.
---

## What This Covers

This page is a dense fundamentals reference for day-to-day coding:

- program structure
- variables, constants, and types
- control flow
- functions and methods
- error handling
- composite data modeling
- modules/packages
- concurrency basics
- testing basics

For deeper topic-focused pages, continue with:

- [Arrays]({{ '/languages/arrays/' | relative_url }})
- [Dictionaries]({{ '/languages/dictionaries/' | relative_url }})
- [Sets]({{ '/languages/sets/' | relative_url }})
- [Open, Read & Write to A File]({{ '/languages/file-io/' | relative_url }})
- [TCP Streams]({{ '/languages/tcp-streams/' | relative_url }})
- [HTTP Client]({{ '/languages/http-client/' | relative_url }})

## Program Entry Point and Comments

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
# Single-line comment

def main() -> None:
    """Docstring-style comment for function purpose."""
    print("hello")

if __name__ == "__main__":
    main()
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
// Single-line comment

/// Rust doc comment for APIs.
fn main() {
    println!("hello");
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

// Single-line comment.
func main() {
    fmt.Println("hello")
}
```

</div>
</div>

## Variables, Constants, and Types

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
name: str = "Ada"
age: int = 20
pi: float = 3.14159
is_active: bool = True

# Python constants are a naming convention.
MAX_RETRIES = 3

# Dynamic typing: variable can be rebound.
value = 10
value = "ten"
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
fn main() {
    let name: &str = "Ada";
    let age: u32 = 20;
    let pi: f64 = 3.14159;
    let is_active: bool = true;

    const MAX_RETRIES: u8 = 3;

    // Immutable by default; mut enables reassignment.
    let mut counter = 0;
    counter += 1;

    println!("{} {} {} {} {}", name, age, pi, is_active, counter);
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

const MaxRetries int = 3

func main() {
    name := "Ada"       // inferred type string
    var age int = 20
    pi := 3.14159        // inferred float64
    isActive := true

    fmt.Println(name, age, pi, isActive, MaxRetries)
}
```

</div>
</div>

## String Formatting and Conversion

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
name = "Ada"
age = 20

message = f"{name} is {age}"
parsed = int("42")
serialized = str(42)

print(message, parsed, serialized)
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let name = "Ada";
    let age = 20;

    let message = format!("{} is {}", name, age);
    let parsed: i32 = "42".parse()?;
    let serialized = parsed.to_string();

    println!("{} {} {}", message, parsed, serialized);
    Ok(())
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "fmt"
    "strconv"
)

func main() {
    name := "Ada"
    age := 20

    message := fmt.Sprintf("%s is %d", name, age)
    parsed, _ := strconv.Atoi("42")
    serialized := strconv.Itoa(parsed)

    fmt.Println(message, parsed, serialized)
}
```

</div>
</div>

## Strings (Detailed Reference)

Strings are foundational in almost every program, so this section is intentionally dense.

### Mental Model and Immutability

- Python `str`, Rust `String`/`&str`, and Go `string` are immutable text values.
- "Modify string" operations create new strings.
- For frequent concatenation in loops, use builder-style patterns.

### Create, Length, Indexing, Slicing

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
s = "hello"
print(len(s))      # 5
print(s[0])        # 'h'
print(s[-1])       # 'o'
print(s[1:4])      # 'ell'
print(s[:3], s[3:])  # 'hel' 'lo'
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
fn main() {
    let s = "hello"; // &str
    println!("{}", s.len()); // byte length (ASCII here => 5)

    // Rust strings are UTF-8; direct indexing like s[0] is not allowed.
    // Use chars() for scalar values, or byte slices only on valid boundaries.
    let first = s.chars().next().unwrap_or('?');
    let sub = &s[1..4]; // valid because ASCII boundaries here
    println!("{} {}", first, sub); // h ell
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

func main() {
    s := "hello"
    fmt.Println(len(s)) // byte length (ASCII => 5)
    fmt.Printf("%c\n", s[0])
    fmt.Println(s[1:4]) // ell
}
```

</div>
</div>

### Unicode and "Character" Pitfalls

What beginners often miss:

- Python indexing is Unicode code-point based.
- Rust and Go string length is bytes, not "characters."
- In Go, use `[]rune` when you need code-point indexing.
- In Rust, iterate with `.chars()` for code-point-level logic.

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
s = "cafe\u0301"      # 'e' + combining accent
print(s, len(s))      # visually "café", length may surprise you
for ch in s:
    print(repr(ch))
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
fn main() {
    let s = "你好";
    println!("bytes = {}", s.len()); // 6 bytes in UTF-8
    println!("chars = {}", s.chars().count()); // 2 Unicode scalar values
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

func main() {
    s := "你好"
    fmt.Println("bytes =", len(s))      // 6
    fmt.Println("runes =", len([]rune(s))) // 2
}
```

</div>
</div>

### Search, Contains, Prefix, Suffix

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
s = "the quick brown fox"

print("quick" in s)            # contains
print(s.find("brown"))         # index or -1
print(s.startswith("the"))     # True
print(s.endswith("fox"))       # True
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
fn main() {
    let s = "the quick brown fox";
    println!("{}", s.contains("quick"));
    println!("{:?}", s.find("brown")); // Some(byte_index)
    println!("{}", s.starts_with("the"));
    println!("{}", s.ends_with("fox"));
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

func main() {
    s := "the quick brown fox"
    fmt.Println(strings.Contains(s, "quick"))
    fmt.Println(strings.Index(s, "brown"))
    fmt.Println(strings.HasPrefix(s, "the"))
    fmt.Println(strings.HasSuffix(s, "fox"))
}
```

</div>
</div>

### Split, Join, Replace, Trim, Case

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
raw = "  apple,banana,pear  "
parts = raw.strip().split(",")
joined = " | ".join(parts)
updated = joined.replace("pear", "orange")

print(parts)             # ['apple', 'banana', 'pear']
print(updated.upper())   # APPLE | BANANA | ORANGE
print(updated.lower())   # apple | banana | orange
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
fn main() {
    let raw = "  apple,banana,pear  ";
    let parts: Vec<&str> = raw.trim().split(',').collect();
    let joined = parts.join(" | ");
    let updated = joined.replace("pear", "orange");

    println!("{:?}", parts);
    println!("{}", updated.to_uppercase());
    println!("{}", updated.to_lowercase());
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

func main() {
    raw := "  apple,banana,pear  "
    parts := strings.Split(strings.TrimSpace(raw), ",")
    joined := strings.Join(parts, " | ")
    updated := strings.ReplaceAll(joined, "pear", "orange")

    fmt.Println(parts)
    fmt.Println(strings.ToUpper(updated))
    fmt.Println(strings.ToLower(updated))
}
```

</div>
</div>

### Iterate Over Text

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
s = "abc"
for i, ch in enumerate(s):
    print(i, ch)
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
fn main() {
    let s = "abc";
    for (i, ch) in s.chars().enumerate() {
        println!("{} {}", i, ch);
    }
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

func main() {
    s := "abc"
    for i, r := range s { // i is byte index, r is rune
        fmt.Println(i, string(r))
    }
}
```

</div>
</div>

### Efficient String Building (Many Concats)

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
parts = []
for i in range(5):
    parts.append(f"item-{i}")
result = ",".join(parts)
print(result)
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use std::fmt::Write;

fn main() {
    let mut out = String::new();
    for i in 0..5 {
        if i > 0 {
            out.push(',');
        }
        write!(&mut out, "item-{}", i).expect("write to string");
    }
    println!("{}", out);
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "fmt"
    "strconv"
    "strings"
)

func main() {
    var b strings.Builder
    for i := 0; i < 5; i++ {
        if i > 0 {
            b.WriteByte(',')
        }
        b.WriteString("item-")
        b.WriteString(strconv.Itoa(i))
    }
    fmt.Println(b.String())
}
```

</div>
</div>

### Basic Regex

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
import re

text = "Order IDs: A-100, B-250, C-999"
ids = re.findall(r"[A-Z]-\\d+", text)
print(ids)  # ['A-100', 'B-250', 'C-999']
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
// Cargo.toml: regex = "1"
use regex::Regex;

fn main() {
    let text = "Order IDs: A-100, B-250, C-999";
    let re = Regex::new(r"[A-Z]-\\d+").expect("valid regex");
    let ids: Vec<&str> = re.find_iter(text).map(|m| m.as_str()).collect();
    println!("{:?}", ids);
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "fmt"
    "regexp"
)

func main() {
    text := "Order IDs: A-100, B-250, C-999"
    re := regexp.MustCompile(`[A-Z]-\\d+`)
    ids := re.FindAllString(text, -1)
    fmt.Println(ids)
}
```

</div>
</div>

### String and Bytes (Encoding Boundaries)

Use bytes when:

- reading/writing network payloads
- parsing binary formats
- working with explicit encodings

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
s = "hello"
b = s.encode("utf-8")
print(b)                 # b'hello'
print(b.decode("utf-8")) # hello
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
fn main() {
    let s = String::from("hello");
    let bytes = s.as_bytes();
    println!("{:?}", bytes);
    let back = std::str::from_utf8(bytes).expect("valid utf-8");
    println!("{}", back);
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

func main() {
    s := "hello"
    b := []byte(s)
    fmt.Println(b)
    fmt.Println(string(b))
}
```

</div>
</div>

## Conditionals and Multi-Branch Logic

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
status = 503

if status == 200:
    result = "ok"
elif 500 <= status < 600:
    result = "server error"
else:
    result = "other"

print(result)
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
fn main() {
    let status = 503;

    let result = if status == 200 {
        "ok"
    } else if (500..600).contains(&status) {
        "server error"
    } else {
        "other"
    };

    println!("{}", result);
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

func main() {
    status := 503

    var result string
    switch {
    case status == 200:
        result = "ok"
    case status >= 500 && status < 600:
        result = "server error"
    default:
        result = "other"
    }

    fmt.Println(result)
}
```

</div>
</div>

## Loops and Iteration

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
nums = [10, 20, 30]

for i, v in enumerate(nums):
    print(i, v)

n = 3
while n > 0:
    print("tick", n)
    n -= 1
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
fn main() {
    let nums = [10, 20, 30];

    for (i, v) in nums.iter().enumerate() {
        println!("{} {}", i, v);
    }

    let mut n = 3;
    while n > 0 {
        println!("tick {}", n);
        n -= 1;
    }
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

func main() {
    nums := []int{10, 20, 30}

    for i, v := range nums {
        fmt.Println(i, v)
    }

    n := 3
    for n > 0 {
        fmt.Println("tick", n)
        n--
    }
}
```

</div>
</div>

## Functions, Methods, and Return Values

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
class Rectangle:
    def __init__(self, w: float, h: float) -> None:
        self.w = w
        self.h = h

    def area(self) -> float:
        return self.w * self.h


def clamp(x: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, x))

r = Rectangle(3, 4)
print(r.area(), clamp(12, 0, 10))
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
struct Rectangle {
    w: f64,
    h: f64,
}

impl Rectangle {
    fn area(&self) -> f64 {
        self.w * self.h
    }
}

fn clamp(x: i32, lo: i32, hi: i32) -> i32 {
    x.max(lo).min(hi)
}

fn main() {
    let r = Rectangle { w: 3.0, h: 4.0 };
    println!("{} {}", r.area(), clamp(12, 0, 10));
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

type Rectangle struct {
    W float64
    H float64
}

func (r Rectangle) Area() float64 {
    return r.W * r.H
}

func clamp(x, lo, hi int) int {
    if x < lo {
        return lo
    }
    if x > hi {
        return hi
    }
    return x
}

func main() {
    r := Rectangle{W: 3, H: 4}
    fmt.Println(r.Area(), clamp(12, 0, 10))
}
```

</div>
</div>

## Error Handling

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
def parse_port(raw: str) -> int:
    port = int(raw)
    if not (1 <= port <= 65535):
        raise ValueError("port out of range")
    return port

try:
    print(parse_port("8080"))
except ValueError as exc:
    print("error:", exc)
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
fn parse_port(raw: &str) -> Result<u16, String> {
    let port: u16 = raw.parse().map_err(|_| "invalid integer".to_string())?;
    if port == 0 {
        return Err("port out of range".to_string());
    }
    Ok(port)
}

fn main() {
    match parse_port("8080") {
        Ok(port) => println!("{}", port),
        Err(err) => eprintln!("error: {}", err),
    }
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

func parsePort(raw string) (int, error) {
    port, err := strconv.Atoi(raw)
    if err != nil {
        return 0, fmt.Errorf("invalid integer: %w", err)
    }
    if port < 1 || port > 65535 {
        return 0, errors.New("port out of range")
    }
    return port, nil
}

func main() {
    port, err := parsePort("8080")
    if err != nil {
        fmt.Println("error:", err)
        return
    }
    fmt.Println(port)
}
```

</div>
</div>

## Collections and Filtering/Mapping

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
nums = [1, 2, 3, 4, 5]

evens = [x for x in nums if x % 2 == 0]
squares = [x * x for x in nums]

print(evens)   # [2, 4]
print(squares) # [1, 4, 9, 16, 25]
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
fn main() {
    let nums = [1, 2, 3, 4, 5];

    let evens: Vec<i32> = nums.into_iter().filter(|x| x % 2 == 0).collect();
    let squares: Vec<i32> = nums.into_iter().map(|x| x * x).collect();

    println!("{:?}", evens);   // [2, 4]
    println!("{:?}", squares); // [1, 4, 9, 16, 25]
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

func main() {
    nums := []int{1, 2, 3, 4, 5}

    evens := []int{}
    squares := make([]int, 0, len(nums))

    for _, x := range nums {
        if x%2 == 0 {
            evens = append(evens, x)
        }
        squares = append(squares, x*x)
    }

    fmt.Println(evens)   // [2 4]
    fmt.Println(squares) // [1 4 9 16 25]
}
```

</div>
</div>

## Modules and Package Imports

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
# file: math_utils.py

def add(a: int, b: int) -> int:
    return a + b

# file: main.py
from math_utils import add

print(add(2, 3))
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
// file: src/math_utils.rs
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

// file: src/main.rs
mod math_utils;

fn main() {
    println!("{}", math_utils::add(2, 3));
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
// file: mathutils/mathutils.go
package mathutils

func Add(a, b int) int {
    return a + b
}

// file: main.go
package main

import (
    "fmt"
    "your-module/mathutils"
)

func main() {
    fmt.Println(mathutils.Add(2, 3))
}
```

</div>
</div>

## Concurrency Basics

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
import threading

counter = 0
lock = threading.Lock()

def worker() -> None:
    global counter
    for _ in range(10000):
        with lock:
            counter += 1

threads = [threading.Thread(target=worker) for _ in range(4)]
for t in threads:
    t.start()
for t in threads:
    t.join()

print(counter)  # 40000
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = Vec::new();

    for _ in 0..4 {
        let c = Arc::clone(&counter);
        handles.push(thread::spawn(move || {
            for _ in 0..10_000 {
                *c.lock().expect("mutex poisoned") += 1;
            }
        }));
    }

    for h in handles {
        h.join().expect("thread panicked");
    }

    println!("{}", *counter.lock().expect("mutex poisoned")); // 40000
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "fmt"
    "sync"
)

func main() {
    counter := 0
    var mu sync.Mutex
    var wg sync.WaitGroup

    for i := 0; i < 4; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for j := 0; j < 10000; j++ {
                mu.Lock()
                counter++
                mu.Unlock()
            }
        }()
    }

    wg.Wait()
    fmt.Println(counter) // 40000
}
```

</div>
</div>

## Testing Basics

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
# file: test_math_utils.py

def add(a: int, b: int) -> int:
    return a + b


def test_add() -> None:
    assert add(2, 3) == 5
```

Run with `pytest`.

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn add_works() {
        assert_eq!(add(2, 3), 5);
    }
}
```

Run with `cargo test`.

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
// file: mathutils_test.go
package mathutils

import "testing"

func Add(a, b int) int {
    return a + b
}

func TestAdd(t *testing.T) {
    if got := Add(2, 3); got != 5 {
        t.Fatalf("Add(2,3)=%d, want 5", got)
    }
}
```

Run with `go test ./...`.

</div>
</div>
