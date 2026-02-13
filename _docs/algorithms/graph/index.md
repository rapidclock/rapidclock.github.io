---
title: Graph
description: Traversal and shortest-path foundations.
permalink: /algorithms/graph/
---

## Subtopics

- [Traversals (BFS, DFS)]({{ '/algorithms/graph/traversals-bfs-dfs/' | relative_url }})
- [Dijkstra]({{ '/algorithms/graph/dijkstra/' | relative_url }})
- [Topological Sort]({{ '/algorithms/graph/topological-sort/' | relative_url }})

## Graph Algorithm Selection Matrix

| Goal | First algorithm | Preconditions |
| --- | --- | --- |
| reachability / layer exploration | BFS | graph may be directed/undirected; unweighted distances |
| depth exploration / component discovery | DFS | recursion depth or explicit stack needed |
| shortest path with non-negative weights | Dijkstra | all edge weights >= 0 |
| dependency ordering | Topological sort | graph must be DAG |

## Modeling Checklist

1. Directed or undirected edges?
2. Weighted or unweighted?
3. Sparse or dense graph representation?
4. Need full traversal or single-source query?

## Production Pitfalls

1. Missing visited guards in cyclic graphs.
2. Using Dijkstra on negative-weight edges.
3. Assuming topological order exists without cycle detection.
4. Building adjacency matrix for sparse graphs and wasting memory.

## Testing Strategy

- tiny hand-checkable graphs
- disconnected graphs
- cyclic graphs
- adversarial edge weights and duplicate edges
