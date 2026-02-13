---
title: Traversals (BFS, DFS)
description: Graph exploration strategies for reachability, layering, and search.
---

## Basic Explanation

- BFS explores graph by distance layers from start (queue).
- DFS explores as deep as possible before backtracking (stack/recursion).

## Detailed Explanation

### When To Use

- BFS: shortest path in unweighted graphs, level-order exploration.
- DFS: cycle detection, topological ideas, component exploration.

### Complexity

For adjacency list with `V` vertices and `E` edges:

| Algorithm | Time | Space |
| --- | --- | --- |
| BFS | O(V + E) | O(V) |
| DFS | O(V + E) | O(V) |

## Edge Cases

1. Disconnected graph:
   Starting from one node visits only one connected component. Loop over all nodes for full traversal.
2. Cycles:
   Missing `seen/visited` checks causes infinite loops or recursion blow-up.
3. Deep graph recursion (DFS):
   Recursive DFS may overflow call stack; iterative DFS with explicit stack is safer.
4. Directed vs undirected interpretation:
   Traversal result differs substantially depending on edge direction semantics.
5. Missing adjacency entries:
   If a node appears only as a neighbor and not as a key, traversal code should handle default empty neighbors.

## Animated Walkthroughs

<div class="operation-anim">
  <p class="operation-anim-title">Part Animation: BFS Layer Expansion</p>
  <div class="op-step">1. Queue begins with start node.</div>
  <div class="op-step">2. Pop front node and mark it visited in order.</div>
  <div class="op-step">3. Enqueue unseen neighbors.</div>
  <div class="op-step">4. Repeat queue pop/push per frontier layer.</div>
  <div class="op-step">5. Finish when queue is empty.</div>
</div>

<div class="operation-anim">
  <p class="operation-anim-title">Part Animation: DFS Backtracking</p>
  <div class="op-step">1. Descend along first unvisited neighbor path.</div>
  <div class="op-step">2. Continue until dead end reached.</div>
  <div class="op-step">3. Backtrack to most recent node with choices.</div>
  <div class="op-step">4. Explore next unvisited branch.</div>
  <div class="op-step">5. End when all reachable nodes visited.</div>
</div>

<div class="operation-anim">
  <p class="operation-anim-title">Edge-Case Animation: Missing Visited Guard</p>
  <div class="op-step">1. Traversal enters a cycle edge.</div>
  <div class="op-step">2. Without visited tracking, node is re-enqueued/recalled.</div>
  <div class="op-step">3. Loop repeats indefinitely.</div>
  <div class="op-step">4. Add visited set check before pushing/recursing.</div>
  <div class="op-step">5. Traversal terminates with each node processed once.</div>
</div>

## Illustration

```mermaid
graph LR
  A((A)) --> B((B))
  A --> C((C))
  B --> D((D))
  C --> E((E))
  D --> F((F))
  E --> F
```

## Full Examples

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
from collections import deque

graph = {
    "A": ["B", "C"],
    "B": ["D"],
    "C": ["E"],
    "D": ["F"],
    "E": ["F"],
    "F": [],
}

def bfs(start: str) -> list[str]:
    q = deque([start])
    seen = {start}
    order: list[str] = []

    while q:
        u = q.popleft()
        order.append(u)
        for v in graph[u]:
            if v not in seen:
                seen.add(v)
                q.append(v)
    return order

def dfs(start: str) -> list[str]:
    order: list[str] = []
    seen: set[str] = set()

    def rec(u: str) -> None:
        seen.add(u)
        order.append(u)
        for v in graph[u]:
            if v not in seen:
                rec(v)

    rec(start)
    return order

print(bfs("A"))
print(dfs("A"))
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use std::collections::{HashMap, HashSet, VecDeque};

fn bfs(graph: &HashMap<&str, Vec<&str>>, start: &str) -> Vec<String> {
    let mut q = VecDeque::new();
    let mut seen = HashSet::new();
    let mut order = Vec::new();

    q.push_back(start);
    seen.insert(start);

    while let Some(u) = q.pop_front() {
        order.push(u.to_string());
        if let Some(neighbors) = graph.get(u) {
            for &v in neighbors {
                if seen.insert(v) {
                    q.push_back(v);
                }
            }
        }
    }

    order
}

fn dfs(graph: &HashMap<&str, Vec<&str>>, start: &str) -> Vec<String> {
    fn rec(
        graph: &HashMap<&str, Vec<&str>>,
        u: &str,
        seen: &mut HashSet<String>,
        order: &mut Vec<String>,
    ) {
        seen.insert(u.to_string());
        order.push(u.to_string());
        if let Some(neighbors) = graph.get(u) {
            for &v in neighbors {
                if !seen.contains(v) {
                    rec(graph, v, seen, order);
                }
            }
        }
    }

    let mut seen = HashSet::new();
    let mut order = Vec::new();
    rec(graph, start, &mut seen, &mut order);
    order
}

fn main() {
    let graph: HashMap<&str, Vec<&str>> = HashMap::from([
        ("A", vec!["B", "C"]),
        ("B", vec!["D"]),
        ("C", vec!["E"]),
        ("D", vec!["F"]),
        ("E", vec!["F"]),
        ("F", vec![]),
    ]);

    println!("{:?}", bfs(&graph, "A"));
    println!("{:?}", dfs(&graph, "A"));
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

func bfs(graph map[string][]string, start string) []string {
    q := []string{start}
    seen := map[string]bool{start: true}
    order := []string{}

    for len(q) > 0 {
        u := q[0]
        q = q[1:]
        order = append(order, u)
        for _, v := range graph[u] {
            if !seen[v] {
                seen[v] = true
                q = append(q, v)
            }
        }
    }
    return order
}

func dfs(graph map[string][]string, start string) []string {
    order := []string{}
    seen := map[string]bool{}

    var rec func(u string)
    rec = func(u string) {
        seen[u] = true
        order = append(order, u)
        for _, v := range graph[u] {
            if !seen[v] {
                rec(v)
            }
        }
    }

    rec(start)
    return order
}

func main() {
    graph := map[string][]string{
        "A": {"B", "C"},
        "B": {"D"},
        "C": {"E"},
        "D": {"F"},
        "E": {"F"},
        "F": {},
    }

    fmt.Println(bfs(graph, "A"))
    fmt.Println(dfs(graph, "A"))
}
```

</div>
</div>

## Advanced Cookbook Additions

### Traversal Strategy Matrix

| Constraint | Prefer | Reason |
| --- | --- | --- |
| shortest edge-count path in unweighted graph | BFS | explores by distance layers |
| deep structural exploration / cycle checks | DFS | natural recursion/stack model |
| very deep graph where recursion depth is risky | iterative DFS/BFS | avoids call-stack overflow |

### Production Debugging Pattern

When traversal output looks wrong:

1. log queue/stack state per step for tiny failing graph
2. log visited set mutations
3. verify adjacency construction first (wrong graph model is common)
4. confirm directed-vs-undirected edge insertion policy

### Complexity Reality

Even with `O(V+E)` asymptotics, constants are dominated by:

- adjacency representation choice
- memory locality
- repeated allocation of temporary collections

For hot paths, pre-size and reuse work buffers.
