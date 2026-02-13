---
title: Linked List
description: Node-based list families and when to use each variant.
permalink: /data-structures/lists/linked-list/
---

## Basic Idea

A linked list stores values in nodes connected by pointers/references instead of contiguous memory.

- Good at constant-time insertion/deletion once the location node is known.
- Poor at random access because traversal is sequential.

## Variants

- [Singly Linked List]({{ '/data-structures/lists/linked-list/singly/' | relative_url }})
- [Doubly Linked List]({{ '/data-structures/lists/linked-list/doubly/' | relative_url }})
- [Circular & Ring Buffers]({{ '/data-structures/lists/linked-list/circular-ring-buffer/' | relative_url }})

## Linked List Mental Model (Deeper)

A linked list is a graph of nodes with strict traversal contracts.

Core implications:

- no direct index jumps
- each mutation is local pointer surgery
- correctness depends on preserving link invariants after every write

## Variant Selection Guide

| Variant | Use when | Watch for |
| --- | --- | --- |
| singly linked | low-memory one-way traversal is enough | expensive backward traversal |
| doubly linked | frequent bidirectional traversal or O(1) delete by node | extra pointer memory and update complexity |
| circular/ring | high-throughput bounded streams | full/empty state handling and overwrite policy clarity |

## Mutation Safety Checklist

1. Save references to all affected neighbors before rewiring.
2. Update both forward and backward links (doubly) symmetrically.
3. Handle head/tail updates explicitly.
4. Validate structure after operation in tests.

## When Not To Use Linked Lists

- workloads dominated by random indexed access
- tight loop numeric processing where cache locality is critical
- simple append/read workloads where dynamic arrays are simpler and faster
