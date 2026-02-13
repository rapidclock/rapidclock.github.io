---
title: HTTPX
description: Modern sync/async HTTP client for Python with connection pooling, timeouts, and typed request flows.
permalink: /languages/frameworks/python/httpx/
---

## Big Picture

`httpx` is the modern HTTP client when you need one API for both sync and async flows.

Use it for:

- service-to-service calls in async APIs
- modern timeout and transport controls
- test-friendly HTTP client abstraction

## Core Concepts

- `Client` and `AsyncClient` for connection pooling
- explicit timeout objects
- request/response hooks
- transport-level customization

## Example: Async Client with Timeouts

```python
import httpx


async def fetch_profile(user_id: int) -> dict:
    timeout = httpx.Timeout(connect=2.0, read=3.0, write=3.0, pool=1.0)
    async with httpx.AsyncClient(timeout=timeout, base_url="https://api.example.com") as client:
        resp = await client.get(f"/users/{user_id}")
        resp.raise_for_status()
        return resp.json()
```

## Example: Retriable Wrapper

```python
import asyncio
import httpx


async def get_with_retries(url: str, attempts: int = 3) -> str:
    async with httpx.AsyncClient(timeout=5.0) as client:
        for i in range(attempts):
            try:
                r = await client.get(url)
                r.raise_for_status()
                return r.text
            except httpx.HTTPError:
                if i == attempts - 1:
                    raise
                await asyncio.sleep(0.2 * (2**i))
    raise RuntimeError("unreachable")
```

## Tradeoffs

### Pros

- unified sync/async design
- clearer timeout model than many older clients
- good integration with FastAPI and modern Python tooling

### Cons

- if you only need simple synchronous calls, `requests` may be simpler
- requires explicit client lifecycle discipline

## Edge Cases and Gotchas

1. Creating client per request:
   reuse `Client`/`AsyncClient` where possible for pooling benefits.
2. Missing timeout:
   always set explicit timeout policy.
3. Retry semantics:
   retry idempotent operations carefully and explicitly.
4. Streaming responses:
   consume/close streams properly to avoid connection leaks.

## Documentation Links

- HTTPX docs: [www.python-httpx.org](https://www.python-httpx.org/)
- Async support: [www.python-httpx.org/async](https://www.python-httpx.org/async/)
- Timeouts: [www.python-httpx.org/advanced/timeouts](https://www.python-httpx.org/advanced/timeouts/)

## Deep Dive Cookbook Additions

### Client Lifecycle Pattern

- construct one client per process/service component
- inject into modules/functions needing outbound HTTP
- close on shutdown

### How-To: Custom Transport for Testing

```python
import httpx


def handler(request: httpx.Request) -> httpx.Response:
    if request.url.path == "/health":
        return httpx.Response(200, json={"status": "ok"})
    return httpx.Response(404)

transport = httpx.MockTransport(handler)
client = httpx.Client(transport=transport, base_url="https://mock.local")
print(client.get("/health").json())
```

### How-To: Per-Request Deadline Budget

```python
import httpx


def call_with_budget(client: httpx.Client, url: str, timeout_sec: float):
    r = client.get(url, timeout=httpx.Timeout(timeout_sec))
    r.raise_for_status()
    return r.json()
```

### Operational Guidance

1. Normalize retry policy in one wrapper.
2. Distinguish connect/read/write timeouts.
3. Capture status code class metrics (`2xx/4xx/5xx`).
4. Add idempotency key strategy for retried writes.

## Resilient Client Design

Use one client wrapper module per upstream dependency. That wrapper should own:

- base URL
- timeout budget
- retry policy
- auth headers
- error translation to domain exceptions

This avoids duplicated and inconsistent HTTP behavior across codebase modules.

## Complete Example: Typed Wrapper with Error Mapping

```python
from __future__ import annotations

from dataclasses import dataclass
import httpx


class UpstreamUnavailable(RuntimeError):
    pass


class UpstreamBadRequest(RuntimeError):
    pass


@dataclass
class UsersClient:
    client: httpx.AsyncClient

    async def get_user(self, user_id: int) -> dict:
        try:
            resp = await self.client.get(f"/users/{user_id}")
        except httpx.TimeoutException as exc:
            raise UpstreamUnavailable("users service timeout") from exc
        except httpx.NetworkError as exc:
            raise UpstreamUnavailable("users service network error") from exc

        if resp.status_code == 400:
            raise UpstreamBadRequest(resp.text)
        if resp.status_code >= 500:
            raise UpstreamUnavailable(f"users service error: {resp.status_code}")

        resp.raise_for_status()
        payload = resp.json()
        return {"id": payload["id"], "email": payload.get("email", "")}


async def build_users_client() -> UsersClient:
    timeout = httpx.Timeout(connect=1.0, read=2.0, write=2.0, pool=1.0)
    client = httpx.AsyncClient(base_url="https://api.example.com", timeout=timeout)
    return UsersClient(client=client)
```

## How-To: Streaming Large Responses

```python
import httpx


def stream_to_file(url: str, output_path: str) -> None:
    with httpx.Client(timeout=30.0) as client:
        with client.stream("GET", url) as response:
            response.raise_for_status()
            with open(output_path, "wb") as f:
                for chunk in response.iter_bytes(chunk_size=64 * 1024):
                    f.write(chunk)
```

Always close streams to return connections to the pool.

## Retry Strategy Notes

- default retries should usually apply to idempotent methods (`GET`, `HEAD`, `OPTIONS`)
- for write endpoints, use idempotency keys if retries are required
- classify retryable errors explicitly (connect timeout, temporary network errors, 503)

## Testing HTTPX Integrations

1. Unit tests with `MockTransport` for deterministic status/body scenarios.
2. Contract tests against stub server to validate serialization and headers.
3. Integration tests against sandbox/staging upstream where available.

## Observability Checklist

1. emit outbound latency metrics by host/path/status class
2. include request ID/correlation ID headers
3. log retry attempts and terminal failure reason
4. redact tokens and sensitive query params in logs
