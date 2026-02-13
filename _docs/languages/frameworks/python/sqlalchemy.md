---
title: SQLAlchemy
description: Python database toolkit and ORM patterns for robust persistence layers, transaction safety, and query composition.
permalink: /languages/frameworks/python/sqlalchemy/
---

## Big Picture

`SQLAlchemy` is both:

- a SQL toolkit (explicit SQL expression layer)
- an ORM (mapped classes + unit of work)

Use it when you need strong control over data access patterns without giving up productivity.

## Core Concepts

- **Engine**: database connectivity + pooling
- **Session**: unit-of-work and transaction scope
- **ORM models**: Python classes mapped to tables
- **SQL Expression API**: composable SQL without hand-writing every query
- **Migrations**: schema evolution via Alembic (ecosystem standard)

## SQLAlchemy 2.x Mental Model

Prefer explicit `Session` boundaries and 2.x style queries:

- `select(Model)` instead of legacy query APIs
- explicit transaction blocks (`session.begin()`)
- explicit commit/rollback semantics

## Example: Basic ORM Setup + CRUD

```python
from __future__ import annotations

from sqlalchemy import String, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))


engine = create_engine("sqlite+pysqlite:///app.db", echo=False)
Base.metadata.create_all(engine)

# Create
with Session(engine) as session:
    with session.begin():
        session.add(User(email="ada@example.com", name="Ada"))

# Read
with Session(engine) as session:
    stmt = select(User).where(User.email == "ada@example.com")
    user = session.scalar(stmt)
    print(user.name if user else "not found")

# Update
with Session(engine) as session:
    with session.begin():
        user = session.scalar(select(User).where(User.email == "ada@example.com"))
        if user:
            user.name = "Ada Lovelace"

# Delete
with Session(engine) as session:
    with session.begin():
        user = session.scalar(select(User).where(User.email == "ada@example.com"))
        if user:
            session.delete(user)
```

## Example: Transaction Boundary with Rollback Safety

```python
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

engine = create_engine("sqlite+pysqlite:///app.db")


def transfer(session: Session, from_id: int, to_id: int, amount: int) -> None:
    if amount <= 0:
        raise ValueError("amount must be positive")

    # Simplified sketch; real code should validate existence and balances robustly.
    session.execute(text("UPDATE accounts SET balance = balance - :amt WHERE id = :id"), {"amt": amount, "id": from_id})
    session.execute(text("UPDATE accounts SET balance = balance + :amt WHERE id = :id"), {"amt": amount, "id": to_id})


with Session(engine) as session:
    try:
        with session.begin():
            transfer(session, from_id=1, to_id=2, amount=50)
    except Exception:
        # session.begin() already rolls back on exception
        raise
```

## Example: Async SQLAlchemy (2.x)

```python
import asyncio

from sqlalchemy import String, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))


async def main() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///async.db")
    SessionFactory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionFactory() as session:
        async with session.begin():
            session.add(Item(name="widget"))

    async with SessionFactory() as session:
        item = await session.scalar(select(Item).where(Item.name == "widget"))
        print(item.name if item else "not found")

    await engine.dispose()


asyncio.run(main())
```

## Tradeoffs

### Pros

- mature and widely adopted
- strong balance between ORM ergonomics and explicit SQL control
- robust transaction and pooling model
- excellent introspection/logging for debugging SQL behavior

### Cons

- abstraction can hide expensive query patterns if not monitored
- learning curve around session lifecycle and relationship loading
- migration discipline is still required (Alembic or equivalent)

## Edge Cases and Gotchas

1. Session scope confusion:
   Treat session as request/unit-of-work scoped, not global mutable singleton.
2. N+1 query issues:
   Use eager loading strategies (`selectinload`, `joinedload`) deliberately.
3. Implicit transaction assumptions:
   Always define transaction boundaries explicitly in service code.
4. Connection pool starvation:
   Ensure sessions are closed promptly (`with Session(...)`).
5. Async misuse:
   Do not mix sync/async engines/sessions accidentally.
6. SQLite concurrency limitations:
   SQLite is great for local/dev and many embedded workflows, but not a direct drop-in for high-write multi-process production patterns.

## When To Use SQLAlchemy vs Alternatives

- Use SQLAlchemy when you need flexible SQL + ORM model mapping.
- Use lighter query layers for very simple CRUD services.
- Use direct SQL for highly specialized query performance paths.

## Documentation Links

- SQLAlchemy 2.0 docs: [docs.sqlalchemy.org/en/20](https://docs.sqlalchemy.org/en/20/)
- ORM quickstart: [docs.sqlalchemy.org/en/20/orm/quickstart.html](https://docs.sqlalchemy.org/en/20/orm/quickstart.html)
- Session basics: [docs.sqlalchemy.org/en/20/orm/session_basics.html](https://docs.sqlalchemy.org/en/20/orm/session_basics.html)
- SQL Expression API: [docs.sqlalchemy.org/en/20/core](https://docs.sqlalchemy.org/en/20/core/)
- Asyncio integration: [docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- Alembic migrations: [alembic.sqlalchemy.org](https://alembic.sqlalchemy.org/)
- Python stdlib `sqlite3` (baseline comparison): [docs.python.org/3/library/sqlite3.html](https://docs.python.org/3/library/sqlite3.html)

## Deep Dive Cookbook Additions

### Architecture Pattern: Repository + Unit of Work

- handlers/services operate on business intents
- repository layer encapsulates query details
- session scope defines transaction boundary

This pattern keeps SQL concerns isolated and testable.

### How-To: Avoid N+1 with Eager Loading

```python
from sqlalchemy import select
from sqlalchemy.orm import selectinload


def list_users_with_orders(session):
    stmt = select(User).options(selectinload(User.orders))
    return session.scalars(stmt).all()
```

### How-To: Pagination Pattern

```python
from sqlalchemy import select


def list_page(session, page: int, page_size: int):
    offset = (page - 1) * page_size
    stmt = select(User).order_by(User.id).offset(offset).limit(page_size)
    return session.scalars(stmt).all()
```

### Testing Strategy

1. Unit test query-building helpers with deterministic fixtures.
2. Integration test against real DB engine (test container or ephemeral DB).
3. Validate migration forward/backward scripts in CI.

### Operational Guidance

- Enable SQL logging in non-prod diagnostics mode.
- Track slow-query metrics by statement fingerprint.
- Keep transaction scope short; no network calls inside DB transaction when possible.

## Session and Transaction Semantics (Deep Dive)

Think of a `Session` as a unit-of-work context, not just a query object.

- one request/job -> one session scope
- transaction begins when needed and ends deterministically
- objects are identity-mapped within session scope

This explains many beginner surprises around stale objects and unintended writes.

## Complete Example: Repository + Unit of Work

```python
from __future__ import annotations

from dataclasses import dataclass
from sqlalchemy import String, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker


class Base(DeclarativeBase):
    pass


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True)
    balance_cents: Mapped[int] = mapped_column(default=0)


@dataclass
class AccountRepo:
    session: Session

    def get(self, account_id: int) -> Account | None:
        return self.session.scalar(select(Account).where(Account.id == account_id))

    def add(self, account: Account) -> None:
        self.session.add(account)


class UnitOfWork:
    def __init__(self, session_factory: sessionmaker[Session]):
        self._factory = session_factory
        self.session: Session | None = None

    def __enter__(self) -> "UnitOfWork":
        self.session = self._factory()
        self.session.begin()
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        assert self.session is not None
        try:
            if exc_type is None:
                self.session.commit()
            else:
                self.session.rollback()
        finally:
            self.session.close()


engine = create_engine("sqlite+pysqlite:///uow.db", echo=False)
Base.metadata.create_all(engine)
SessionFactory = sessionmaker(engine, expire_on_commit=False)

with UnitOfWork(SessionFactory) as uow:
    repo = AccountRepo(uow.session)
    repo.add(Account(email="ada@example.com", balance_cents=5000))
```

## How-To: Relationship Loading Strategy

Choose relationship strategy intentionally:

- `selectinload`: good default for one-to-many collections
- `joinedload`: useful for one-to-one/small related sets
- lazy load: acceptable only when query volume is known/small

Always inspect query counts in integration tests for list endpoints.

## How-To: Safe Pagination with Stable Ordering

```python
from sqlalchemy import select


def list_users_page(session: Session, cursor_id: int | None, page_size: int = 50):
    stmt = select(User).order_by(User.id).limit(page_size)
    if cursor_id is not None:
        stmt = stmt.where(User.id > cursor_id)
    return session.scalars(stmt).all()
```

Cursor-based pagination is usually more stable than offset pagination on frequently-changing tables.

## Alembic Migration Workflow (Practical)

1. generate migration from model change
2. review SQL manually (indexes, constraints, nullability)
3. run migration on staging snapshot
4. validate app compatibility with old and new schema during rollout window
5. keep rollback strategy ready for destructive changes

## SQLAlchemy Performance Checklist

1. inspect generated SQL for critical paths
2. keep transactions short and free of network calls
3. use bulk operations carefully and benchmark
4. index columns used in joins/filters/order-by
5. monitor pool checkout wait time and query latency

## Common Pitfalls

1. Sharing one session globally across requests.
2. Mixing ORM and raw SQL writes without understanding identity map effects.
3. Accidentally triggering N+1 in serialization loops.
4. Treating SQLite behavior as identical to Postgres/MySQL in concurrency semantics.
