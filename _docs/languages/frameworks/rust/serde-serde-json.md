---
title: Serde + Serde JSON
description: Typed serialization/deserialization patterns in Rust for robust API and storage boundaries.
permalink: /languages/frameworks/rust/serde-serde-json/
---

## Big Picture

`serde` is Rust's standard serialization framework, and `serde_json` is the JSON format implementation most projects use.

Use this stack at boundaries:

- HTTP payloads
- event streams
- config files
- cache blobs

## Core Concepts

- `Serialize` / `Deserialize` derives
- schema mapping via attributes (`rename`, `default`, `flatten`)
- typed decoding into domain structs
- `Value` for partially-typed or exploratory parsing

## Example: Strict Typed Decode

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct User {
    id: u64,
    name: String,
    email: String,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let raw = r#"{"id":7,"name":"Ada","email":"ada@example.com"}"#;
    let user: User = serde_json::from_str(raw)?;
    println!("{:?}", user);

    let out = serde_json::to_string_pretty(&user)?;
    println!("{}", out);
    Ok(())
}
```

## Example: Backward-Compatible Input with Defaults

```rust
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct Config {
    service: String,
    #[serde(default = "default_timeout_ms")]
    timeout_ms: u64,
}

fn default_timeout_ms() -> u64 {
    1500
}
```

This lets older payloads omit fields safely.

## Tradeoffs

### Pros

- compile-time contract clarity
- very fast in practice for many workloads
- rich ecosystem integration

### Cons

- schema evolution still needs deliberate versioning
- overusing dynamic `Value` can throw away type safety
- custom de/serialization logic can become complex quickly

## Edge Cases and Gotchas

1. `Option<T>` semantics:
   distinguish missing field vs explicit null when API requires it.
2. Unknown fields:
   consider `#[serde(deny_unknown_fields)]` for strict boundaries.
3. Large payload memory use:
   use streaming readers when payloads are very large.
4. Number handling:
   decide on integer/floating precision explicitly.

## Documentation Links

- Serde: [serde.rs](https://serde.rs/)
- Serde attributes: [serde.rs/attributes.html](https://serde.rs/attributes.html)
- Serde JSON docs: [docs.rs/serde_json](https://docs.rs/serde_json/latest/serde_json/)
- Rust stdlib `Read` (for streaming decode): [doc.rust-lang.org/std/io/trait.Read.html](https://doc.rust-lang.org/std/io/trait.Read.html)

## Deep Dive Cookbook Additions

### Schema Versioning Pattern

- add explicit version field when contracts evolve
- support old + new fields during transition windows
- avoid breaking rename/removal without migration strategy

### How-To: Unknown Field Handling

```rust
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct StrictConfig {
    service: String,
    timeout_ms: u64,
}
```

### How-To: Dynamic + Typed Hybrid Parsing

```rust
use serde_json::Value;

fn inspect_then_decode(v: Value) {
    if let Some(kind) = v.get("kind").and_then(|k| k.as_str()) {
        println!("kind={kind}");
    }
    // then branch into typed decoding by kind/version
}
```

### Operational Guidance

1. Keep domain models separate from wire models where versions diverge.
2. Add compatibility tests for old payload fixtures.
3. Validate numeric range assumptions explicitly post-deserialize.

## Wire Model vs Domain Model

For long-lived systems, separate models helps:

- wire model: exactly matches external JSON contract
- domain model: internal invariants and names

Map between them explicitly. This reduces breakage when external payloads evolve.

## Complete Example: Versioned Payload Decode

```rust
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(tag = "version")]
enum EventWire {
    #[serde(rename = "v1")]
    V1 { user_id: u64, email: String },
    #[serde(rename = "v2")]
    V2 { user_id: u64, email: String, country: String },
}

#[derive(Debug)]
struct UserCreated {
    user_id: u64,
    email: String,
    country: Option<String>,
}

impl From<EventWire> for UserCreated {
    fn from(w: EventWire) -> Self {
        match w {
            EventWire::V1 { user_id, email } => Self {
                user_id,
                email,
                country: None,
            },
            EventWire::V2 {
                user_id,
                email,
                country,
            } => Self {
                user_id,
                email,
                country: Some(country),
            },
        }
    }
}
```

## How-To: Custom Field Parsing

```rust
use serde::{Deserialize, Deserializer};

fn de_bool_from_int<'de, D>(d: D) -> Result<bool, D::Error>
where
    D: Deserializer<'de>,
{
    let v = u8::deserialize(d)?;
    Ok(v != 0)
}

#[derive(Debug, Deserialize)]
struct Flags {
    #[serde(deserialize_with = "de_bool_from_int")]
    enabled: bool,
}
```

Custom de/serialization is useful when integrating with non-idiomatic legacy payloads.

## Compatibility Testing Pattern

1. keep fixture JSON for previous schema versions
2. test decode success for old fixtures
3. test encode shape for current version
4. test strict boundary behavior for unknown/invalid fields

## Performance and Memory Notes

1. decode directly from reader for large payloads when possible
2. avoid converting to `Value` unless dynamic logic is required
3. prefer borrowed deserialization where lifetimes and complexity allow
4. validate numeric ranges post-deserialize for domain safety
