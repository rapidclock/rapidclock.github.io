---
title: Algorithms
description: Core algorithm references with complexity analysis and idiomatic implementations.
permalink: /algorithms/
---

## How To Read These Pages

Each algorithm page is structured for fast study and recall:

- Basic explanation
- Detailed explanation and invariant
- Asymptotic time and space analysis
- Diagram or walkthrough
- Pseudocode
- Full Python, Rust, and Go implementations

## Subtopics

- [String Based]({{ '/algorithms/string-based/' | relative_url }})
- [Lists]({{ '/algorithms/lists/' | relative_url }})
- [Graph]({{ '/algorithms/graph/' | relative_url }})
- [Tree]({{ '/algorithms/tree/' | relative_url }})

## Algorithm Selection Workflow

Use this sequence for real engineering tasks:

1. Model the problem (input size, constraints, update/query pattern).
2. Identify baseline brute force complexity.
3. Choose candidate algorithm families (two pointers, graph traversal, DP, hashing, etc.).
4. Validate invariants and edge cases before coding.
5. Measure performance on representative inputs.

## Complexity and Constraint Lens

| Constraint pattern | Typical algorithmic direction |
| --- | --- |
| sorted input and pair/range questions | two pointers / sliding window |
| shortest path on unweighted graph | BFS |
| shortest path on non-negative weighted graph | Dijkstra |
| ordering with dependency edges (DAG) | topological sort |
| repeated substring search | KMP / Rabin-Karp |

## Implementation Checklist

1. Write invariants in comments before implementation.
2. Add guard clauses for invalid or degenerate input.
3. Separate core algorithm from parsing/IO code.
4. Add targeted tests for known tricky cases.
5. Log/trace intermediate states for difficult algorithms during debugging.

## Common Mistakes

1. Choosing an algorithm without validating its preconditions (e.g., negative edges in Dijkstra).
2. Ignoring overflow/precision behavior in arithmetic-heavy logic.
3. Skipping proof-by-invariant and relying on ad-hoc intuition.
4. Optimizing before correctness is locked down.
