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
