---
title: Open, Read & Write to A File
description: Practical text and binary file I/O with safe defaults and streaming patterns.
---

## Core Rules

- Always use explicit encoding for text (`utf-8`).
- Prefer context-managed file handling so files are closed automatically.
- Use streaming for large files to avoid loading everything into memory.

## Read Entire Text File

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
from pathlib import Path

text = Path("notes.txt").read_text(encoding="utf-8")
print(text)
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use std::fs;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let text = fs::read_to_string("notes.txt")?;
    println!("{}", text);
    Ok(())
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "fmt"
    "os"
)

func main() {
    b, err := os.ReadFile("notes.txt")
    if err != nil {
        panic(err)
    }
    fmt.Println(string(b))
}
```

</div>
</div>

## Write (Overwrite) and Append

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
from pathlib import Path

Path("output.txt").write_text("hello\n", encoding="utf-8")

with open("output.txt", "a", encoding="utf-8") as f:
    f.write("next line\n")
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use std::fs::{self, OpenOptions};
use std::io::Write;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    fs::write("output.txt", "hello\n")?; // overwrite

    let mut file = OpenOptions::new().create(true).append(true).open("output.txt")?;
    file.write_all(b"next line\n")?;
    Ok(())
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "os"

func main() {
    if err := os.WriteFile("output.txt", []byte("hello\n"), 0o644); err != nil {
        panic(err)
    }

    f, err := os.OpenFile("output.txt", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
    if err != nil {
        panic(err)
    }
    defer f.Close()

    if _, err := f.WriteString("next line\n"); err != nil {
        panic(err)
    }
}
```

</div>
</div>

## Stream Large Files Line by Line

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
with open("large.log", "r", encoding="utf-8") as f:
    for line_no, line in enumerate(f, start=1):
        if "ERROR" in line:
            print(line_no, line.strip())
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use std::fs::File;
use std::io::{BufRead, BufReader};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let file = File::open("large.log")?;
    let reader = BufReader::new(file);

    for (idx, line) in reader.lines().enumerate() {
        let line = line?;
        if line.contains("ERROR") {
            println!("{} {}", idx + 1, line);
        }
    }
    Ok(())
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "bufio"
    "fmt"
    "os"
    "strings"
)

func main() {
    f, err := os.Open("large.log")
    if err != nil {
        panic(err)
    }
    defer f.Close()

    scanner := bufio.NewScanner(f)
    lineNo := 0
    for scanner.Scan() {
        lineNo++
        line := scanner.Text()
        if strings.Contains(line, "ERROR") {
            fmt.Println(lineNo, line)
        }
    }
    if err := scanner.Err(); err != nil {
        panic(err)
    }
}
```

</div>
</div>

## Binary I/O

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
payload = bytes([0x01, 0x02, 0x03, 0xFF])

with open("blob.bin", "wb") as f:
    f.write(payload)

with open("blob.bin", "rb") as f:
    data = f.read()

print(data)
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use std::fs;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let payload = vec![0x01u8, 0x02, 0x03, 0xFF];
    fs::write("blob.bin", &payload)?;

    let data = fs::read("blob.bin")?;
    println!("{:?}", data);
    Ok(())
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "fmt"
    "os"
)

func main() {
    payload := []byte{0x01, 0x02, 0x03, 0xFF}
    if err := os.WriteFile("blob.bin", payload, 0o644); err != nil {
        panic(err)
    }

    data, err := os.ReadFile("blob.bin")
    if err != nil {
        panic(err)
    }

    fmt.Println(data)
}
```

</div>
</div>

## Path Handling

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
from pathlib import Path

p = Path("data") / "2026" / "report.txt"
p.parent.mkdir(parents=True, exist_ok=True)
p.write_text("ok\n", encoding="utf-8")
print(p.resolve())
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use std::fs;
use std::path::PathBuf;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut p = PathBuf::from("data");
    p.push("2026");
    fs::create_dir_all(&p)?;
    p.push("report.txt");
    fs::write(&p, "ok\n")?;
    println!("{:?}", p.canonicalize()?);
    Ok(())
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "fmt"
    "os"
    "path/filepath"
)

func main() {
    p := filepath.Join("data", "2026", "report.txt")
    if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
        panic(err)
    }
    if err := os.WriteFile(p, []byte("ok\n"), 0o644); err != nil {
        panic(err)
    }
    abs, _ := filepath.Abs(p)
    fmt.Println(abs)
}
```

</div>
</div>
