---
title: Trees
description: Hierarchical structures with search, ordering, and balancing strategies.
permalink: /data-structures/trees/
---

## Subtopics

- [Binary Tree]({{ '/data-structures/trees/binary-tree/' | relative_url }})
- [Binary Search Tree]({{ '/data-structures/trees/binary-search-tree/' | relative_url }})
  - [Red-Black Tree]({{ '/data-structures/trees/red-black-tree/' | relative_url }})
  - [K-D Tree]({{ '/data-structures/trees/k-d-tree/' | relative_url }})
  - [AVL Tree]({{ '/data-structures/trees/avl-tree/' | relative_url }})
- [Heaps]({{ '/data-structures/trees/heaps/' | relative_url }})
- [Segment Tree]({{ '/data-structures/trees/segment-tree/' | relative_url }})
- [Fenwick Tree]({{ '/data-structures/trees/fenwick-tree/' | relative_url }})

## Quick Heuristic

- Need sorted lookup and range traversal: balanced BST variants.
- Need priority scheduling: heap.
- Need multidimensional nearest neighbor search: K-D tree.
- Need mutable range queries with flexible merge operation: segment tree.
- Need lightweight prefix/range sums with point updates: Fenwick tree.

## Tree Family Selection Matrix

| Requirement | Best first candidate | Why |
| --- | --- | --- |
| generic hierarchical traversal | binary tree | simplest traversal training ground |
| ordered search + updates | balanced BST variants | logarithmic lookup with sorted traversal |
| strict priority retrieval | heap | efficient min/max access |
| dynamic range queries on arrays | segment tree | flexible associative range operations |
| compact prefix/range sums | Fenwick tree | minimal memory and fast constants |
| multidimensional nearest-neighbor | K-D tree | geometric partitioning and pruning |

## Complexity Snapshot

| Structure | Query | Update | Notes |
| --- | --- | --- | --- |
| BST (balanced) | O(log n) | O(log n) | can degrade to O(n) unbalanced |
| Heap | top O(1), push/pop O(log n) | O(log n) | arbitrary search usually O(n) |
| Segment Tree | range query O(log n) | point/range update O(log n) | supports custom merge ops |
| Fenwick Tree | prefix/range sum O(log n) | point update O(log n) | simpler for additive workloads |

## Engineering Checklist

1. Decide whether ordering, aggregation, or priority is the primary goal.
2. Define acceptable worst-case behavior.
3. Add invariant checkers (balance/order/heap property).
4. Benchmark update/query mix with realistic data distributions.

## Common Failure Modes

1. Ignoring balancing assumptions in BST-heavy workloads.
2. Choosing segment trees for problems that only need Fenwick-level simplicity.
3. Mixing 0-index and 1-index conventions in Fenwick implementations.
4. Forgetting to test skewed/adversarial insertion sequences.
