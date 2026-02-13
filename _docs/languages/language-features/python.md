---
title: Python Features
description: Detailed Python language features, semantics, and idiomatic usage patterns.
permalink: /languages/language-features/python/
---

## Big Picture

Python emphasizes readability, high developer velocity, and a rich runtime object model.

Core characteristics:

- dynamic typing with optional static hints
- everything is an object
- powerful standard library + ecosystem
- expressive syntax for data processing and scripting

## 1. Type System (Dynamic + Optional Hints)

Python evaluates types at runtime. Type hints improve tooling and readability.

```python
from typing import Iterable


def total(xs: Iterable[int]) -> int:
    return sum(xs)

print(total([1, 2, 3]))
```

## 2. Data Model and Dunder Protocols

Special methods let objects participate in Python protocols.

```python
class Box:
    def __init__(self, value: int) -> None:
        self.value = value

    def __repr__(self) -> str:
        return f"Box({self.value})"

    def __add__(self, other: "Box") -> "Box":
        return Box(self.value + other.value)

print(Box(2) + Box(3))  # Box(5)
```

## 3. Comprehensions and Generator Expressions

Use comprehensions for concise transformation/filtering.

```python
nums = [1, 2, 3, 4, 5]

squares = [x * x for x in nums]
evens = [x for x in nums if x % 2 == 0]
stream = (x * x for x in nums)  # lazy generator

print(squares, evens, list(stream))
```

## 4. Iterators and Generators (`yield`)

Generators provide lazy sequences and memory-efficient pipelines.

```python
def fibonacci(n: int):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

print(list(fibonacci(7)))
```

## 5. Decorators

Decorators wrap functions/classes for cross-cutting behavior.

```python
from functools import wraps
from time import perf_counter


def timed(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        t0 = perf_counter()
        out = fn(*args, **kwargs)
        print(f"{fn.__name__}: {perf_counter() - t0:.6f}s")
        return out
    return wrapper


@timed
def work() -> int:
    return sum(range(10_000))

print(work())
```

## 6. Context Managers (`with`)

Context managers guarantee acquire/release behavior.

```python
from contextlib import contextmanager


@contextmanager
def managed_resource(name: str):
    print("open", name)
    try:
        yield
    finally:
        print("close", name)

with managed_resource("db-conn"):
    print("work")
```

## 7. Structural Pattern Matching (`match`)

Pattern matching provides declarative branching over structures.

```python
def describe(event: dict) -> str:
    match event:
        case {"type": "click", "x": x, "y": y}:
            return f"click at {x},{y}"
        case {"type": "quit"}:
            return "quit"
        case _:
            return "unknown"

print(describe({"type": "click", "x": 10, "y": 20}))
```

## 8. Exception Model

Python uses exceptions as primary error propagation model.

```python
def parse_port(raw: str) -> int:
    p = int(raw)
    if not (1 <= p <= 65535):
        raise ValueError("port out of range")
    return p

try:
    print(parse_port("8080"))
except ValueError as exc:
    print("error:", exc)
```

## 9. Async/Await (`asyncio`)

`asyncio` handles high-concurrency I/O workloads.

```python
import asyncio


async def fetch(name: str) -> str:
    await asyncio.sleep(0.1)
    return f"done {name}"


async def main() -> None:
    results = await asyncio.gather(fetch("A"), fetch("B"))
    print(results)


asyncio.run(main())
```

## 10. Dataclasses and Typing-Oriented Modeling

Use dataclasses for compact immutable/mutable record-like types.

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class User:
    id: int
    name: str

print(User(1, "Ada"))
```

## 11. Introspection and Metaprogramming

Python supports runtime introspection and dynamic behavior.

```python
class Plugin:
    def run(self) -> str:
        return "ok"

p = Plugin()
print(hasattr(p, "run"), getattr(p, "run")())
```

## 12. Modules and Packaging

Python modules are files; packages are directories with importable structure.

```python
# file: util/mathx.py
# def add(a: int, b: int) -> int: return a + b

# file: app.py
# from util.mathx import add
# print(add(2, 3))
```

## Edge Cases

1. Mutable default arguments:
   Default objects are created once at function definition time.
2. Late binding in closures:
   Loop variables captured by inner functions can surprise without default-arg binding.
3. Async + blocking calls:
   Blocking CPU/I/O in event loop stalls all tasks.
4. Exception swallowing:
   Broad `except Exception` can hide real failures.
5. Runtime monkey-patching:
   Powerful but can make large systems harder to reason about.
