---
title: Tree
description: Traversal and query algorithms on tree structures.
permalink: /algorithms/tree/
---

## Subtopics

- [Traversals (Pre/In/Post)]({{ '/algorithms/tree/traversals/' | relative_url }})
- [Lowest Common Ancestor]({{ '/algorithms/tree/lowest-common-ancestor/' | relative_url }})

## Tree Algorithm Selection Guide

| Task | Preferred approach | Why |
| --- | --- | --- |
| ordered output from BST | inorder traversal | preserves sorted order |
| full structural exploration | DFS/BFS variants | flexible traversal semantics |
| ancestor relationship queries in BST | BST LCA split-point rule | O(h) with ordering property |

## Implementation Checklist

1. Write traversal order intent before coding.
2. Choose recursive vs iterative strategy based on depth risk.
3. Validate node-existence assumptions for query algorithms.
4. Add skewed-tree tests to expose stack-depth or performance issues.

## Common Mistakes

1. Assuming inorder is sorted for non-BST trees.
2. Ignoring missing-key behavior in LCA problems.
3. Forgetting to restore temporary links in Morris traversal.
