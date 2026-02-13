---
title: Python Specific Patterns
description: Idiomatic Python patterns with detailed explanations, pros/cons, use cases, and edge-case guidance.
permalink: /languages/language-specifics/python-patterns/
---

## Big Picture

Python makes common tasks concise, but readability and runtime behavior depend heavily on pattern choice.

This page covers patterns you will repeatedly use in production Python services and tools.

## Pattern 1: EAFP (Ask Forgiveness, Not Permission)

### Basic Idea

Instead of checking every precondition up front, attempt the operation and handle exceptions.

### Why This Is Idiomatic In Python

Python's exception model is lightweight and integrated into normal control flow.

### Pros

- fewer duplicated precondition checks
- avoids race conditions between check and use (TOCTOU)
- often clearer when success path is dominant

### Cons

- overly broad `except` blocks can hide real bugs
- exception-heavy hot loops may be slower than direct checks

### When To Use

- dictionary lookups with fallback
- parsing and conversion
- file and network I/O where failures are expected

### Example

```python
from collections.abc import Mapping


def get_timeout(config: Mapping[str, str]) -> int:
    try:
        return int(config["timeout_ms"])
    except KeyError:
        return 500
    except ValueError as exc:
        raise ValueError("timeout_ms must be an integer") from exc
```

### Edge Cases

- Catch only exceptions you expect (`KeyError`, `ValueError`), not bare `except`.
- Preserve exception cause with `raise ... from ...` for debugging.

## Pattern 2: Dataclass-Centered Domain Models

### Basic Idea

Use `@dataclass` to model structured data with clear fields and defaults.

### Pros

- less boilerplate (`__init__`, `__repr__`, equality)
- clear, typed fields
- easy conversion between layers

### Cons

- runtime validation is not automatic
- mutable defaults can cause shared-state bugs

### When To Use

- request/response DTOs
- configuration objects
- immutable value objects

### Example

```python
from dataclasses import dataclass, field


@dataclass(frozen=True)
class UserProfile:
    user_id: int
    name: str
    roles: tuple[str, ...] = field(default_factory=tuple)

    def is_admin(self) -> bool:
        return "admin" in self.roles
```

### Edge Cases

- Do not use mutable defaults like `roles=[]`; use `default_factory`.
- Use `frozen=True` for value semantics when mutation is not required.

## Pattern 3: Generator Pipelines For Large Streams

### Basic Idea

Compose iterables with generators to process data lazily.

### Pros

- low memory usage
- easy composition
- naturally testable in stages

### Cons

- debugging can be harder than materialized lists
- one-pass consumption can surprise beginners

### When To Use

- log processing
- CSV or JSONL ingestion
- filtering/transforming large files

### Example

```python
from collections.abc import Iterable, Iterator


def non_empty(lines: Iterable[str]) -> Iterator[str]:
    for line in lines:
        trimmed = line.strip()
        if trimmed:
            yield trimmed


def only_errors(lines: Iterable[str]) -> Iterator[str]:
    for line in lines:
        if "ERROR" in line:
            yield line


lines = ["", "INFO ok", "ERROR disk", "ERROR timeout"]
print(list(only_errors(non_empty(lines))))
```

### Edge Cases

- A consumed generator cannot be reused without recreating it.
- If downstream needs random access, materialize with `list(...)` intentionally.

## Pattern 4: Context Managers For Resource Safety

### Basic Idea

Wrap acquire/release logic in `with` so cleanup runs even on exceptions.

### Pros

- deterministic cleanup
- less resource leakage
- easier error handling

### Cons

- custom context managers add abstraction overhead if overused

### When To Use

- files/sockets
- temporary state changes
- transactions and locks

### Example

```python
from contextlib import contextmanager
from time import perf_counter


@contextmanager
def timed(label: str):
    start = perf_counter()
    try:
        yield
    finally:
        elapsed = perf_counter() - start
        print(f"{label}: {elapsed:.6f}s")


with timed("batch"):
    total = sum(range(200_000))
    print(total)
```

### Edge Cases

- Do not swallow exceptions unless you explicitly convert or log them.
- Ensure cleanup code itself cannot fail silently.

## Pattern 5: Decorators For Cross-Cutting Behavior

### Basic Idea

Decorators wrap function behavior for concerns like retry, timing, caching, auth checks.

### Pros

- reusable cross-cutting logic
- keeps business functions focused

### Cons

- deep decorator stacks reduce readability
- missing `functools.wraps` harms introspection and tooling

### When To Use

- instrumentation
- retries/backoff
- caching pure functions

### Example

```python
from functools import wraps
from time import sleep


def retry(times: int):
    def outer(fn):
        @wraps(fn)
        def inner(*args, **kwargs):
            last_exc = None
            for _ in range(times):
                try:
                    return fn(*args, **kwargs)
                except ValueError as exc:
                    last_exc = exc
                    sleep(0.05)
            raise last_exc

        return inner

    return outer


@retry(times=3)
def parse_positive(raw: str) -> int:
    value = int(raw)
    if value <= 0:
        raise ValueError("value must be > 0")
    return value
```

### Edge Cases

- Keep retry scopes narrow; never retry non-idempotent operations blindly.
- Include timeout and max-attempt boundaries in production.

## Pattern 6: Protocol-Oriented Interfaces For Dependency Injection

### Basic Idea

Use `typing.Protocol` to define behavior contracts and swap implementations cleanly.

### Pros

- decouples callers from concrete classes
- enables lightweight mocking in tests
- improves static analysis quality

### Cons

- runtime does not enforce protocols by default
- over-abstraction in small scripts can be unnecessary

### When To Use

- service clients (cache, queue, DB wrapper)
- adapters for external systems

### Example

```python
from typing import Protocol


class Notifier(Protocol):
    def send(self, user_id: int, message: str) -> None:
        ...


class ConsoleNotifier:
    def send(self, user_id: int, message: str) -> None:
        print(f"notify user={user_id}: {message}")


def onboard(user_id: int, notifier: Notifier) -> None:
    notifier.send(user_id, "welcome")


onboard(42, ConsoleNotifier())
```

### Edge Cases

- Keep protocol surface area small; large interfaces reduce substitutability.
- Validate behavioral assumptions with unit tests.

## Pattern 7: Async I/O With Bounded Concurrency

### Basic Idea

Use `asyncio` for high-fanout I/O and bound in-flight operations with a semaphore.

### Pros

- high throughput for I/O-bound workloads
- explicit cancellation and timeout handling

### Cons

- not ideal for CPU-bound work
- blocking calls inside async code stall event loop

### When To Use

- large batches of HTTP calls
- queue consumers with remote I/O

### Example

```python
import asyncio


async def fetch_one(i: int, sem: asyncio.Semaphore) -> str:
    async with sem:
        await asyncio.sleep(0.05)
        return f"item-{i}"


async def main() -> None:
    sem = asyncio.Semaphore(10)
    tasks = [fetch_one(i, sem) for i in range(50)]
    results = await asyncio.gather(*tasks)
    print(len(results), results[0], results[-1])


asyncio.run(main())
```

### Edge Cases

- Use `asyncio.wait_for` or timeout wrappers for every external I/O boundary.
- Cancel pending tasks during shutdown to avoid task leaks.

## Pattern 8: Multiprocessing For CPU-Bound Work

### Basic Idea

Use multiple processes to sidestep the GIL for parallel CPU-heavy operations.

### Pros

- true CPU parallelism
- straightforward with `concurrent.futures.ProcessPoolExecutor`

### Cons

- process startup overhead
- serialization overhead for arguments/results

### When To Use

- CPU-heavy transforms
- image/video processing
- large numerical parsing pipelines

### Example

```python
from concurrent.futures import ProcessPoolExecutor


def cpu_task(n: int) -> int:
    return sum(i * i for i in range(n))


with ProcessPoolExecutor(max_workers=4) as pool:
    outputs = list(pool.map(cpu_task, [100_000, 120_000, 150_000]))

print(outputs)
```

### Edge Cases

- Ensure top-level function definitions for pickling compatibility.
- On macOS/Windows, protect entry with `if __name__ == "__main__":` in scripts.

## Pattern Selection Guide

| Problem | Recommended pattern |
| --- | --- |
| robust parsing and default behavior | EAFP + narrow exception handling |
| typed business entities | dataclasses with explicit validation |
| huge input streams | generator pipeline |
| files, locks, temporary state | context managers |
| instrumentation/retry/caching | decorators |
| testable service boundaries | protocol-based DI |
| high-fanout network calls | asyncio + semaphore |
| CPU-heavy parallel workloads | multiprocessing |

## Global Edge Cases Checklist

1. Mutable defaults:
   Never use mutable default arguments directly (`[]`, `{}`).
2. Late-binding closures:
   Loop variables captured in lambdas/functions can surprise without explicit binding.
3. Silent exception swallowing:
   Avoid broad catches that hide operational issues.
4. Mixed async/blocking code:
   Blocking calls in async loops can freeze concurrency.
5. Hidden shared state:
   Module-level mutable objects can create hard-to-debug coupling.
