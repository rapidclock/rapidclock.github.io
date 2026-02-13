---
title: Doubly Linked List
description: Bidirectional linked nodes for efficient local insertions and deletions.
---

## Basic Explanation

A doubly linked list stores two links per node:

- `next` pointer
- `prev` pointer

This supports forward and backward traversal.

## Big Picture

A doubly linked list is the "two-way street" version of a linked list.

- Use it when you need to move both directions.
- Use it when you delete/insert around a known node frequently.
- Avoid it when memory footprint is tight, because each node stores an extra pointer.

## Detailed Explanation

### Complexity

| Operation | Time | Space |
| --- | --- | --- |
| Insert/delete at known node | O(1) | O(1) |
| Push front / back (with head+tail) | O(1) | O(1) |
| Search | O(n) | O(1) |
| Random access by index | O(n) | O(1) |

### Tradeoff

Compared with singly linked lists, each node stores an extra pointer, increasing memory overhead.

## Pros

- O(1) insert/delete at known node.
- Efficient bidirectional traversal.
- O(1) push/pop at both ends when maintaining head and tail.

## Cons

- More pointer updates per operation than singly linked list.
- Higher memory overhead (`prev` + `next`).
- More boundary bugs (head/tail rewiring) if implementation is careless.

## Use Cases

- LRU cache internals (with hashmap + doubly linked list).
- Undo/redo style navigation where backward traversal matters.
- Deques with frequent operations at both ends.

## Step-by-Step Mechanics

### Push Back

1. Create new node.
2. Set `node.prev` to current tail.
3. Set current tail's `next` to node.
4. Update `tail` to new node.

### Delete A Node (by value in this page)

1. Traverse until target node found.
2. Reconnect `prev.next` to `next`.
3. Reconnect `next.prev` to `prev`.
4. If deleting head/tail, update those endpoints.

Deletion logic is still O(1) once you already have the target node reference.

## How The Pieces Fit Together

The list keeps two endpoint pointers (`head`, `tail`) and local node links (`prev`, `next`).

- endpoints give O(1) operations at both ends
- local links let interior updates happen without shifting elements
- traversal direction is a runtime choice: from head forward or tail backward

## Worked Walkthrough

Start empty:

1. `push_back(5)` -> `5`
2. `push_back(11)` -> `5 <-> 11`
3. `push_back(29)` -> `5 <-> 11 <-> 29`
4. `delete(11)` reconnects `5` and `29` -> `5 <-> 29`

## Edge Cases

1. Delete head node:
   New head's `prev` must be set to `None`.
2. Delete tail node:
   New tail's `next` must be set to `None`.
3. Delete only node in list:
   Both `head` and `tail` must become `None`.
4. Node not found:
   Operation should return a clear failure value and leave list unchanged.
5. Corrupted bidirectional links:
   If `next.prev` and `prev.next` are inconsistent, traversal or deletion can panic or loop.

### Illustration

```mermaid
graph LR
  A[None] <--> B[5] <--> C[11] <--> D[29] <--> E[None]
```

## Pseudocode (Delete Node)

```text
function delete(node):
    if node.prev != null:
        node.prev.next = node.next
    if node.next != null:
        node.next.prev = node.prev
```

## Animated Walkthroughs

<div class="operation-anim">
  <p class="operation-anim-title">Part Animation: Delete Middle Node</p>
  <div class="op-step">1. Locate target node in chain.</div>
  <div class="op-step">2. Rewire prev.next to skip target.</div>
  <div class="op-step">3. Rewire next.prev to skip target.</div>
  <div class="op-step">4. Target node becomes detached.</div>
  <div class="op-step">5. Head/tail remain unchanged for middle delete.</div>
</div>

<div class="operation-anim">
  <p class="operation-anim-title">Full Animation: Push Back + Delete + Traverse</p>
  <div class="op-step">1. Append values to tail while maintaining prev links.</div>
  <div class="op-step">2. Delete selected key by local pointer rewiring.</div>
  <div class="op-step">3. Walk forward from head to validate order.</div>
  <div class="op-step">4. Walk backward from tail to validate reverse links.</div>
  <div class="op-step">5. Confirm both directions are consistent.</div>
</div>

<div class="operation-anim">
  <p class="operation-anim-title">Edge-Case Animation: Deleting the Only Node</p>
  <div class="op-step">1. List has one node where head == tail.</div>
  <div class="op-step">2. Delete operation removes that node.</div>
  <div class="op-step">3. Head must be set to None.</div>
  <div class="op-step">4. Tail must also be set to None.</div>
  <div class="op-step">5. Future inserts should treat list as empty state.</div>
</div>

## Full Examples

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
from __future__ import annotations
from dataclasses import dataclass
from typing import Optional

@dataclass
class Node:
    value: int
    prev: Optional["Node"] = None
    next: Optional["Node"] = None

class DoublyLinkedList:
    def __init__(self) -> None:
        self.head: Optional[Node] = None
        self.tail: Optional[Node] = None

    def push_back(self, value: int) -> None:
        node = Node(value=value)
        if self.tail is None:
            self.head = self.tail = node
            return
        node.prev = self.tail
        self.tail.next = node
        self.tail = node

    def delete(self, value: int) -> bool:
        cur = self.head
        while cur is not None and cur.value != value:
            cur = cur.next
        if cur is None:
            return False

        if cur.prev:
            cur.prev.next = cur.next
        else:
            self.head = cur.next

        if cur.next:
            cur.next.prev = cur.prev
        else:
            self.tail = cur.prev

        return True

    def to_list(self) -> list[int]:
        out: list[int] = []
        cur = self.head
        while cur:
            out.append(cur.value)
            cur = cur.next
        return out

dll = DoublyLinkedList()
for x in [5, 11, 29]:
    dll.push_back(x)
_ = dll.delete(11)
print(dll.to_list())  # [5, 29]
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use std::collections::LinkedList;

fn main() {
    // In production Rust, prefer the standard LinkedList when you need a doubly-linked list.
    // Manual mutable-node implementations are possible but involve complex ownership patterns.
    let mut dll = LinkedList::new();
    dll.push_back(5);
    dll.push_back(11);
    dll.push_back(29);

    // Remove first match of 11.
    let mut filtered = LinkedList::new();
    let mut removed = false;
    while let Some(v) = dll.pop_front() {
        if v == 11 && !removed {
            removed = true;
            continue;
        }
        filtered.push_back(v);
    }

    println!("{:?}", filtered);
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

type Node struct {
    Value int
    Prev  *Node
    Next  *Node
}

type DoublyLinkedList struct {
    Head *Node
    Tail *Node
}

func (l *DoublyLinkedList) PushBack(value int) {
    n := &Node{Value: value}
    if l.Tail == nil {
        l.Head, l.Tail = n, n
        return
    }
    n.Prev = l.Tail
    l.Tail.Next = n
    l.Tail = n
}

func (l *DoublyLinkedList) Delete(value int) bool {
    cur := l.Head
    for cur != nil && cur.Value != value {
        cur = cur.Next
    }
    if cur == nil {
        return false
    }

    if cur.Prev != nil {
        cur.Prev.Next = cur.Next
    } else {
        l.Head = cur.Next
    }

    if cur.Next != nil {
        cur.Next.Prev = cur.Prev
    } else {
        l.Tail = cur.Prev
    }

    return true
}

func (l *DoublyLinkedList) ToSlice() []int {
    out := []int{}
    for cur := l.Head; cur != nil; cur = cur.Next {
        out = append(out, cur.Value)
    }
    return out
}

func main() {
    dll := &DoublyLinkedList{}
    dll.PushBack(5)
    dll.PushBack(11)
    dll.PushBack(29)
    _ = dll.Delete(11)
    fmt.Println(dll.ToSlice()) // [5 29]
}
```

</div>
</div>
