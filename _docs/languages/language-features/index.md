---
title: Features
description: Deep dives into language-native capabilities in Python, Rust, and Go.
permalink: /languages/language-features/
---

## Scope

This section explores language-native features in depth, including semantics, tradeoffs, and idiomatic examples.

## Subtopics

- [Python]({{ '/languages/language-features/python/' | relative_url }})
- [Rust]({{ '/languages/language-features/rust/' | relative_url }})
- [Go]({{ '/languages/language-features/go/' | relative_url }})

## Reading Order

1. Learn each language's execution and type model.
2. Learn error/concurrency model.
3. Learn metaprogramming and advanced ergonomics.

## Feature Selection Matrix

| Problem | Python leaning | Rust leaning | Go leaning |
| --- | --- | --- | --- |
| ergonomic meta-programming | decorators, descriptors, metaclasses | macros/derive/procedural macros | code generation + interfaces |
| zero-cost abstractions | limited by runtime overhead | traits + monomorphization | interfaces + compiler optimizations |
| strict compile-time guarantees | typing aids but runtime still dynamic | ownership/borrowing + type system | compile-time interface checks + explicit errors |
| runtime reflection-heavy workflows | strong introspection support | deliberate and limited | reflection available but used carefully |

## Reading Method

For each language page, follow this sequence:

1. Understand semantics first (what the feature guarantees).
2. Learn ergonomics (how to use it idiomatically).
3. Read tradeoffs and edge cases.
4. Adopt testing strategies that validate feature-specific failure modes.

## Architecture Guidance

- Use language features to encode invariants, not to make code look clever.
- Prefer explicitness at service boundaries and high-risk logic.
- Add examples for both happy path and failure path whenever introducing advanced features.

## Common Misuse Patterns

1. Overusing advanced features before baseline readability is established.
2. Hiding control flow in implicit magic.
3. Using metaprogramming to avoid straightforward duplication prematurely.
4. Ignoring tooling/debuggability costs when choosing feature-heavy designs.
