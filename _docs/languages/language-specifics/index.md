---
title: Specifics
description: Language-specific patterns and idioms for Python, Rust, and Go with practical tradeoffs.
permalink: /languages/language-specifics/
---

## Scope

This section focuses on language-specific engineering patterns that appear in real codebases.

For each pattern, the goal is to answer:

- what problem this pattern solves
- why it is idiomatic in this language
- pros and cons
- when to use it
- edge cases that cause production bugs

## Subtopics

- [Python]({{ '/languages/language-specifics/python-patterns/' | relative_url }})
- [Rust]({{ '/languages/language-specifics/rust-patterns/' | relative_url }})
- [Go]({{ '/languages/language-specifics/go-patterns/' | relative_url }})

## How To Use This Section

1. Start with one language page.
2. Learn each pattern's constraints and tradeoffs.
3. Copy the examples and adapt them to your current project.
4. Revisit the edge-case notes before writing production code.

## Pattern Review Framework

When evaluating a language-specific pattern, ask:

1. What concrete bug class does this pattern prevent?
2. What runtime or maintenance cost does it introduce?
3. Does this pattern improve boundary clarity or just internal cleverness?
4. What tests must exist to keep this pattern safe over refactors?

## Practical Usage Model

- Use this section when basic syntax is no longer the bottleneck.
- Pick one pattern at a time and implement it in a real mini-problem.
- Keep a written "when not to use" rule for each adopted pattern.

## Cross-Language Pattern Equivalents

| Intent | Python | Rust | Go |
| --- | --- | --- | --- |
| enforce data shape at boundary | `pydantic`/dataclass validation | typed structs + serde + enums | struct binding + explicit validation |
| deterministic cleanup | context managers | RAII + `Drop` | `defer` |
| safe shared mutation | locks and strict ownership discipline | ownership-first + `Arc<Mutex<_>>` only when needed | goroutines/channels or mutexes with scope discipline |
| extensibility without deep inheritance | composition + protocols | traits | interfaces + composition |

## Common Pattern Failures

1. Applying a pattern outside the constraints it was designed for.
2. Copying pattern structure without understanding invariants.
3. Missing edge-case tests for lifecycle and error paths.
4. Allowing pattern-specific abstractions to leak across unrelated modules.
