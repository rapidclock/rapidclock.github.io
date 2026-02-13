---
title: Rust Frameworks
description: Deep dives into async runtime, web stack, HTTP, serialization, synchronization, and parallel processing in Rust.
permalink: /languages/frameworks/rust/
---

## Big Picture

Rust framework choice is mostly about execution model:

- async runtime and IO scheduling: `tokio`
- web stack layering: `tower` + `axum`
- outbound HTTP: `reqwest`
- data encoding/decoding: `serde`, `serde_json`
- error architecture: `thiserror` + `anyhow`
- synchronization primitives: `parking_lot`
- CPU parallelism: `rayon`

## Framework Deep Dives

- [Tokio]({{ '/languages/frameworks/rust/tokio/' | relative_url }})
- [Tower + Axum]({{ '/languages/frameworks/rust/tower-axum/' | relative_url }})
- [Reqwest]({{ '/languages/frameworks/rust/reqwest/' | relative_url }})
- [Serde + Serde JSON]({{ '/languages/frameworks/rust/serde-serde-json/' | relative_url }})
- [anyhow + thiserror]({{ '/languages/frameworks/rust/anyhow-thiserror/' | relative_url }})
- [parking_lot]({{ '/languages/frameworks/rust/parking-lot/' | relative_url }})
- [Rayon]({{ '/languages/frameworks/rust/rayon/' | relative_url }})

## Quick Selection

| Need | Strong first choice |
| --- | --- |
| async networked service | `tokio` + `axum` |
| middleware-heavy service | `tower` |
| HTTP client with async support | `reqwest` |
| robust typed serialization | `serde` |
| typed domain errors + ergonomic app boundary errors | `thiserror` + `anyhow` |
| lower-overhead locks | `parking_lot` |
| data-parallel CPU workloads | `rayon` |

## Documentation Links

- Tokio: [docs.rs/tokio](https://docs.rs/tokio/latest/tokio/)
- Tower: [docs.rs/tower](https://docs.rs/tower/latest/tower/)
- Axum: [docs.rs/axum](https://docs.rs/axum/latest/axum/)
- Reqwest: [docs.rs/reqwest](https://docs.rs/reqwest/latest/reqwest/)
- Serde: [serde.rs](https://serde.rs/)
- Serde JSON: [docs.rs/serde_json](https://docs.rs/serde_json/latest/serde_json/)
- thiserror: [docs.rs/thiserror](https://docs.rs/thiserror/latest/thiserror/)
- anyhow: [docs.rs/anyhow](https://docs.rs/anyhow/latest/anyhow/)
- parking_lot: [docs.rs/parking_lot](https://docs.rs/parking_lot/latest/parking_lot/)
- Rayon: [docs.rs/rayon](https://docs.rs/rayon/latest/rayon/)

## Architecture Playbooks

### High-concurrency API service

- runtime: `tokio`
- server stack: `axum` + `tower`
- outbound HTTP: `reqwest`
- payload contracts: `serde` / `serde_json`

### CPU-heavy analytics service

- data parallelism: `rayon`
- synchronization only where needed: `parking_lot` primitives
- async only at IO boundaries, not for core CPU loops

## Operational Guidance

1. Separate IO-bound async stages and CPU-bound parallel stages explicitly.
2. Establish cancellation contract (what gets cleaned up, what retries).
3. Keep serialization models versioned and backward-compatible.
4. Benchmark lock contention before introducing advanced synchronization primitives.

## Detailed Selection Guide

| Problem | First choice | Why | Watch for |
| --- | --- | --- | --- |
| high-concurrency HTTP API | `tokio` + `axum` + `tower` | strong async + typed handlers + middleware | cancellation and backpressure complexity |
| outbound HTTP integrations | `reqwest` | mature client with good builder controls | per-request client construction |
| strict schema boundaries | `serde` + `serde_json` | compile-time models, rich attributes | schema evolution without versioning |
| consistent error contracts in libraries and easy boundary propagation | `thiserror` + `anyhow` | explicit internals + ergonomic top-level handling | converting to opaque errors too early |
| lock-heavy shared state | `parking_lot` | ergonomic, low-overhead locks | lock scope creep and deadlocks |
| CPU-parallel data transforms | `rayon` | easy data parallelism on iterators | oversubscription or tiny-task overhead |

## Service Composition Patterns

### Async API service baseline

- runtime: Tokio
- HTTP layer: Axum router
- middleware: Tower layers for tracing/auth/rate limits
- contracts: Serde models (request/response + internal DTOs)
- outbound dependencies: shared Reqwest client

### Hybrid IO + CPU pipeline

- stage 1 IO ingestion on Tokio tasks
- stage 2 CPU-heavy transforms with Rayon
- stage 3 persistence or outbound publishing
- avoid mixing blocking CPU loops directly into Tokio tasks

### Shared state strategy

- prefer ownership + channels first
- if shared mutable state is required:
  - sharded locks (`parking_lot`) for write-heavy maps
  - read/write lock for read-mostly config/state

## Design Review Checklist (Rust Track)

1. Is task cancellation behavior defined for each spawned task?
2. Are all external calls bounded by timeout and error classification?
3. Does serialization model include compatibility/versioning strategy?
4. Is lock ordering documented where multiple locks can be held?
5. For parallel workloads, has sequential baseline been benchmarked first?

## Testing and Verification Pattern

- unit tests: pure domain logic + serde validation helpers
- integration tests: axum router, middleware behavior, reqwest clients
- load tests: saturation at p95/p99 to reveal lock/channel bottlenecks
- failure tests: cancellation, timeout, partial dependency outage scenarios

## Upgrade Guidance

- Align ecosystem versions (`tokio`, `tower`, `axum`) before major upgrades.
- Re-run compatibility tests for serde models when changing field names/defaults.
- Re-benchmark lock and parallel hot paths after runtime or compiler upgrades.
