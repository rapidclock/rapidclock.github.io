---
title: Singly Linked List
description: One-direction node chain with O(1) head insertion and sequential traversal.
---

## Basic Explanation

A singly linked list stores each element in a node with:

- the value
- a pointer/reference to the next node

You only move forward. There is no direct backward traversal.

## Big Picture

Think of a singly linked list as a chain of boxes where each box tells you where the next box is.

- This is great when the list size changes often and you mostly insert/remove near the front.
- This is weak when you need fast "jump to index `i`" access.

Compared to dynamic arrays:

- linked list wins at `push_front` (O(1) vs O(n))
- dynamic array wins at indexing (O(1) vs O(n))

## Detailed Explanation

### Invariant

For every node `n`, `n.next` is either another valid node or `null`/`None` (end of list).

### Complexity

| Operation | Time | Space |
| --- | --- | --- |
| Access by index | O(n) | O(1) |
| Search by value | O(n) | O(1) |
| Insert at head | O(1) | O(1) |
| Insert at tail (with tail pointer) | O(1) | O(1) |
| Insert at tail (no tail pointer) | O(n) | O(1) |
| Delete head | O(1) | O(1) |

### When To Use

- Frequent head insertion/deletion
- Unknown final size while building a stream
- You do not need random access

## Pros

- O(1) insertion at head.
- Simple node model and easy incremental growth.
- No expensive element shifting like middle insertions in arrays.

## Cons

- O(n) index-based access.
- One-way traversal only.
- Extra memory overhead per element for pointer/reference storage.

## Use Cases

- Implementing stacks/queues (especially head-focused operations).
- Maintaining streams where size changes frequently.
- Educational foundation for pointer-based structures.

## Step-by-Step Mechanics

### Insert At Head (`push_front`)

1. Create a new node with your value.
2. Point `new_node.next` to current `head`.
3. Move `head` to `new_node`.

No existing node needs to move in memory.

### Append At Tail (without tail pointer)

1. Start at `head`.
2. Walk until `current.next` is `None`.
3. Set `current.next` to new node.

The walk is why append is O(n) unless you maintain a `tail` pointer.

### Search

1. Start at `head`.
2. Compare node value with target.
3. Move to `next` until found or end of list.

## How The Pieces Fit Together

You only need one structure invariant for correctness:

- every `next` pointer either points to a valid node or end (`None`/`null`)

Because of this invariant:

- traversal always terminates at end
- insertion/deletion can be reasoned about as local pointer rewrites
- no array resizing or element shifting is required

## Worked Walkthrough

Start with empty list.

1. `push_front(20)` -> `20 -> None`
2. `push_front(12)` -> `12 -> 20 -> None`
3. `append(35)` -> `12 -> 20 -> 35 -> None`
4. `find(20)` walks nodes `12`, then `20`, returns `True`

## Edge Cases

1. Empty list operations:
   `append`, `find`, and delete-style operations must handle `head = None` safely.
2. Single-node list transitions:
   Removing the only node must reset `head` correctly; otherwise stale references remain.
3. Cycles introduced accidentally:
   A bug that points `next` backward creates infinite traversal loops.
4. Duplicate values:
   `find` and delete-by-value APIs must define whether they affect first match or all matches.
5. Tail-heavy workloads without a tail pointer:
   Repeated append becomes O(n^2) total over many insertions.

### Illustration

```mermaid
graph LR
  A[Head] --> B[7]
  B --> C[12]
  C --> D[20]
  D --> E[None]
```

## Pseudocode (Insert At Head)

```text
function push_front(head, value):
    new_node = Node(value)
    new_node.next = head
    return new_node
```

## Animated Walkthroughs

<div class="operation-anim">
  <p class="operation-anim-title">Part Animation: Push Front Pointer Rewrite</p>
  <div class="op-step">1. Allocate new node with value.</div>
  <div class="op-step">2. Copy old head reference into new_node.next.</div>
  <div class="op-step">3. Move head to new node.</div>
  <div class="op-step">4. Verify chain still ends at None.</div>
  <div class="op-step">5. Operation completes in O(1).</div>
</div>

<div class="operation-anim">
  <p class="operation-anim-title">Full Animation: Build + Search Flow</p>
  <div class="op-step">1. Start with empty head.</div>
  <div class="op-step">2. Push front values and append tail values.</div>
  <div class="op-step">3. Traverse node-by-node for target lookup.</div>
  <div class="op-step">4. Stop on first match or list end.</div>
  <div class="op-step">5. Return found/not-found result.</div>
</div>

<div class="operation-anim">
  <p class="operation-anim-title">Edge-Case Animation: Accidental Cycle Bug</p>
  <div class="op-step">1. Buggy code points tail.next back to a previous node.</div>
  <div class="op-step">2. Traversal enters loop and never reaches None.</div>
  <div class="op-step">3. CPU time grows while output repeats nodes.</div>
  <div class="op-step">4. Add visited guard or cycle detection in debug checks.</div>
  <div class="op-step">5. Fix pointer assignment to restore terminating chain.</div>
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
    next: Optional["Node"] = None

class SinglyLinkedList:
    def __init__(self) -> None:
        self.head: Optional[Node] = None

    def push_front(self, value: int) -> None:
        # O(1): new node becomes head.
        self.head = Node(value=value, next=self.head)

    def append(self, value: int) -> None:
        # O(n): traverse to tail.
        node = Node(value)
        if self.head is None:
            self.head = node
            return
        cur = self.head
        while cur.next is not None:
            cur = cur.next
        cur.next = node

    def find(self, target: int) -> bool:
        cur = self.head
        while cur is not None:
            if cur.value == target:
                return True
            cur = cur.next
        return False

    def to_list(self) -> list[int]:
        out: list[int] = []
        cur = self.head
        while cur is not None:
            out.append(cur.value)
            cur = cur.next
        return out

sll = SinglyLinkedList()
sll.push_front(20)
sll.push_front(12)
sll.append(35)
print(sll.to_list())        # [12, 20, 35]
print(sll.find(20))         # True
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
#[derive(Debug)]
struct Node {
    value: i32,
    next: Option<Box<Node>>,
}

#[derive(Debug, Default)]
struct SinglyLinkedList {
    head: Option<Box<Node>>,
}

impl SinglyLinkedList {
    fn push_front(&mut self, value: i32) {
        // O(1): current head becomes next.
        let new_node = Box::new(Node {
            value,
            next: self.head.take(),
        });
        self.head = Some(new_node);
    }

    fn append(&mut self, value: i32) {
        // O(n): walk until tail.
        let new_node = Box::new(Node { value, next: None });
        match self.head.as_mut() {
            None => self.head = Some(new_node),
            Some(mut current) => {
                while current.next.is_some() {
                    current = current.next.as_mut().expect("next exists");
                }
                current.next = Some(new_node);
            }
        }
    }

    fn find(&self, target: i32) -> bool {
        let mut current = self.head.as_ref();
        while let Some(node) = current {
            if node.value == target {
                return true;
            }
            current = node.next.as_ref();
        }
        false
    }

    fn to_vec(&self) -> Vec<i32> {
        let mut out = Vec::new();
        let mut current = self.head.as_ref();
        while let Some(node) = current {
            out.push(node.value);
            current = node.next.as_ref();
        }
        out
    }
}

fn main() {
    let mut sll = SinglyLinkedList::default();
    sll.push_front(20);
    sll.push_front(12);
    sll.append(35);

    println!("{:?}", sll.to_vec()); // [12, 20, 35]
    println!("{}", sll.find(20));   // true
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

type Node struct {
    Value int
    Next  *Node
}

type SinglyLinkedList struct {
    Head *Node
}

func (l *SinglyLinkedList) PushFront(value int) {
    // O(1)
    l.Head = &Node{Value: value, Next: l.Head}
}

func (l *SinglyLinkedList) Append(value int) {
    node := &Node{Value: value}
    if l.Head == nil {
        l.Head = node
        return
    }
    cur := l.Head
    for cur.Next != nil {
        cur = cur.Next
    }
    cur.Next = node
}

func (l *SinglyLinkedList) Find(target int) bool {
    for cur := l.Head; cur != nil; cur = cur.Next {
        if cur.Value == target {
            return true
        }
    }
    return false
}

func (l *SinglyLinkedList) ToSlice() []int {
    out := []int{}
    for cur := l.Head; cur != nil; cur = cur.Next {
        out = append(out, cur.Value)
    }
    return out
}

func main() {
    list := &SinglyLinkedList{}
    list.PushFront(20)
    list.PushFront(12)
    list.Append(35)

    fmt.Println(list.ToSlice()) // [12 20 35]
    fmt.Println(list.Find(20))  // true
}
```

</div>
</div>
