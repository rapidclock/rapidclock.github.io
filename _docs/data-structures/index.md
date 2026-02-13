---
title: Data Structures
description: Practical structure references with complexity analysis and implementation notes.
permalink: /data-structures/
---

## How To Use This Section

Each leaf topic focuses on:

- Concept and invariant
- Time and space complexity
- Common use cases and tradeoffs
- Illustrations and traversal intuition
- Working implementations in Python, Rust, and Go

## Structure

- [Lists]({{ '/data-structures/lists/' | relative_url }})
- [Trees]({{ '/data-structures/trees/' | relative_url }})
- [Graphs]({{ '/data-structures/graphs/' | relative_url }})
- [Misc]({{ '/data-structures/misc/' | relative_url }})

## Data Structure Selection Workflow

Pick structures by operation profile, not by familiarity.

1. List hot operations (`lookup`, `insert`, `delete`, `range query`, `iteration`, `merge`).
2. Estimate read/write ratio and key distribution.
3. Use asymptotic complexity to filter options.
4. Compare implementation complexity and bug risk.
5. Confirm with workload-level benchmarks.

## Operations-First Decision Matrix

| Need | Strong first choice | Why |
| --- | --- | --- |
| sequential appends + indexed reads | dynamic array/list | cache-friendly, simple, fast constants |
| frequent middle insertion/deletion via node handles | linked structures | O(1) rewiring once node is known |
| sorted lookup + ordered iteration | balanced BST family | predictable logarithmic search and ordered traversal |
| priority scheduling | heap | O(log n) push/pop-min(max) |
| connected-component tracking in dynamic graph | union-find | near-constant amortized unions/finds |
| graph reachability/pathing | adjacency list + graph algorithms | memory-efficient for sparse graphs |

## Complexity Is Necessary But Not Sufficient

Two structures may share big-O but differ a lot in:

- memory locality and CPU cache behavior
- constant factors
- implementation complexity
- ease of proving correctness

Use this section as a correctness and design reference, then validate with benchmark data.

## Pitfalls Checklist

1. Choosing a structure before writing required operations.
2. Ignoring update/query mix (read-heavy vs write-heavy).
3. Not accounting for worst-case degradation and balancing needs.
4. Shipping complex structures without invariant-validation tests.
