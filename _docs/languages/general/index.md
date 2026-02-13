---
title: General
description: Cross-language foundations and guidance that apply across Python, Rust, and Go.
permalink: /languages/general/
---

## Scope

This section captures language-agnostic engineering guidance and cross-language comparisons.

## Subtopics

- [Detailed Concurrency]({{ '/languages/general/detailed-concurrency/' | relative_url }})
- [Async IO]({{ '/languages/general/async-io/' | relative_url }})
- [Logging]({{ '/languages/general/logging/' | relative_url }})

## Why This Exists

When learning three languages at once, it helps to first understand the shared concepts:

- thread vs task
- shared-memory vs message-passing
- blocking vs async
- coordination primitives (mutex, channel, semaphore, condition variable)

## Concept Map

This section is the bridge between theory and implementation decisions.

Use it to answer questions like:

- Should this workflow be threads, async tasks, or processes?
- Where should backpressure be enforced?
- What cancellation semantics are safe for this operation?
- Which primitives are correct for this workload shape?

## Decision Guide

| Situation | Best first model | Why |
| --- | --- | --- |
| IO-heavy service with thousands of concurrent sockets | async IO | avoids thread-per-connection overhead |
| CPU-heavy batch processing | worker/process pool or parallel runtime | async alone will not speed CPU-bound work |
| Small internal tool with limited concurrency | synchronous + bounded threads | lower complexity, easier debugging |
| Mixed IO + CPU stages | staged pipeline (async ingress + bounded CPU workers) | explicit separation avoids runtime contention |

## Reliability Checklist

1. Define explicit timeout budgets at every external boundary.
2. Make cancellation behavior explicit (safe to retry? partial side effects?).
3. Bound queues/channels to prevent unbounded memory growth.
4. Distinguish transient vs permanent failures for retries.
5. Instrument queue depth, latency percentiles, and error classes.

## How To Read Subtopics

- Start with [Detailed Concurrency]({{ '/languages/general/detailed-concurrency/' | relative_url }}) for model-level understanding and primitive choices.
- Then read [Async IO]({{ '/languages/general/async-io/' | relative_url }}) for runtime behavior, task lifecycle, and production caveats in each language.
- Use [Logging]({{ '/languages/general/logging/' | relative_url }}) to standardize observability, filtering, and multi-destination log routing.

## Anti-Patterns

1. Using async for CPU-heavy loops and expecting throughput gain.
2. Spawning unbounded tasks/goroutines/threads without admission control.
3. Relying on defaults for timeout/retry behavior.
4. Mixing blocking calls into async hot paths without isolation.
