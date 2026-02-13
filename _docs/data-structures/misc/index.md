---
title: Misc
description: Specialized structures that do not fit only list/tree/graph categories but solve high-value workloads.
permalink: /data-structures/misc/
---

## Scope

This section holds practical structures that are often used with graph algorithms, dynamic connectivity, and systems tooling.

## Subtopics

- [Union-Find (Disjoint Set Union)]({{ '/data-structures/misc/union-find/' | relative_url }})

## Selection Guidance

Use these structures when classic list/tree/graph primitives are not enough by themselves for the required operation guarantees.

| Problem shape | Good fit |
| --- | --- |
| dynamic connectivity (same component?) | Union-Find |
| repeated component merges | Union-Find |

## Engineering Reminder

Even compact structures need explicit invariants, edge-case tests, and complexity-aware API design.
