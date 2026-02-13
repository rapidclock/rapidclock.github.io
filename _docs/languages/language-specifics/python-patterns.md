---
title: Python
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

## Advanced Pattern Layer

## Pattern 9: Custom Exception Taxonomy For Domain Boundaries

### Basic Idea

Define a small domain-specific exception hierarchy so callers can branch on failure type instead of parsing strings.

### Pros

- explicit failure contract
- cleaner retry and HTTP/status mapping logic
- easier observability by error class

### Cons

- too many exception types can create maintenance overhead

### When To Use

- service/domain boundaries
- parsing/validation layers
- adapters around external systems

### Example

```python
class AppError(Exception):
    """Base class for application-domain errors."""


class ValidationError(AppError):
    pass


class RetryableDependencyError(AppError):
    pass


def parse_port(raw: str) -> int:
    value = raw.strip()
    if not value:
        raise ValidationError("port is required")
    try:
        port = int(value)
    except ValueError as exc:
        raise ValidationError("port must be numeric") from exc

    if not (1 <= port <= 65535):
        raise ValidationError("port out of range")
    return port
```

### Edge Cases

- Avoid exposing low-level error types directly across boundary layers.
- Preserve exception cause with `raise ... from ...` for deep diagnostics.

## Pattern 10: Request-Scoped Context With `contextvars`

### Basic Idea

Use `contextvars` for request/task-scoped metadata in async and mixed concurrency code.

### Pros

- avoids passing context fields through every function signature
- safe per-task context separation in async workflows

### Cons

- implicit context can be harder to reason about if overused

### When To Use

- request ID propagation
- tenant/account scoping in middleware-style code
- structured logging enrichment

### Example

```python
import contextvars
import logging

request_id_var = contextvars.ContextVar("request_id", default="-")
log = logging.getLogger("app")


def set_request_id(request_id: str) -> None:
    request_id_var.set(request_id)


def log_info(msg: str) -> None:
    rid = request_id_var.get()
    log.info("request_id=%s %s", rid, msg)
```

### Edge Cases

- Reset/override context deliberately in worker pools and background task boundaries.
- Do not use context vars as an untyped global data bag.

## Pattern 11: Composition-First Service Objects

### Basic Idea

Compose service behavior from small collaborators instead of inheritance-heavy class trees.

### Pros

- clearer dependency boundaries
- easier testing with protocol-based substitutes
- lower coupling

### Cons

- can introduce more constructor wiring if not organized well

### When To Use

- business workflows combining repositories, clients, and policy modules

### Example

```python
from dataclasses import dataclass
from typing import Protocol


class UserRepo(Protocol):
    def exists(self, user_id: int) -> bool:
        ...


class Notifier(Protocol):
    def send(self, user_id: int, msg: str) -> None:
        ...


@dataclass
class UserService:
    repo: UserRepo
    notifier: Notifier

    def welcome(self, user_id: int) -> None:
        if not self.repo.exists(user_id):
            raise ValueError("user not found")
        self.notifier.send(user_id, "welcome")
```

### Edge Cases

- Keep service methods small; orchestration layers should not absorb all business logic.
- Prefer explicit constructor wiring over hidden global singletons.

## Pattern 12: Retry Policy As A First-Class Primitive

### Basic Idea

Centralize retry behavior in one reusable function so retry rules stay consistent across call sites.

### Pros

- consistent timeout/backoff behavior
- easier auditing of retryable vs non-retryable errors

### Cons

- incorrect retry classification can cause duplicate side effects

### When To Use

- network and storage boundary adapters
- queue/message ack/retry flows

### Example

```python
from collections.abc import Callable
import time


def retry_call(fn: Callable[[], str], attempts: int = 3, base_delay: float = 0.1) -> str:
    last_exc: Exception | None = None
    for i in range(attempts):
        try:
            return fn()
        except TimeoutError as exc:
            last_exc = exc
            if i == attempts - 1:
                break
            time.sleep(base_delay * (2**i))
    assert last_exc is not None
    raise last_exc
```

### Edge Cases

- Retry only idempotent operations by default.
- Combine retries with absolute deadline/time budget.

## Architecture Playbooks (Python Specifics)

### API + Domain + Adapter Split

- API layer: validation and transport mapping
- Domain layer: business rules, typed exceptions
- Adapter layer: persistence/external IO with retry/timeouts

### Batch/Worker Pipeline

- ingestion stage: parse + validate
- transform stage: pure functions/generator pipelines
- sink stage: side effects + explicit retry policy

### Tooling/CLI Service

- config parse early with explicit validation errors
- single logging setup function at startup
- exit codes mapped from domain exception classes

## Testing and Verification Checklist

1. Unit test each pattern boundary (decorator behavior, context manager cleanup, protocol substitution).
2. Test exception taxonomy mapping to user-facing/API-facing outputs.
3. Add regression fixtures for generator pipelines and streaming behavior.
4. Verify retry helpers do not re-run non-idempotent paths unintentionally.
5. Add stress tests where async + context propagation interact.

## Python-Specific Anti-Patterns and Fixes

1. `except Exception: pass`
   Fix: catch expected subclasses and log/propagate unexpected failures.
2. Hidden globals for runtime state
   Fix: inject dependencies explicitly via constructor/function params.
3. Long `async` functions doing blocking work
   Fix: isolate blocking operations in executors/process pools.
4. Decorators without clear contracts
   Fix: document behavior and preserve metadata with `functools.wraps`.
5. Validation in too many layers
   Fix: validate once at trust boundary, then keep internal models stable.

## Advanced Pattern Selection Guide

| Problem | Strong pattern |
| --- | --- |
| need actionable error classification | custom exception taxonomy |
| request metadata should flow through async calls | `contextvars` |
| avoid deep inheritance in service code | composition-first services |
| repeated outbound calls need controlled retries | first-class retry primitive |
| resource cleanup must always occur | context manager |
| large data stream transformation | generator pipeline |
