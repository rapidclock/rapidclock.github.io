---
title: Languages
description: Topic-first language references for Python, Rust, and Go.
permalink: /languages/
---

## Scope

This section is a quick operational reference: how to do common tasks in Python, Rust, and Go with idiomatic, standard-library-first code.

Target runtime versions:

- Python: 3.12+
- Rust: stable toolchain, edition 2021
- Go: 1.23+

## Topics

- [Basic Syntax Cheatsheet]({{ '/languages/basic-syntax-cheatsheet/' | relative_url }})
- [General]({{ '/languages/general/' | relative_url }})
- [Features]({{ '/languages/language-features/' | relative_url }})
- [Specifics]({{ '/languages/language-specifics/' | relative_url }})
- [Frameworks]({{ '/languages/frameworks/' | relative_url }})
- [Functional Programming]({{ '/languages/functional-programming/' | relative_url }})
- [Arrays]({{ '/languages/arrays/' | relative_url }})
- [Dictionaries]({{ '/languages/dictionaries/' | relative_url }})
- [Sets]({{ '/languages/sets/' | relative_url }})
- [Open, Read & Write to A File]({{ '/languages/file-io/' | relative_url }})
- [File Formats]({{ '/languages/file-formats/' | relative_url }})
- [TCP Streams]({{ '/languages/tcp-streams/' | relative_url }})
- [HTTP Client]({{ '/languages/http-client/' | relative_url }})

## Style Rules Used Here

- Prefer standard library first.
- When stdlib is weak or verbose for production use, list one recommended package and a few popular alternatives.
- Keep snippets small and directly reusable.

## Cookbook Navigation Strategy

If you are solving a real task and need answers fast, use this order:

1. Start with the closest operation page (`arrays`, `dictionaries`, `file-io`, `http-client`, etc.).
2. Jump to `General` when you need concurrency/runtime model decisions.
3. Use `Features` when you need language-native mechanisms (traits, decorators, interfaces, generics, reflection).
4. Use `Specifics` when you need language-idiomatic patterns and edge-case handling.
5. Use `Frameworks` only after core language and stdlib boundaries are clear.

## Cross-Language Translation Lens

When porting patterns between Python, Rust, and Go, map these first:

| Concern | Python | Rust | Go |
| --- | --- | --- | --- |
| Error model | exceptions | `Result` + explicit propagation | error return values |
| Concurrency baseline | threads + `asyncio` | async runtimes + ownership-safe threads | goroutines + channels |
| Shared mutable state | locks, careful discipline | ownership first, locks explicit | mutex/RWMutex or channels |
| Data validation boundary | runtime validation (`pydantic`, custom checks) | type system + serde decode checks | struct validation + explicit checks |
| Resource cleanup | context managers / `try/finally` | RAII + `Drop` | `defer` |

## Design and Review Checklist

Before finalizing an implementation:

1. Define boundary contracts (input/output shapes and error policy).
2. Define timeout and retry strategy for external calls.
3. Confirm data structure choices using operation complexity and workload shape.
4. Add failure-path tests (timeouts, malformed input, partial dependency outage).
5. Verify observability (logs, metrics, correlation IDs).

## Common Cross-Language Mistakes

1. Translating syntax without translating execution model.
2. Applying one language's idioms directly in another where runtime semantics differ.
3. Ignoring default timeout/retry behavior differences across stdlib and ecosystem packages.
4. Focusing on happy-path snippets without lifecycle and cleanup semantics.
5. Shipping without load/failure testing for the actual bottleneck path.

## Suggested Learning Paths

### Backend API Engineer

1. `file-io` -> `http-client` -> `tcp-streams`
2. `general/detailed-concurrency` -> `general/async-io`
3. language `features` + `specifics`
4. framework pages for chosen stack

### Data/ETL Engineer

1. `arrays`, `dictionaries`, `sets`, `file-formats`
2. `functional-programming`
3. concurrency and async sections for pipeline parallelism
4. framework pages (`pandas`, `numpy/scipy`, `sqlalchemy`) when needed
