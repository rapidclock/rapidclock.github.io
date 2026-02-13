---
title: FastAPI
description: Type-driven async API framework for Python with validation, dependency injection, and OpenAPI generation.
permalink: /languages/frameworks/python/fastapi/
---

## Big Picture

`fastapi` is strongest when you need:

- high-development-speed APIs
- typed request/response contracts
- async-first request handling
- automatic OpenAPI docs

## Core Concepts

- path operations (`@app.get`, `@app.post`, ...)
- Pydantic models for contracts
- dependency injection (`Depends`)
- async endpoints for non-blocking IO

## Example: Typed CRUD Endpoint

```python
from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()


class ItemIn(BaseModel):
    name: str
    price: float


class ItemOut(ItemIn):
    id: int


DB: dict[int, ItemOut] = {}


def next_id() -> int:
    return max(DB.keys(), default=0) + 1


@app.post("/items", response_model=ItemOut)
def create_item(payload: ItemIn, item_id: int = Depends(next_id)) -> ItemOut:
    item = ItemOut(id=item_id, **payload.model_dump())
    DB[item.id] = item
    return item


@app.get("/items/{item_id}", response_model=ItemOut)
def get_item(item_id: int) -> ItemOut:
    item = DB.get(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="item not found")
    return item
```

## Example: Async External Call Boundary

```python
from fastapi import FastAPI
import httpx

app = FastAPI()


@app.get("/health/upstream")
async def upstream_health() -> dict[str, str]:
    async with httpx.AsyncClient(timeout=5.0) as client:
        r = await client.get("https://example.com/health")
        r.raise_for_status()
    return {"status": "ok"}
```

## Tradeoffs

### Pros

- strong contracts with minimal ceremony
- excellent docs/openapi generation
- good performance for Python APIs

### Cons

- async model requires discipline around blocking calls
- dependency injection misuse can create hidden complexity
- still Python: CPU-bound throughput limits remain

## Edge Cases and Gotchas

1. Blocking call inside `async def`:
   use async clients or run blocking work in thread pool.
2. Lifespan management:
   initialize and close DB/HTTP clients in startup/shutdown hooks.
3. Validation churn:
   keep API model versioning explicit for backward compatibility.
4. Timeout defaults:
   explicitly set outbound network timeouts.

## Documentation Links

- FastAPI docs: [fastapi.tiangolo.com](https://fastapi.tiangolo.com/)
- Dependency injection: [fastapi.tiangolo.com/tutorial/dependencies](https://fastapi.tiangolo.com/tutorial/dependencies/)
- Lifespan events: [fastapi.tiangolo.com/advanced/events](https://fastapi.tiangolo.com/advanced/events/)
- Pydantic docs: [docs.pydantic.dev/latest](https://docs.pydantic.dev/latest/)

## Deep Dive Cookbook Additions

### Service Structure Pattern

- `api/routers/*` for endpoint wiring
- `service/*` for business logic
- `repo/*` for persistence integrations
- `schemas/*` for request/response contracts

This prevents handlers from becoming large "god functions".

### How-To: Dependency-Injected Database Session

```python
from collections.abc import Generator
from fastapi import Depends, FastAPI
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

app = FastAPI()

engine = create_engine("sqlite+pysqlite:///app.db", future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/users/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    ...
```

### How-To: Global Exception Handler

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()


class DomainError(Exception):
    pass


@app.exception_handler(DomainError)
async def domain_error_handler(_: Request, exc: DomainError):
    return JSONResponse(status_code=400, content={"error": str(exc)})
```

### Performance and Ops

1. Reuse outbound clients (DB, HTTP) via startup/lifespan hooks.
2. Keep endpoints thin; move heavy work out of request path.
3. Add request/response size limits and timeout policies.
4. Add structured access logs and trace IDs.

## Architecture Pattern (Transport, Service, Repository)

Keep endpoint functions focused on HTTP concerns only:

- parse/validate request payloads
- call service layer
- map known domain errors to HTTP responses

Move domain policy and data access into separate modules so they can be tested without the web framework.

## Complete Example: App Lifespan + Dependency Graph

```python
from __future__ import annotations

from contextlib import asynccontextmanager
from dataclasses import dataclass
from fastapi import Depends, FastAPI, HTTPException
import httpx


@dataclass
class AppContext:
    http: httpx.AsyncClient


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.ctx = AppContext(http=httpx.AsyncClient(timeout=5.0))
    try:
        yield
    finally:
        await app.state.ctx.http.aclose()


app = FastAPI(lifespan=lifespan)


class UserOut(dict):
    # Keep example lightweight; use Pydantic model in production pages.
    pass


def get_ctx() -> AppContext:
    return app.state.ctx


@app.get("/proxy/users/{user_id}")
async def proxy_user(user_id: int, ctx: AppContext = Depends(get_ctx)) -> dict:
    r = await ctx.http.get(f"https://api.example.com/users/{user_id}")
    if r.status_code == 404:
        raise HTTPException(status_code=404, detail="user not found")
    r.raise_for_status()
    payload = r.json()
    return {"id": payload["id"], "name": payload.get("name", "")}
```

## How-To: Request ID Middleware

```python
from __future__ import annotations

import uuid
from fastapi import Request


@app.middleware("http")
async def attach_request_id(request: Request, call_next):
    request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["x-request-id"] = request_id
    return response
```

This enables correlation across logs, metrics, and downstream calls.

## How-To: Background Work Safely

Use FastAPI `BackgroundTasks` only for small best-effort tasks. For critical or long-running work, enqueue to a durable worker queue.

```python
from fastapi import BackgroundTasks


def write_audit(entry: str) -> None:
    with open("audit.log", "a", encoding="utf-8") as f:
        f.write(entry + "\n")


@app.post("/actions")
def create_action(background_tasks: BackgroundTasks) -> dict:
    background_tasks.add_task(write_audit, "action-created")
    return {"status": "queued"}
```

## API Error Model Strategy

Define one consistent error response shape and centralize mappings:

- validation error
- not found
- conflict
- dependency unavailable
- internal error

Clients become simpler and safer when error payload shape is stable.

## Testing Strategy (FastAPI)

1. Unit test service functions without FastAPI imports.
2. Router tests with `TestClient` for status, headers, and payload contracts.
3. Integration tests for DB + outbound HTTP interactions.
4. Failure-path tests for timeout, 4xx, 5xx, malformed payloads.

## Performance + Reliability Checklist

1. Reuse DB and HTTP clients via lifespan hooks.
2. Never call blocking IO directly inside `async` endpoints.
3. Apply timeout budgets to all outbound dependencies.
4. Add concurrency limits around expensive downstream calls.
5. Add structured logs for request start/end and dependency latency.
