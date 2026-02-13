---
title: K-D Tree
description: Space-partitioning binary tree for k-dimensional points and nearest-neighbor search.
---

## Basic Explanation

A K-D tree is a binary tree over points in k dimensions.

At depth `d`, split by axis `d mod k`.

For 2D points:

- depth 0 split by x
- depth 1 split by y
- depth 2 split by x
- and so on

## Big Picture

K-D tree is a BST-like structure for multi-dimensional keys.

- BST splits 1D numbers by one axis.
- K-D tree rotates split axis by depth (`x`, then `y`, then `x`, ... for 2D).

This enables efficient geometric queries such as nearest-neighbor and range search.

## Pros

- Efficient average-case nearest-neighbor and range queries.
- Natural for low-to-moderate dimensional geometric data.
- Reuses tree-style recursive search intuition.

## Cons

- Performance degrades in high dimensions (curse of dimensionality).
- Can become unbalanced based on insertion order.
- Exact balancing/rebuild strategies add implementation complexity.

## Use Cases

- 2D/3D spatial indexing
- Nearest facility lookup (stores, sensors, stations)
- Geometric search in games/robotics
- Candidate pruning before expensive distance calculations

## Detailed Explanation

### Complexity (balanced expected)

| Operation | Time | Space |
| --- | --- | --- |
| Insert | O(log n) expected | O(1) extra |
| Search exact point | O(log n) expected | O(1) |
| Nearest neighbor | O(log n) average, O(n) worst | O(h) recursion stack |

## Operations Step-by-Step

### Insert (2D)

1. Start at root, depth `0` (axis `x`).
2. Compare point on current axis.
3. Move left/right based on comparison.
4. Increase depth, switch axis (`x <-> y`).
5. Insert at null child.

### Exact Search

Same path logic as insert:

1. Compare target with node on split axis.
2. Descend to side where target would live.
3. Repeat with alternating axis until found/null.

### Nearest Neighbor

1. Follow normal descent to likely region (`near` side).
2. Track best point found so far.
3. On unwind, compute distance from target to split plane.
4. Explore `far` side only if plane distance can beat current best.

That pruning step is where K-D trees gain speed.

## How All Pieces Fit Together

- Axis schedule by depth partitions space recursively.
- Tree navigation gives candidate region quickly.
- Backtracking + split-plane test decides whether alternate branches matter.

Nearest-neighbor is not just descent; it is descent plus selective backtracking.

## Edge Cases

1. High-dimensional feature vectors:
   Split-plane pruning becomes weak; performance can approach linear scan.
2. Repeated identical points:
   Insert policy must define left/right tie handling to avoid unstable structure.
3. Skewed insertion order:
   Sorted-like point insertion can produce tall, inefficient trees.
4. Floating-point precision:
   Very close distances can create unstable tie behavior without epsilon policy.
5. Empty tree nearest query:
   API should return explicit none/error instead of sentinel coordinates.

## Animated Operation Trace

<div class="operation-anim">
  <p class="operation-anim-title">Nearest Neighbor Query</p>
  <div class="op-step">1. Descend by split axes to near leaf region.</div>
  <div class="op-step">2. Update current best point distance.</div>
  <div class="op-step">3. Backtrack to parent split.</div>
  <div class="op-step">4. Check split-plane distance against best.</div>
  <div class="op-step">5. Visit far branch only if improvement is possible.</div>
</div>

<div class="operation-anim">
  <p class="operation-anim-title">Full Animation: Insert + Query Loop</p>
  <div class="op-step">1. Insert points while alternating axis by depth.</div>
  <div class="op-step">2. Query descends quickly into likely region.</div>
  <div class="op-step">3. Best candidate updated at visited nodes.</div>
  <div class="op-step">4. Split-plane test decides far-branch pruning.</div>
  <div class="op-step">5. Return nearest point with reduced search work.</div>
</div>

<div class="operation-anim">
  <p class="operation-anim-title">Edge-Case Animation: High-Dimension Pruning Collapse</p>
  <div class="op-step">1. Feature dimension grows large.</div>
  <div class="op-step">2. Split-plane checks prune fewer branches.</div>
  <div class="op-step">3. More far branches must be explored.</div>
  <div class="op-step">4. Runtime approaches linear scan behavior.</div>
  <div class="op-step">5. Consider approximate NN structures for high dimensions.</div>
</div>

### Illustration

```mermaid
graph TD
  A[(7,2) x-split] --> B[(5,4) y-split]
  A --> C[(9,6) y-split]
  B --> D[(2,3) x-split]
  B --> E[(4,7) x-split]
```

## Full Examples (2D insert + nearest)

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
from __future__ import annotations
from dataclasses import dataclass
from math import inf
from typing import Optional

Point = tuple[float, float]

@dataclass
class Node:
    p: Point
    left: Optional["Node"] = None
    right: Optional["Node"] = None

class KDTree2D:
    def __init__(self) -> None:
        self.root: Optional[Node] = None

    def insert(self, point: Point) -> None:
        def rec(node: Optional[Node], depth: int) -> Node:
            if node is None:
                return Node(point)
            axis = depth % 2
            if point[axis] < node.p[axis]:
                node.left = rec(node.left, depth + 1)
            else:
                node.right = rec(node.right, depth + 1)
            return node

        self.root = rec(self.root, 0)

    def nearest(self, target: Point) -> Point:
        best_point: Point = (inf, inf)
        best_dist2 = inf

        def dist2(a: Point, b: Point) -> float:
            dx = a[0] - b[0]
            dy = a[1] - b[1]
            return dx * dx + dy * dy

        def rec(node: Optional[Node], depth: int) -> None:
            nonlocal best_point, best_dist2
            if node is None:
                return

            d = dist2(node.p, target)
            if d < best_dist2:
                best_dist2 = d
                best_point = node.p

            axis = depth % 2
            near, far = (node.left, node.right) if target[axis] < node.p[axis] else (node.right, node.left)

            rec(near, depth + 1)
            if (target[axis] - node.p[axis]) ** 2 < best_dist2:
                rec(far, depth + 1)

        rec(self.root, 0)
        return best_point

kd = KDTree2D()
for p in [(7, 2), (5, 4), (9, 6), (2, 3), (4, 7), (8, 1)]:
    kd.insert(p)
print(kd.nearest((6, 3)))  # likely (7, 2) or (5, 4)
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
type Point = [f64; 2];

type Link = Option<Box<Node>>;

#[derive(Debug)]
struct Node {
    p: Point,
    left: Link,
    right: Link,
}

#[derive(Debug, Default)]
struct KdTree2D {
    root: Link,
}

fn dist2(a: Point, b: Point) -> f64 {
    let dx = a[0] - b[0];
    let dy = a[1] - b[1];
    dx * dx + dy * dy
}

impl KdTree2D {
    fn insert(&mut self, point: Point) {
        fn rec(node: &mut Link, point: Point, depth: usize) {
            match node {
                None => {
                    *node = Some(Box::new(Node {
                        p: point,
                        left: None,
                        right: None,
                    }))
                }
                Some(n) => {
                    let axis = depth % 2;
                    if point[axis] < n.p[axis] {
                        rec(&mut n.left, point, depth + 1);
                    } else {
                        rec(&mut n.right, point, depth + 1);
                    }
                }
            }
        }
        rec(&mut self.root, point, 0);
    }

    fn nearest(&self, target: Point) -> Point {
        fn rec(node: &Link, target: Point, depth: usize, best: &mut Point, best_d2: &mut f64) {
            if let Some(n) = node {
                let d = dist2(n.p, target);
                if d < *best_d2 {
                    *best_d2 = d;
                    *best = n.p;
                }

                let axis = depth % 2;
                let (near, far) = if target[axis] < n.p[axis] {
                    (&n.left, &n.right)
                } else {
                    (&n.right, &n.left)
                };

                rec(near, target, depth + 1, best, best_d2);
                let plane_d2 = (target[axis] - n.p[axis]).powi(2);
                if plane_d2 < *best_d2 {
                    rec(far, target, depth + 1, best, best_d2);
                }
            }
        }

        let mut best = [f64::INFINITY, f64::INFINITY];
        let mut best_d2 = f64::INFINITY;
        rec(&self.root, target, 0, &mut best, &mut best_d2);
        best
    }
}

fn main() {
    let mut kd = KdTree2D::default();
    for p in [[7.0, 2.0], [5.0, 4.0], [9.0, 6.0], [2.0, 3.0], [4.0, 7.0], [8.0, 1.0]] {
        kd.insert(p);
    }
    println!("{:?}", kd.nearest([6.0, 3.0]));
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "fmt"
    "math"
)

type Point [2]float64

type Node struct {
    P           Point
    Left, Right *Node
}

type KDTree2D struct {
    Root *Node
}

func (t *KDTree2D) Insert(point Point) {
    var rec func(node **Node, point Point, depth int)
    rec = func(node **Node, point Point, depth int) {
        if *node == nil {
            *node = &Node{P: point}
            return
        }
        axis := depth % 2
        if point[axis] < (*node).P[axis] {
            rec(&(*node).Left, point, depth+1)
        } else {
            rec(&(*node).Right, point, depth+1)
        }
    }
    rec(&t.Root, point, 0)
}

func dist2(a, b Point) float64 {
    dx := a[0] - b[0]
    dy := a[1] - b[1]
    return dx*dx + dy*dy
}

func (t *KDTree2D) Nearest(target Point) Point {
    best := Point{math.Inf(1), math.Inf(1)}
    bestD2 := math.Inf(1)

    var rec func(node *Node, depth int)
    rec = func(node *Node, depth int) {
        if node == nil {
            return
        }

        d := dist2(node.P, target)
        if d < bestD2 {
            bestD2 = d
            best = node.P
        }

        axis := depth % 2
        near, far := node.Left, node.Right
        if target[axis] >= node.P[axis] {
            near, far = node.Right, node.Left
        }

        rec(near, depth+1)
        planeD2 := (target[axis] - node.P[axis]) * (target[axis] - node.P[axis])
        if planeD2 < bestD2 {
            rec(far, depth+1)
        }
    }

    rec(t.Root, 0)
    return best
}

func main() {
    kd := &KDTree2D{}
    points := []Point{
        Point{7, 2},
        Point{5, 4},
        Point{9, 6},
        Point{2, 3},
        Point{4, 7},
        Point{8, 1},
    }
    for _, p := range points {
        kd.Insert(p)
    }
    fmt.Println(kd.Nearest(Point{6, 3}))
}
```

</div>
</div>
