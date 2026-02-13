---
title: Requests
description: Battle-tested synchronous HTTP client patterns for robust service integration.
permalink: /languages/frameworks/python/requests/
---

## Big Picture

`requests` is still the most common synchronous HTTP client in Python codebases.

Use it when:

- code is synchronous
- you want minimal ceremony
- ecosystem familiarity matters

## Core Concepts

- `Session` for connection reuse
- explicit timeout for every call
- `raise_for_status()` for error propagation
- retry policies via `urllib3` adapter

## Example: Session + Retry Policy

```python
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


def build_session() -> requests.Session:
    retry = Retry(
        total=3,
        backoff_factor=0.2,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=frozenset(["GET", "HEAD", "OPTIONS"]),
    )

    adapter = HTTPAdapter(max_retries=retry)
    s = requests.Session()
    s.mount("http://", adapter)
    s.mount("https://", adapter)
    return s


session = build_session()
r = session.get("https://api.example.com/health", timeout=5)
r.raise_for_status()
print(r.json())
```

## Example: Streaming Download

```python
import requests


def download(url: str, out_path: str) -> None:
    with requests.get(url, stream=True, timeout=30) as r:
        r.raise_for_status()
        with open(out_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=1024 * 64):
                if chunk:
                    f.write(chunk)
```

## Tradeoffs

### Pros

- extremely simple API
- stable and well-known ecosystem behavior
- excellent for scripts and sync services

### Cons

- sync-only model
- less modern transport abstraction than HTTPX
- naive usage can ignore retries/timeouts

## Edge Cases and Gotchas

1. No timeout default:
   always pass timeout or calls can hang indefinitely.
2. Missing `Session` reuse:
   avoid one-off connections in high-volume loops.
3. TLS misconfiguration:
   do not disable certificate verification in production.
4. Retries on non-idempotent endpoints:
   can create duplicate side effects.

## Documentation Links

- Requests docs: [requests.readthedocs.io](https://requests.readthedocs.io/)
- Requests advanced usage: [requests.readthedocs.io/en/latest/user/advanced](https://requests.readthedocs.io/en/latest/user/advanced/)
- urllib3 Retry: [urllib3.readthedocs.io/en/stable/reference/urllib3.util.html#urllib3.util.Retry](https://urllib3.readthedocs.io/en/stable/reference/urllib3.util.html#urllib3.util.Retry)

## Deep Dive Cookbook Additions

### Session Factory Pattern

Build one configured `Session` with:

- retry policy
- default headers
- auth strategy
- timeout wrapper

### How-To: Safe JSON API Wrapper

```python
import requests


def get_json(session: requests.Session, url: str, timeout: float = 5.0) -> dict:
    r = session.get(url, timeout=timeout)
    r.raise_for_status()
    return r.json()
```

### How-To: Auth Refresh Skeleton

```python
import requests


class TokenSession:
    def __init__(self, session: requests.Session, token: str) -> None:
        self.s = session
        self.token = token

    def get(self, url: str):
        r = self.s.get(url, headers={"Authorization": f"Bearer {self.token}"}, timeout=5)
        if r.status_code == 401:
            # refresh token flow would happen here
            pass
        r.raise_for_status()
        return r
```

### Operational Guidance

1. Never rely on implicit default timeout.
2. Reuse sessions for connection pooling.
3. Split retry policy by endpoint risk (idempotent vs non-idempotent).
4. Log upstream latency and error category.

## Requests in Production Codebases

`requests` is still excellent for synchronous systems, but production safety depends on discipline:

- central session factory
- explicit timeout for all calls
- endpoint-specific retry policy
- stable error translation layer

## Complete Example: Service Wrapper with Pagination

```python
from __future__ import annotations

from dataclasses import dataclass
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


def build_session() -> requests.Session:
    retry = Retry(
        total=3,
        backoff_factor=0.2,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=frozenset(["GET", "HEAD", "OPTIONS"]),
    )
    adapter = HTTPAdapter(max_retries=retry)

    s = requests.Session()
    s.mount("http://", adapter)
    s.mount("https://", adapter)
    s.headers.update({"User-Agent": "cookbook-client/1.0"})
    return s


@dataclass
class BillingClient:
    session: requests.Session
    base_url: str

    def list_invoices(self, customer_id: str) -> list[dict]:
        out: list[dict] = []
        page = 1
        while True:
            r = self.session.get(
                f"{self.base_url}/invoices",
                params={"customer_id": customer_id, "page": page},
                timeout=5,
            )
            r.raise_for_status()
            payload = r.json()
            out.extend(payload["items"])
            if not payload.get("next_page"):
                break
            page = payload["next_page"]
        return out
```

## How-To: Upload File with Safe Timeouts

```python
import requests


def upload_file(session: requests.Session, url: str, path: str) -> dict:
    with open(path, "rb") as fh:
        r = session.post(url, files={"file": fh}, timeout=(2, 30))
    r.raise_for_status()
    return r.json()
```

Tuple timeout `(connect, read)` often better matches real behavior than one global value.

## Error Classification Pattern

Map request exceptions into categories your service understands:

- timeout
- transient network
- upstream 4xx contract issue
- upstream 5xx availability issue

Avoid propagating raw transport exceptions to higher layers.

## Security and Robustness Notes

1. Never disable TLS verification in production.
2. Keep auth tokens out of logs.
3. Limit redirect behavior for sensitive endpoints.
4. Validate response content-type before parsing JSON in strict integrations.

## Testing Checklist

1. unit tests with mocked session for retries and error mapping
2. contract tests against stub server for header/query/body expectations
3. integration test one real endpoint in staging with low rate
