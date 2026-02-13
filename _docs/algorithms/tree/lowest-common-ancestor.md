---
title: Lowest Common Ancestor
description: Find the deepest common ancestor of two nodes.
---

## Basic Explanation

Lowest Common Ancestor (LCA) of nodes `p` and `q` is the deepest node that is ancestor of both.

This page shows the BST version, which is simpler and efficient.

## Detailed Explanation

### BST Property Shortcut

At node `x`:

- if `p` and `q` are both smaller than `x`, move left
- if both larger, move right
- otherwise, `x` is the split point and LCA

### Complexity

| Metric | Value |
| --- | --- |
| Time | O(h) |
| Space | O(1) iterative |

For balanced BST, `h = O(log n)`; for skewed BST, `h = O(n)`.

## Edge Cases

1. One node is ancestor of the other:
   The ancestor node itself is the LCA and should be returned immediately at split condition.
2. `p == q`:
   LCA is that same node (if present in tree).
3. One or both keys absent:
   Basic BST shortcut logic may still return a split node even when a key is missing; validate key existence when required by API contract.
4. Skewed BST:
   Runtime can degrade to O(n), matching linked-list-like height.
5. Root as LCA:
   Very common when keys fall into different root subtrees; this is expected behavior, not a special error path.

## Pseudocode

```text
cur = root
while cur != null:
  if p < cur and q < cur: cur = cur.left
  else if p > cur and q > cur: cur = cur.right
  else: return cur
```

## Full Examples

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class Node:
    key: int
    left: Optional["Node"] = None
    right: Optional["Node"] = None

def lca_bst(root: Optional[Node], p: int, q: int) -> Optional[Node]:
    cur = root
    while cur is not None:
        if p < cur.key and q < cur.key:
            cur = cur.left
        elif p > cur.key and q > cur.key:
            cur = cur.right
        else:
            return cur
    return None

root = Node(20,
    left=Node(10, Node(5), Node(14)),
    right=Node(30, Node(25), Node(35)),
)

ans = lca_bst(root, 5, 14)
print(ans.key if ans else None)  # 10
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
#[derive(Debug)]
struct Node {
    key: i32,
    left: Option<Box<Node>>,
    right: Option<Box<Node>>,
}

fn lca_bst(root: &Option<Box<Node>>, p: i32, q: i32) -> Option<i32> {
    let mut cur = root.as_ref();
    while let Some(n) = cur {
        if p < n.key && q < n.key {
            cur = n.left.as_ref();
        } else if p > n.key && q > n.key {
            cur = n.right.as_ref();
        } else {
            return Some(n.key);
        }
    }
    None
}

fn main() {
    let root = Some(Box::new(Node {
        key: 20,
        left: Some(Box::new(Node {
            key: 10,
            left: Some(Box::new(Node { key: 5, left: None, right: None })),
            right: Some(Box::new(Node { key: 14, left: None, right: None })),
        })),
        right: Some(Box::new(Node {
            key: 30,
            left: Some(Box::new(Node { key: 25, left: None, right: None })),
            right: Some(Box::new(Node { key: 35, left: None, right: None })),
        })),
    }));

    println!("{:?}", lca_bst(&root, 5, 14)); // Some(10)
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

type Node struct {
    Key         int
    Left, Right *Node
}

func lcaBST(root *Node, p, q int) *Node {
    cur := root
    for cur != nil {
        if p < cur.Key && q < cur.Key {
            cur = cur.Left
        } else if p > cur.Key && q > cur.Key {
            cur = cur.Right
        } else {
            return cur
        }
    }
    return nil
}

func main() {
    root := &Node{20,
        &Node{10, &Node{5, nil, nil}, &Node{14, nil, nil}},
        &Node{30, &Node{25, nil, nil}, &Node{35, nil, nil}},
    }

    ans := lcaBST(root, 5, 14)
    fmt.Println(ans.Key) // 10
}
```

</div>
</div>
