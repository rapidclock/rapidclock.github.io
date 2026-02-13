---
title: Frameworks
description: Practical deep dives into high-value Python, Rust, and Go frameworks with production tradeoffs.
permalink: /languages/frameworks/
---

## Scope

This section focuses on frameworks and major ecosystem libraries that are used heavily in production.

The goal is practical selection and usage:

- what each framework is best at
- where it breaks down
- how to structure code around it safely
- edge cases and operational pitfalls

## Language Tracks

- [Python Frameworks]({{ '/languages/frameworks/python/' | relative_url }})
- [Rust Frameworks]({{ '/languages/frameworks/rust/' | relative_url }})
- [Go Frameworks]({{ '/languages/frameworks/go/' | relative_url }})

## How To Use This Section

1. Start from the language page.
2. Pick one framework page that matches your current problem.
3. Read the tradeoffs and edge cases before implementation.
4. Use examples as baseline templates, not final architecture.

## Deep Dive Usage Model

Use this frameworks section like an operations handbook, not a list of libraries:

1. Start with workload shape (API, analytics, batch, orchestration).
2. Pick framework based on bottleneck (latency, throughput, schema safety, dev speed).
3. Read anti-patterns first to avoid expensive rewrites.
4. Adopt baseline checklists before shipping.

## Selection Lens

| Lens | Questions to ask before choosing framework |
| --- | --- |
| Runtime model | Is workload IO-bound, CPU-bound, or mixed? |
| Failure model | How are timeouts, retries, partial failures handled? |
| Contract model | Are data/API contracts validated and versioned? |
| Team fit | Does team already have production experience with this stack? |
| Operability | Can this stack be debugged and observed easily in prod? |

## Universal Production Checklist

1. Define timeout + retry policy explicitly.
2. Add structured logs around all external boundaries.
3. Set concurrency limits and backpressure strategy.
4. Validate all untrusted input at boundaries.
5. Add test split: unit + integration + contract tests.
6. Capture p95/p99 latency and error budget metrics before launch.

## Decision Matrix (Detailed)

| Workload shape | Recommended first stack | Why | Common failure mode | Mitigation |
| --- | --- | --- | --- | --- |
| CRUD API with moderate traffic | FastAPI or Gin/Echo or Axum | Fast delivery + clean HTTP abstraction | inconsistent timeout/error policies | define one shared policy module and apply everywhere |
| High-concurrency API gateway | Axum + Tower + Tokio | strong middleware control + async ecosystem | unbounded fan-out and backpressure gaps | enforce bounded concurrency and request budgets |
| Data-heavy batch/ETL | Pandas + NumPy/SciPy | rich transforms + numerical tooling | memory blowups from naive loading | chunking + schema checks + staged outputs |
| Remote fleet automation | AsyncSSH + HTTPX | async orchestration across many hosts/services | connection storms and partial-failure chaos | host batching, semaphore limits, per-host result envelopes |
| CPU-heavy analytics | Rayon (Rust) or NumPy vectorization | efficient parallel compute | oversubscription and cache thrash | benchmark chunk sizing, cap threads, avoid shared state |

## Cross-Language Integration Playbooks

### API + Worker split

- API layer: FastAPI or Axum
- CPU-heavy worker: Rust (`rayon`) or optimized Python vectorization
- message contract: strict schema (`pydantic` / `serde`)
- persistence: SQLAlchemy or explicit SQL repositories

### Event-driven ingestion

- ingress API validates payload shape early
- write canonical event format with explicit version field
- worker pipeline deserializes into typed models
- reject/park malformed messages with rich diagnostics

### Remote operation pipeline

- discovery phase: resolve host inventory
- execution phase: bounded async fan-out
- reconciliation phase: classify transport vs command failures
- reporting phase: stable machine-readable result envelope

## Migration and Adoption Strategy

1. Start with one framework per boundary concern (web, data, HTTP client, ORM).
2. Standardize project templates: logging, errors, timeout defaults, test scaffolds.
3. Require one operational runbook per framework introduced.
4. Add compatibility checks before large upgrades (major versions, async model shifts).
5. Treat framework upgrades like infra changes: staged rollout + rollback plan.

## Cookbook Usage Pattern

Use each page in this order when building a new service:

1. Read Big Picture + Tradeoffs to decide if the framework fits.
2. Read edge cases before writing code.
3. Copy a complete example and adapt it incrementally.
4. Add tests for the exact boundary you are introducing.
5. Apply production checklist items before first deployment.

## Common Anti-Patterns (Across Frameworks)

1. Mixing too many overlapping frameworks in one service.
2. Hiding critical policies (timeouts/retries/transactions) in ad-hoc helper code.
3. Validating only happy-path data and skipping malformed input tests.
4. Treating docs examples as production-ready without lifecycle and failure handling.
5. Shipping without instrumentation for latency, error class, and saturation metrics.
