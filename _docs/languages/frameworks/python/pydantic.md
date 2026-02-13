---
title: Pydantic
description: Runtime data validation and typed models for API boundaries and configuration.
permalink: /languages/frameworks/python/pydantic/
---

## Big Picture

`pydantic` converts untrusted input into strongly typed Python objects.

It is best used at boundaries:

- API request/response payloads
- environment/config parsing
- event/message validation

## Core Concepts

- `BaseModel`: typed schema + validation logic
- field validators: per-field and cross-field constraints
- strict vs coercive validation
- serialization via `model_dump()` / `model_dump_json()`

## Example: API Payload Validation

```python
from pydantic import BaseModel, Field, ValidationError


class CreateUserRequest(BaseModel):
    email: str
    age: int = Field(ge=13, le=120)
    is_admin: bool = False


try:
    req = CreateUserRequest.model_validate({"email": "ada@example.com", "age": 18})
    print(req.model_dump())
except ValidationError as exc:
    print(exc)
```

## Example: Cross-Field Rules

```python
from pydantic import BaseModel, field_validator, model_validator


class PasswordReset(BaseModel):
    user_id: int
    token: str
    new_password: str

    @field_validator("token")
    @classmethod
    def token_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("token cannot be blank")
        return v

    @model_validator(mode="after")
    def password_strength(self):
        if len(self.new_password) < 12:
            raise ValueError("new_password must be at least 12 chars")
        return self
```

## Tradeoffs

### Pros

- extremely clear boundary validation
- great error messages for clients and developers
- strong FastAPI integration

### Cons

- adds runtime validation overhead
- over-validation of internal trusted data can reduce throughput
- migration differences between major versions require care

## Edge Cases and Gotchas

1. Coercion vs strictness:
   decide whether string `"1"` should become int `1`.
2. Mutable defaults:
   use `default_factory` for lists/maps.
3. Hidden schema drift:
   pin model versions for external integrations.
4. Error surface size:
   sanitize validation messages before exposing to external clients.

## Documentation Links

- Pydantic docs: [docs.pydantic.dev/latest](https://docs.pydantic.dev/latest/)
- Model config: [docs.pydantic.dev/latest/concepts/config](https://docs.pydantic.dev/latest/concepts/config/)
- Validators: [docs.pydantic.dev/latest/concepts/validators](https://docs.pydantic.dev/latest/concepts/validators/)

## Deep Dive Cookbook Additions

### Schema Evolution Strategy

- Version API models (`V1`, `V2`) rather than silently changing one model.
- Keep old fields with defaults during deprecation windows.
- Validate and normalize at ingress, keep internal models stable.

### How-To: Discriminated Union for Event Streams

```python
from typing import Literal, Union
from pydantic import BaseModel, Field


class UserCreated(BaseModel):
    type: Literal["user_created"]
    user_id: int


class UserDeleted(BaseModel):
    type: Literal["user_deleted"]
    user_id: int
    reason: str


Event = Union[UserCreated, UserDeleted]


class Envelope(BaseModel):
    event: Event = Field(discriminator="type")
```

### How-To: Strict Mode for Security-Critical Boundaries

```python
from pydantic import BaseModel, ConfigDict


class StrictPayload(BaseModel):
    model_config = ConfigDict(strict=True)
    retries: int
    timeout_ms: int
```

### Operational Guidance

1. Log validation failures with request correlation IDs.
2. Hide sensitive field values in error outputs.
3. Keep boundary models separate from persistence models.
4. Benchmark validation overhead on hot endpoints.

## Boundary Modeling Strategy

A practical pattern is to define three model layers:

1. Inbound models: untrusted payloads from API/webhooks/events.
2. Internal command models: normalized data for business logic.
3. Outbound models: explicit response/event shapes.

This avoids leaking transport-specific quirks into business logic.

## Complete Example: Versioned Event Envelope

```python
from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, ValidationError


class Meta(BaseModel):
    model_config = ConfigDict(extra="forbid")

    request_id: str
    source: str


class UserCreatedV1(BaseModel):
    kind: Literal["user_created.v1"]
    user_id: int
    email: str


class UserCreatedV2(BaseModel):
    kind: Literal["user_created.v2"]
    user_id: int
    email: str
    country: str = Field(min_length=2, max_length=2)


class Envelope(BaseModel):
    model_config = ConfigDict(extra="forbid")

    meta: Meta
    event: UserCreatedV1 | UserCreatedV2 = Field(discriminator="kind")


def parse_event(payload: dict) -> Envelope:
    return Envelope.model_validate(payload)


if __name__ == "__main__":
    raw = {
        "meta": {"request_id": "req-1", "source": "signup-api"},
        "event": {"kind": "user_created.v2", "user_id": 9, "email": "ada@example.com", "country": "US"},
    }

    try:
        env = parse_event(raw)
        print(env.model_dump())
    except ValidationError as exc:
        print(exc)
```

## How-To: Strict Settings from Environment

```python
from pydantic import BaseModel, ConfigDict, ValidationError


class AppConfig(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    port: int
    debug: bool
    db_url: str


def load_config(raw: dict) -> AppConfig:
    return AppConfig.model_validate(raw)
```

Use strict mode for security-critical configs so incorrect types fail fast instead of being coerced.

## How-To: Safe Normalization Layer

```python
from pydantic import BaseModel, EmailStr, field_validator


class SignupIn(BaseModel):
    email: EmailStr
    name: str

    @field_validator("name")
    @classmethod
    def normalize_name(cls, v: str) -> str:
        out = " ".join(v.split())
        if len(out) < 2:
            raise ValueError("name too short")
        return out
```

Validation should both reject bad input and normalize acceptable input.

## Error Handling Pattern

- log internal validation errors with request ID and source
- map errors to stable client-facing response format
- avoid leaking sensitive raw values in external error messages

## Performance Guidance

1. Validate aggressively at boundaries; avoid repeated validation in deep internal loops.
2. Reuse models/types instead of generating dynamic models at runtime.
3. Use `model_dump(exclude_none=True)` to reduce payload size when appropriate.
4. Benchmark hot endpoints if payload volume is high.

## Common Pitfalls

1. One giant model for all API versions instead of explicit versioned models.
2. Treating optional fields as semantically equivalent to missing fields.
3. Exposing raw Pydantic error strings directly in public APIs.
4. Running heavy business logic inside validators.
