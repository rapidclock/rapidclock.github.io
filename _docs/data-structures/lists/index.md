---
title: Lists
description: Linear structures and pointer-based linked representations.
permalink: /data-structures/lists/
---

## Subtopics

- [Linked List]({{ '/data-structures/lists/linked-list/' | relative_url }})
  - [Singly Linked List]({{ '/data-structures/lists/linked-list/singly/' | relative_url }})
  - [Doubly Linked List]({{ '/data-structures/lists/linked-list/doubly/' | relative_url }})
  - [Circular & Ring Buffers]({{ '/data-structures/lists/linked-list/circular-ring-buffer/' | relative_url }})
- [Skip Lists]({{ '/data-structures/lists/skip-lists/' | relative_url }})

## Comparison

| Structure | Random Access | Insert/Delete Middle | Memory Overhead |
| --- | --- | --- | --- |
| Dynamic array | O(1) | O(n) | low |
| Singly linked list | O(n) | O(1) after node | medium |
| Doubly linked list | O(n) | O(1) after node | higher |
| Skip list | O(log n) expected | O(log n) expected | higher |

## Workload-Based Selection

| Workload | Preferred structure | Rationale |
| --- | --- | --- |
| indexed random reads dominate | dynamic array | O(1) index + strong cache locality |
| frequent endpoint operations with known node references | linked list variants | O(1) pointer rewrites |
| sorted set/map with expected logarithmic operations | skip list | balanced-like behavior with simpler probabilistic maintenance |
| fixed-capacity stream buffering | ring buffer | stable O(1) throughput and no per-item allocation |

## Invariant Checklist

For all list-like structures, verify:

1. head/tail consistency after every mutation
2. no broken links (`next`/`prev`) after deletion
3. size accounting matches actual node count
4. boundary behaviors: empty list, single-node list, full ring buffer

## Performance Notes

- Linked structures trade memory locality for pointer flexibility.
- Skip lists trade deterministic balancing for probabilistic simplicity.
- Ring buffers are excellent for fixed-capacity queues and streaming systems.

## Testing Strategy

1. Generate random operation sequences and validate against a reference model.
2. Add explicit tests for first/last/middle deletion cases.
3. Include long-run tests to catch memory/link corruption.
