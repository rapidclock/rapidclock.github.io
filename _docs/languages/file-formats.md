---
title: File Formats
description: Practical handling of common file formats (CSV, JSON, TOML, YAML) in Python, Rust, and Go.
permalink: /languages/file-formats/
---

## Big Picture

Most file-format bugs are not parser bugs. They come from assumptions:

- unexpected encoding
- missing/extra fields
- wrong type conversion
- parser differences across tools

This page focuses on safe, idiomatic workflows in all three languages.

## Quick Format Selection

| Format | Best for | Strengths | Main caveats |
| --- | --- | --- | --- |
| CSV | tabular records | simple, spreadsheet-friendly, streamable | no native types, delimiter/quote pitfalls |
| JSON | APIs and nested payloads | ubiquitous and portable | no comments/trailing commas in strict JSON |
| TOML | application config | readable typed config | external package needed for writing in Python |
| YAML | human-edited infra/docs config | expressive + comments | implicit typing ambiguity, parser differences |

## Package Baseline

| Format | Python | Rust | Go |
| --- | --- | --- | --- |
| CSV | `csv` (stdlib) | `csv` crate | `encoding/csv` (stdlib) |
| JSON | `json` (stdlib) | `serde_json` crate | `encoding/json` (stdlib) |
| TOML | `tomllib` (read), `tomli-w` (write) | `toml` crate | `github.com/pelletier/go-toml/v2` |
| YAML | `PyYAML` (`yaml.safe_load`) | `serde_yaml` crate | `gopkg.in/yaml.v3` |

## Universal Rules

1. Always use explicit UTF-8 for text files.
2. Parse first, then validate shape/types explicitly.
3. Treat file input as untrusted.
4. Prefer deterministic writes (stable field order and formatting).
5. Stream large files instead of loading everything into memory.

## CSV

### Mental Model

CSV stores rows of text fields. Types are not encoded.

### Read + Validate

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
import csv
from decimal import Decimal
from pathlib import Path


def load_orders(path: Path) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        required = {"order_id", "amount", "currency"}
        if not reader.fieldnames or not required.issubset(reader.fieldnames):
            raise ValueError("missing required CSV columns")

        for line_no, row in enumerate(reader, start=2):
            try:
                rows.append(
                    {
                        "order_id": int(row["order_id"]),
                        "amount": Decimal(row["amount"]),
                        "currency": row["currency"],
                    }
                )
            except Exception as exc:
                raise ValueError(f"invalid row at line {line_no}") from exc
    return rows
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use serde::Deserialize;
use std::error::Error;

#[derive(Debug, Deserialize)]
struct RawOrder {
    order_id: String,
    amount: String,
    currency: String,
}

fn load_orders(path: &str) -> Result<Vec<(u64, f64, String)>, Box<dyn Error>> {
    let mut rdr = csv::Reader::from_path(path)?;
    let mut out = Vec::new();

    for rec in rdr.deserialize::<RawOrder>() {
        let raw = rec?;
        let id: u64 = raw.order_id.parse()?;
        let amount: f64 = raw.amount.parse()?;
        out.push((id, amount, raw.currency));
    }
    Ok(out)
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "encoding/csv"
    "fmt"
    "os"
    "strconv"
)

func loadOrders(path string) error {
    f, err := os.Open(path)
    if err != nil {
        return err
    }
    defer f.Close()

    r := csv.NewReader(f)
    rows, err := r.ReadAll()
    if err != nil {
        return err
    }
    if len(rows) < 1 {
        return fmt.Errorf("empty csv")
    }

    for i, row := range rows[1:] {
        if len(row) < 3 {
            return fmt.Errorf("line %d malformed", i+2)
        }
        _, err := strconv.Atoi(row[0])
        if err != nil {
            return fmt.Errorf("line %d invalid order_id: %w", i+2, err)
        }
    }
    return nil
}
```

</div>
</div>

### Write Safely

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
import csv
from pathlib import Path

records = [
    {"name": "Ada Lovelace", "note": "contains, comma"},
    {"name": "Grace Hopper", "note": "contains\nnewline"},
]

with Path("people.csv").open("w", encoding="utf-8", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["name", "note"])
    w.writeheader()
    w.writerows(records)
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use std::error::Error;

fn write_people(path: &str) -> Result<(), Box<dyn Error>> {
    let mut wtr = csv::Writer::from_path(path)?;
    wtr.write_record(["name", "note"])?;
    wtr.write_record(["Ada Lovelace", "contains, comma"])?;
    wtr.write_record(["Grace Hopper", "contains\nnewline"])?;
    wtr.flush()?;
    Ok(())
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "encoding/csv"
    "os"
)

func writePeople(path string) error {
    f, err := os.Create(path)
    if err != nil {
        return err
    }
    defer f.Close()

    w := csv.NewWriter(f)
    defer w.Flush()

    if err := w.Write([]string{"name", "note"}); err != nil {
        return err
    }
    if err := w.Write([]string{"Ada Lovelace", "contains, comma"}); err != nil {
        return err
    }
    return w.Write([]string{"Grace Hopper", "contains\nnewline"})
}
```

</div>
</div>

### CSV Caveats

- Never parse CSV using `split(",")`.
- Delimiter may be `,`, `;`, or tab.
- Excel exports may include UTF-8 BOM.
- Validate column count and required headers.

## JSON

### Mental Model

JSON supports objects, arrays, strings, numbers, booleans, and null.

### Read + Validate

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
import json
from pathlib import Path


def load_config(path: Path) -> dict[str, object]:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, dict):
        raise ValueError("config root must be object")
    if not isinstance(data.get("timeout_ms"), int):
        raise ValueError("timeout_ms must be int")
    return data
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use serde::Deserialize;
use std::error::Error;
use std::fs;

#[derive(Debug, Deserialize)]
struct Config {
    service: String,
    timeout_ms: u64,
}

fn load_config(path: &str) -> Result<Config, Box<dyn Error>> {
    let text = fs::read_to_string(path)?;
    let cfg: Config = serde_json::from_str(&text)?;
    Ok(cfg)
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "encoding/json"
    "os"
)

type Config struct {
    Service   string `json:"service"`
    TimeoutMS int    `json:"timeout_ms"`
}

func loadConfig(path string) (Config, error) {
    b, err := os.ReadFile(path)
    if err != nil {
        return Config{}, err
    }
    var cfg Config
    err = json.Unmarshal(b, &cfg)
    return cfg, err
}
```

</div>
</div>

### Write Deterministically

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
import json
from pathlib import Path

payload = {"service": "payments", "timeout_ms": 1500}
with Path("config.json").open("w", encoding="utf-8") as f:
    json.dump(payload, f, indent=2, sort_keys=True, ensure_ascii=False)
    f.write("\n")
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use serde::Serialize;
use std::error::Error;
use std::fs;

#[derive(Serialize)]
struct Config {
    service: String,
    timeout_ms: u64,
}

fn write_config(path: &str) -> Result<(), Box<dyn Error>> {
    let cfg = Config {
        service: "payments".to_string(),
        timeout_ms: 1500,
    };
    let text = serde_json::to_string_pretty(&cfg)?;
    fs::write(path, format!("{text}\n"))?;
    Ok(())
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "encoding/json"
    "os"
)

type Config struct {
    Service   string `json:"service"`
    TimeoutMS int    `json:"timeout_ms"`
}

func writeConfig(path string) error {
    cfg := Config{Service: "payments", TimeoutMS: 1500}
    b, err := json.MarshalIndent(cfg, "", "  ")
    if err != nil {
        return err
    }
    b = append(b, '\n')
    return os.WriteFile(path, b, 0o644)
}
```

</div>
</div>

### NDJSON (Line-Delimited JSON)

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
import json

events = [{"event": "login", "user_id": 7}, {"event": "logout", "user_id": 7}]
with open("events.ndjson", "w", encoding="utf-8") as f:
    for e in events:
        f.write(json.dumps(e, ensure_ascii=False))
        f.write("\n")
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use serde_json::json;
use std::error::Error;
use std::fs::File;
use std::io::Write;

fn write_ndjson(path: &str) -> Result<(), Box<dyn Error>> {
    let mut f = File::create(path)?;
    let events = vec![
        json!({"event":"login","user_id":7}),
        json!({"event":"logout","user_id":7}),
    ];
    for e in events {
        writeln!(f, "{}", serde_json::to_string(&e)?)?;
    }
    Ok(())
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "encoding/json"
    "os"
)

func writeNDJSON(path string) error {
    f, err := os.Create(path)
    if err != nil {
        return err
    }
    defer f.Close()

    enc := json.NewEncoder(f)
    events := []map[string]any{
        {"event": "login", "user_id": 7},
        {"event": "logout", "user_id": 7},
    }
    for _, e := range events {
        if err := enc.Encode(e); err != nil {
            return err
        }
    }
    return nil
}
```

</div>
</div>

### JSON Caveats

- No comments or trailing commas in strict JSON.
- Be careful with floating-point precision for money.
- Standardize datetime representation (usually ISO-8601 strings).

## TOML

### Mental Model

TOML is a typed config format with clear tables/arrays.

### Read TOML

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
import tomllib
from pathlib import Path

with Path("app.toml").open("rb") as f:
    cfg = tomllib.load(f)

print(cfg["service"]["name"])
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use serde::Deserialize;
use std::error::Error;
use std::fs;

#[derive(Debug, Deserialize)]
struct Config {
    service: Service,
}

#[derive(Debug, Deserialize)]
struct Service {
    name: String,
    timeout_ms: u64,
}

fn load_toml(path: &str) -> Result<Config, Box<dyn Error>> {
    let text = fs::read_to_string(path)?;
    Ok(toml::from_str(&text)?)
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "os"

    "github.com/pelletier/go-toml/v2"
)

type Config struct {
    Service struct {
        Name      string `toml:"name"`
        TimeoutMS int    `toml:"timeout_ms"`
    } `toml:"service"`
}

func loadTOML(path string) (Config, error) {
    b, err := os.ReadFile(path)
    if err != nil {
        return Config{}, err
    }
    var cfg Config
    err = toml.Unmarshal(b, &cfg)
    return cfg, err
}
```

</div>
</div>

### Write TOML

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
from pathlib import Path
import tomli_w

cfg = {"service": {"name": "billing", "timeout_ms": 1200}}
Path("app.toml").write_text(tomli_w.dumps(cfg), encoding="utf-8")
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use serde::Serialize;
use std::error::Error;
use std::fs;

#[derive(Serialize)]
struct Config {
    service: Service,
}

#[derive(Serialize)]
struct Service {
    name: String,
    timeout_ms: u64,
}

fn write_toml(path: &str) -> Result<(), Box<dyn Error>> {
    let cfg = Config {
        service: Service {
            name: "billing".to_string(),
            timeout_ms: 1200,
        },
    };
    fs::write(path, toml::to_string_pretty(&cfg)?)?;
    Ok(())
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "os"

    "github.com/pelletier/go-toml/v2"
)

type Config struct {
    Service struct {
        Name      string `toml:"name"`
        TimeoutMS int    `toml:"timeout_ms"`
    } `toml:"service"`
}

func writeTOML(path string) error {
    var cfg Config
    cfg.Service.Name = "billing"
    cfg.Service.TimeoutMS = 1200

    b, err := toml.Marshal(cfg)
    if err != nil {
        return err
    }
    return os.WriteFile(path, b, 0o644)
}
```

</div>
</div>

### TOML Caveats

- Python stdlib reads TOML but does not write TOML.
- Keep table structure stable to avoid migration surprises.
- Prefer explicit field tags/mappings for long-lived configs.

## YAML

### Mental Model

YAML is expressive and human-friendly, but flexible parsing can cause ambiguity.

### Parse Safely

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
from pathlib import Path
import yaml

with Path("deploy.yaml").open("r", encoding="utf-8") as f:
    data = yaml.safe_load(f)
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use serde::Deserialize;
use std::error::Error;
use std::fs;

#[derive(Debug, Deserialize)]
struct Deploy {
    service: String,
    replicas: u32,
}

fn load_yaml(path: &str) -> Result<Deploy, Box<dyn Error>> {
    let text = fs::read_to_string(path)?;
    Ok(serde_yaml::from_str(&text)?)
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "os"

    "gopkg.in/yaml.v3"
)

type Deploy struct {
    Service  string `yaml:"service"`
    Replicas int    `yaml:"replicas"`
}

func loadYAML(path string) (Deploy, error) {
    b, err := os.ReadFile(path)
    if err != nil {
        return Deploy{}, err
    }
    var d Deploy
    err = yaml.Unmarshal(b, &d)
    return d, err
}
```

</div>
</div>

### Write YAML

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
from pathlib import Path
import yaml

doc = {"service": "checkout", "replicas": 3}
Path("deploy.yaml").write_text(
    yaml.safe_dump(doc, sort_keys=False, allow_unicode=True),
    encoding="utf-8",
)
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use serde::Serialize;
use std::error::Error;
use std::fs;

#[derive(Serialize)]
struct Deploy {
    service: String,
    replicas: u32,
}

fn write_yaml(path: &str) -> Result<(), Box<dyn Error>> {
    let d = Deploy {
        service: "checkout".to_string(),
        replicas: 3,
    };
    fs::write(path, serde_yaml::to_string(&d)?)?;
    Ok(())
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "os"

    "gopkg.in/yaml.v3"
)

type Deploy struct {
    Service  string `yaml:"service"`
    Replicas int    `yaml:"replicas"`
}

func writeYAML(path string) error {
    d := Deploy{Service: "checkout", Replicas: 3}
    b, err := yaml.Marshal(d)
    if err != nil {
        return err
    }
    return os.WriteFile(path, b, 0o644)
}
```

</div>
</div>

### Multi-Document YAML

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
import yaml

with open("k8s.yaml", "r", encoding="utf-8") as f:
    docs = list(yaml.safe_load_all(f))

for d in docs:
    print(d.get("kind"))
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use serde::Deserialize;
use serde_yaml::Value;
use std::error::Error;
use std::fs;

fn read_multi_yaml(path: &str) -> Result<Vec<Value>, Box<dyn Error>> {
    let text = fs::read_to_string(path)?;
    let docs = serde_yaml::Deserializer::from_str(&text)
        .map(Value::deserialize)
        .collect::<Result<Vec<_>, _>>()?;
    Ok(docs)
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "bytes"
    "io"
    "os"

    "gopkg.in/yaml.v3"
)

func readMultiYAML(path string) ([]map[string]any, error) {
    b, err := os.ReadFile(path)
    if err != nil {
        return nil, err
    }

    var out []map[string]any
    dec := yaml.NewDecoder(bytes.NewReader(b))
    for {
        var doc map[string]any
        err := dec.Decode(&doc)
        if err != nil {
            if err == io.EOF {
                break
            }
            return nil, err
        }
        out = append(out, doc)
    }
    return out, nil
}
```

</div>
</div>

### YAML Caveats

- Use safe loaders in Python (`safe_load`).
- Quote ambiguous scalars (`on`, `off`, `yes`, dates) if you need string semantics.
- Indentation mistakes can silently change structure.

## Validation Strategy

Parsing confirms syntax, not business correctness.

Use typed models and explicit rules:

- Python: dataclasses/Pydantic/manual checks
- Rust: typed structs + serde + domain validation functions
- Go: structs + validation layer after unmarshal

## Practical Workflow

1. Read with strict parser.
2. Validate schema and domain rules.
3. Normalize into internal model.
4. Process logic.
5. Write deterministic output.
6. Add tests with malformed files and boundary cases.

## Global Edge Cases Checklist

1. Encoding mismatch:
   Always use UTF-8 explicitly.
2. Type drift:
   CSV fields are text; parse and validate types.
3. Precision risk:
   Use decimal-safe types for money.
4. Partial writes:
   Use temp-file + rename for critical outputs.
5. Security:
   Never use unsafe YAML loading on untrusted input.
