---
title: Pytest + Unittest + Mocking
description: Testing strategy and robust mocking patterns in Python, including sync/async/network/time/error scenarios.
permalink: /languages/frameworks/python/testing-mocking/
---

## Big Picture

For most Python teams, high-quality tests combine:

- `pytest` for test execution ergonomics
- `unittest` compatibility for legacy suites
- `unittest.mock` for controlled dependency isolation

The key is not "mock everything". Mock only boundaries you do not want in unit tests:

- network
- filesystem
- time
- random/external side effects

## Test Pyramid (Pragmatic)

1. Unit tests: fast, isolated, heavy assertion coverage.
2. Integration tests: real DB/service dependencies in controlled environment.
3. End-to-end tests: critical user workflows only.

## Example: Pytest Fixture + Parameterization

```python
import pytest


def normalize_email(raw: str) -> str:
    return raw.strip().lower()


@pytest.mark.parametrize(
    "raw,expected",
    [
        (" Ada@Example.com ", "ada@example.com"),
        ("BOB@EXAMPLE.COM", "bob@example.com"),
    ],
)
def test_normalize_email(raw: str, expected: str) -> None:
    assert normalize_email(raw) == expected
```

## Example: Unittest Style Test Case

```python
import unittest


def add(a: int, b: int) -> int:
    return a + b


class TestMath(unittest.TestCase):
    def test_add(self) -> None:
        self.assertEqual(add(2, 3), 5)
```

## Mocking Scenario 1: Replace External Function

```python
from unittest.mock import patch


def get_exchange_rate() -> float:
    raise RuntimeError("real external call")


def convert(amount: float) -> float:
    return amount * get_exchange_rate()


@patch("__main__.get_exchange_rate", return_value=1.25)
def test_convert(mock_rate):
    assert convert(10.0) == 12.5
    mock_rate.assert_called_once()
```

## Mocking Scenario 2: Simulate HTTP Success and Failure

```python
from unittest.mock import Mock, patch
import requests


def fetch_user_name(session: requests.Session, user_id: int) -> str:
    r = session.get(f"https://api.example.com/users/{user_id}", timeout=5)
    r.raise_for_status()
    return r.json()["name"]


def test_fetch_user_name_success():
    session = Mock(spec=requests.Session)
    response = Mock()
    response.json.return_value = {"name": "Ada"}
    response.raise_for_status.return_value = None
    session.get.return_value = response

    assert fetch_user_name(session, 7) == "Ada"


def test_fetch_user_name_500():
    session = Mock(spec=requests.Session)
    response = Mock()
    response.raise_for_status.side_effect = requests.HTTPError("500")
    session.get.return_value = response

    try:
        fetch_user_name(session, 7)
        assert False, "expected HTTPError"
    except requests.HTTPError:
        pass
```

## Mocking Scenario 3: Async Dependency with `AsyncMock`

```python
import pytest
from unittest.mock import AsyncMock


async def service_call(client, key: str) -> dict:
    return await client.fetch(key)


@pytest.mark.asyncio
async def test_service_call_async():
    client = AsyncMock()
    client.fetch.return_value = {"ok": True}

    out = await service_call(client, "abc")
    assert out == {"ok": True}
    client.fetch.assert_awaited_once_with("abc")
```

## Mocking Scenario 4: Ordered Side Effects (Retries)

```python
from unittest.mock import Mock


def do_retrying(callable_obj, attempts=3):
    for i in range(attempts):
        try:
            return callable_obj()
        except Exception:
            if i == attempts - 1:
                raise


def test_retry_eventual_success():
    fn = Mock(side_effect=[RuntimeError("timeout"), "ok"])
    assert do_retrying(fn) == "ok"
```

## Mocking Scenario 5: Environment and Time

```python
from unittest.mock import patch
import os


def is_prod() -> bool:
    return os.getenv("APP_ENV") == "prod"


def test_is_prod():
    with patch.dict(os.environ, {"APP_ENV": "prod"}, clear=False):
        assert is_prod() is True
```

## Tradeoffs

### Pros

- fast feedback loop
- easier failure-path coverage
- deterministic tests around unstable dependencies

### Cons

- over-mocking can hide integration failures
- brittle patch paths can break silently during refactors
- false confidence if contract with real dependency is never tested

## Edge Cases and Gotchas

1. Patch where used, not where defined:
   patch the symbol in the module under test.
2. Async tests need proper plugin/runtime:
   use `pytest-asyncio` or equivalent.
3. Mocking HTTP too deeply:
   keep contract tests against real/stub server.
4. Time-dependent logic:
   patch time source consistently (not partially).
5. Stateful mocks across tests:
   avoid shared mutable mocks; prefer per-test fixtures.

## Documentation Links

- Pytest docs: [docs.pytest.org](https://docs.pytest.org/)
- Pytest fixtures: [docs.pytest.org/en/stable/how-to/fixtures.html](https://docs.pytest.org/en/stable/how-to/fixtures.html)
- Unittest docs: [docs.python.org/3/library/unittest.html](https://docs.python.org/3/library/unittest.html)
- `unittest.mock`: [docs.python.org/3/library/unittest.mock.html](https://docs.python.org/3/library/unittest.mock.html)
- `pytest-asyncio`: [pytest-asyncio.readthedocs.io](https://pytest-asyncio.readthedocs.io/)

## Deep Dive Cookbook Additions

### Test Double Matrix

| Need | Preferred double |
| --- | --- |
| verify call arguments | `Mock` / `MagicMock` |
| async dependency | `AsyncMock` |
| external service contract | real stub/fake server |
| filesystem behavior | temp dirs + real IO when cheap |

### How-To: Patch Time Deterministically

```python
from datetime import datetime
from unittest.mock import patch


def now_iso() -> str:
    return datetime.utcnow().isoformat()


def test_now_iso_fixed():
    fixed = datetime(2026, 1, 1, 0, 0, 0)
    with patch("__main__.datetime") as dt:
        dt.utcnow.return_value = fixed
        assert now_iso().startswith("2026-01-01T00:00:00")
```

### How-To: Contract Test Against Stub HTTP Server

```python
import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
import requests


class StubHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/users/7":
            body = json.dumps({"name": "Ada"}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_response(404)
        self.end_headers()


def test_contract_user_endpoint():
    server = HTTPServer(("127.0.0.1", 0), StubHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        host, port = server.server_address
        r = requests.get(f"http://{host}:{port}/users/7", timeout=3)
        r.raise_for_status()
        assert r.json() == {"name": "Ada"}
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=1)
```

### Operational Guidance

1. Keep most tests deterministic and side-effect free.
2. Use integration tests for boundaries mocks cannot faithfully simulate.
3. Track flaky tests aggressively; quarantine and fix root causes quickly.
4. Avoid asserting implementation details when behavior assertions are sufficient.

## Cookbook: Designing Test Suites that Scale

A reliable pattern for growing codebases:

- fast unit tests around pure logic
- integration tests around boundary adapters (DB, HTTP, filesystem)
- contract tests for third-party interfaces
- tiny number of end-to-end tests for critical user flows

This balances speed with confidence.

## Complete Example: Layered Tests for an API Adapter

```python
from __future__ import annotations

from dataclasses import dataclass
import httpx


class UserApiError(RuntimeError):
    pass


@dataclass
class UserApi:
    client: httpx.Client

    def get_name(self, user_id: int) -> str:
        try:
            r = self.client.get(f"/users/{user_id}", timeout=3)
            r.raise_for_status()
        except httpx.HTTPError as exc:
            raise UserApiError("upstream call failed") from exc
        return r.json()["name"]
```

Unit test with `MockTransport`:

```python
import httpx


def test_user_api_get_name_unit():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"name": "Ada"})

    client = httpx.Client(transport=httpx.MockTransport(handler), base_url="https://mock.local")
    api = UserApi(client)
    assert api.get_name(1) == "Ada"
```

Contract test outline:

1. launch stub server with expected endpoint behavior
2. run adapter against real network boundary
3. assert status mapping, payload parsing, and error handling

## Mocking Guidance by Scenario

1. Pure unit logic: no mocks needed.
2. Outbound HTTP call: mock transport or patch session client.
3. Time-sensitive logic: patch time source once at module boundary.
4. Randomness: inject RNG or patch random source deterministically.
5. File IO: prefer temporary real files over deep mocks when cheap.

## How-To: Mock Multiple Sequential Failures

```python
from unittest.mock import Mock


def retry_3(call):
    for i in range(3):
        try:
            return call()
        except RuntimeError:
            if i == 2:
                raise


def test_retry_three_failures_then_error():
    fn = Mock(side_effect=[RuntimeError("t1"), RuntimeError("t2"), RuntimeError("t3")])
    try:
        retry_3(fn)
        assert False, "expected failure"
    except RuntimeError as exc:
        assert "t3" in str(exc)
```

## How-To: Mock Different Return Values by Input

```python
from unittest.mock import Mock


def route_lookup(getter, key: str) -> str:
    return getter(key)


def test_mock_by_input():
    getter = Mock(side_effect=lambda k: {"a": "alpha", "b": "beta"}[k])
    assert route_lookup(getter, "a") == "alpha"
    assert route_lookup(getter, "b") == "beta"
```

## Flaky Test Reduction Checklist

1. remove real-time sleeps from tests
2. avoid dependence on global mutable state
3. run tests in random order periodically
4. isolate network/filesystem unless intentionally integration testing
5. use deterministic fixtures and explicit seeds for randomized tests

## CI Strategy

1. run fast unit suite on every commit
2. run integration/contract suites in parallel jobs
3. collect flaky-test history and gate releases on stability
4. report code coverage by package and by critical path
