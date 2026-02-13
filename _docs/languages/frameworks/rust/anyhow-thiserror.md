---
title: anyhow + thiserror
description: Practical Rust error-handling architecture using typed domain errors with thiserror and ergonomic app-boundary error propagation with anyhow.
permalink: /languages/frameworks/rust/anyhow-thiserror/
---

## Big Picture

`thiserror` and `anyhow` solve different parts of Rust error handling.

- `thiserror`: define **typed, domain-specific** error enums/structs.
- `anyhow`: ergonomic **application-level** error propagation with context.

A robust pattern is:

1. library/domain layers return typed errors (`thiserror`)
2. top-level app boundaries (CLI, worker main, job runner) return `anyhow::Result`

## Core Concepts

### `thiserror`

- `#[derive(Error)]` to define custom error types.
- `#[error("...")]` for human-readable messages.
- `#[from]` to auto-convert source errors.
- `#[source]` to keep causal error chain.

### `anyhow`

- `anyhow::Result<T>` as app-boundary result type.
- `.context("...")` and `.with_context(...)` to attach rich diagnostics.
- `bail!` and `ensure!` macros for concise guard-style failures.
- single `Error` type that can wrap many causes.

## When To Use Which

| Layer | Prefer | Why |
| --- | --- | --- |
| reusable library crate | `thiserror` typed errors | callers can pattern-match and recover correctly |
| domain/service internal boundary | `thiserror` typed errors | explicit contracts and predictable branching |
| CLI/worker `main` | `anyhow` | concise propagation + context-rich diagnostics |
| scripts/prototypes | `anyhow` (possibly only) | speed and ergonomics |

## Example: `thiserror` For Domain Errors

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("missing required field: {field}")]
    MissingField { field: String },

    #[error("invalid port: {value}")]
    InvalidPort { value: String },

    #[error("failed to read config file at {path}: {source}")]
    Io {
        path: String,
        #[source]
        source: std::io::Error,
    },
}
```

This is explicit and machine-checkable via `match` on variants.

## Example: `anyhow` At App Boundary

```rust
use anyhow::{Context, Result};
use std::fs;

fn load_config(path: &str) -> Result<String> {
    let raw = fs::read_to_string(path)
        .with_context(|| format!("unable to read config file at {path}"))?;
    Ok(raw)
}

fn main() -> Result<()> {
    let raw = load_config("./config/app.toml")
        .context("startup failed while loading configuration")?;

    println!("loaded {} bytes", raw.len());
    Ok(())
}
```

The extra context makes operational failures much easier to diagnose.

## Combined Pattern: Typed Internals + Ergonomic Boundary

```rust
use anyhow::{Context, Result};
use thiserror::Error;

#[derive(Debug, Error)]
enum ParsePortError {
    #[error("port was empty")]
    Empty,
    #[error("port must be numeric, got: {0}")]
    NotNumber(String),
    #[error("port out of allowed range: {0}")]
    OutOfRange(u16),
}

fn parse_port(raw: &str) -> std::result::Result<u16, ParsePortError> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(ParsePortError::Empty);
    }

    let n: u16 = trimmed
        .parse()
        .map_err(|_| ParsePortError::NotNumber(trimmed.to_string()))?;

    if !(1024..=65535).contains(&n) {
        return Err(ParsePortError::OutOfRange(n));
    }
    Ok(n)
}

fn run(raw_port: &str) -> Result<u16> {
    let port = parse_port(raw_port)
        .with_context(|| format!("invalid PORT value: {raw_port}"))?;
    Ok(port)
}
```

Inside domain logic you keep typed errors. At top boundary you add operational context and propagate with `anyhow`.

## Useful Macros and Functions

### `thiserror`

1. `#[derive(Error)]`: derive `std::error::Error` implementation.
2. `#[error("...")]`: display message template.
3. `#[from]`: auto-conversion from source error type.
4. `#[source]`: explicit causal source field.

### `anyhow`

1. `anyhow!(...)`: create ad-hoc error value.
2. `bail!(...)`: return early with error.
3. `ensure!(condition, ...)`: guard + error if condition false.
4. `Context` trait (`context`, `with_context`): add layered diagnostics.

## Design Patterns

### Pattern 1: Error Contract in Library Crates

- public APIs return concrete typed errors
- callers can branch by variant
- no hidden string parsing to decide behavior

### Pattern 2: Context-at-Boundary Rule

- each external boundary adds context once
- avoid repeating same context at many levels
- include identifiers useful in logs (path, ID, operation)

### Pattern 3: One-Way Conversion Upward

- lower layers: precise typed errors
- upper layers: optionally convert to `anyhow::Error`
- avoid converting to `anyhow` too early in reusable code

## Best Practices

1. Use `thiserror` for domain/library APIs that need stable error contracts.
2. Use `anyhow` for top-level app orchestration and command handlers.
3. Add context at I/O and external-call boundaries.
4. Keep error messages actionable and specific.
5. Preserve source chains; do not drop underlying causes.
6. Match on typed errors where recovery behavior differs.

## Anti-Patterns

1. Returning `anyhow::Result` from public library APIs by default.
2. Using string matching on error messages for control flow.
3. Wrapping every function with duplicate context noise.
4. Hiding recoverable error variants behind one opaque catch-all too early.

## Testing Strategy

1. Unit test typed error variants from domain functions.
2. Assert conversion behavior (`#[from]`) where relevant.
3. Test boundary errors include useful context text.
4. Include failure-path tests for I/O, parse, and external dependency errors.

## Edge Cases and Gotchas

1. `anyhow` downcasting is possible but should not replace typed domain errors.
2. Error messages are for humans; variants/types are for program logic.
3. Overly generic variant names (`Internal`, `Unknown`) reduce debuggability.
4. Context strings should include identifiers, not only generic text.

## Documentation Links

- thiserror: [docs.rs/thiserror](https://docs.rs/thiserror/latest/thiserror/)
- anyhow: [docs.rs/anyhow](https://docs.rs/anyhow/latest/anyhow/)
- Rust `std::error::Error`: [doc.rust-lang.org/std/error/trait.Error.html](https://doc.rust-lang.org/std/error/trait.Error.html)
- Rust `Result`: [doc.rust-lang.org/std/result/enum.Result.html](https://doc.rust-lang.org/std/result/enum.Result.html)

## Operational Checklist

1. Decide error boundary policy per crate before implementation.
2. Ensure logs include error chain and root cause.
3. Standardize formatting for CLI/worker fatal errors.
4. Keep error enums versioned and documented when they are public API.
