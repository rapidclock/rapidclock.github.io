---
title: Python Frameworks
description: Deep dives into core Python frameworks and libraries for data, APIs, validation, networking, and testing.
permalink: /languages/frameworks/python/
---

## Big Picture

Python's framework ecosystem is broad, so architecture quality depends on selecting by workload:

- data processing: `pandas`, `numpy`, `scipy`
- schema and validation: `pydantic`
- APIs/services: `fastapi`
- network and SSH automation: `httpx`, `requests`, `asyncssh`
- test quality: `pytest`, `unittest`, and robust mocking strategy

## Framework Deep Dives

- [Pandas]({{ '/languages/frameworks/python/pandas/' | relative_url }})
- [NumPy + SciPy]({{ '/languages/frameworks/python/numpy-scipy/' | relative_url }})
- [Pydantic]({{ '/languages/frameworks/python/pydantic/' | relative_url }})
- [FastAPI]({{ '/languages/frameworks/python/fastapi/' | relative_url }})
- [AsyncSSH]({{ '/languages/frameworks/python/asyncssh/' | relative_url }})
- [HTTPX]({{ '/languages/frameworks/python/httpx/' | relative_url }})
- [Requests]({{ '/languages/frameworks/python/requests/' | relative_url }})
- [SQLAlchemy]({{ '/languages/frameworks/python/sqlalchemy/' | relative_url }})
- [Pytest + Unittest + Mocking]({{ '/languages/frameworks/python/testing-mocking/' | relative_url }})

## Quick Selection

| Need | Strong first choice |
| --- | --- |
| tabular ETL and analytics | `pandas` |
| high-performance vector math | `numpy` |
| scientific algorithms/optimization/stats | `scipy` |
| request/response validation | `pydantic` |
| async API service | `fastapi` |
| async SSH orchestration | `asyncssh` |
| modern sync+async HTTP client | `httpx` |
| battle-tested sync HTTP client | `requests` |
| ORM and SQL abstraction | `sqlalchemy` |
| testing + advanced mocks | `pytest` with `unittest.mock` |

## Documentation Links

- Pandas: [pandas.pydata.org/docs](https://pandas.pydata.org/docs/)
- NumPy: [numpy.org/doc](https://numpy.org/doc/)
- SciPy: [docs.scipy.org/doc/scipy](https://docs.scipy.org/doc/scipy/)
- Pydantic: [docs.pydantic.dev](https://docs.pydantic.dev/)
- FastAPI: [fastapi.tiangolo.com](https://fastapi.tiangolo.com/)
- AsyncSSH: [asyncssh.readthedocs.io](https://asyncssh.readthedocs.io/)
- HTTPX: [www.python-httpx.org](https://www.python-httpx.org/)
- Requests: [requests.readthedocs.io](https://requests.readthedocs.io/)
- SQLAlchemy: [docs.sqlalchemy.org](https://docs.sqlalchemy.org/)
- Pytest: [docs.pytest.org](https://docs.pytest.org/)
- Unittest: [docs.python.org/3/library/unittest.html](https://docs.python.org/3/library/unittest.html)
- `unittest.mock`: [docs.python.org/3/library/unittest.mock.html](https://docs.python.org/3/library/unittest.mock.html)

## Architecture Playbooks

### Data-heavy backend

- ingestion and shaping: `pandas`
- numerical/scientific transforms: `numpy` + `scipy`
- API boundary: `fastapi` + `pydantic`
- outbound integrations: `httpx`

### API-first backend

- service framework: `fastapi`
- contracts: `pydantic`
- persistence: `sqlalchemy`
- testing: `pytest` + targeted mocks + integration DB tests

### Ops/automation-heavy platform tooling

- remote orchestration: `asyncssh`
- HTTP integrations: `httpx`/`requests`
- schema/config validation: `pydantic`

## Operational Guidance

1. Prefer one canonical HTTP client in a service (`httpx` or `requests`) to avoid inconsistent timeout/retry behavior.
2. Keep `pydantic` at boundaries; avoid validating every internal object on hot paths.
3. For data pipelines, document dataframe schemas after each major transform stage.
4. For SQLAlchemy services, define transaction and session scope once and enforce it in architecture docs.

## Detailed Selection Guide

| Constraint | Prefer | Avoid first | Notes |
| --- | --- | --- | --- |
| strict API contracts | `fastapi` + `pydantic` | ad-hoc dict parsing | contract drift becomes expensive quickly |
| heavy tabular wrangling | `pandas` | manual row loops | add dtype checks to avoid silent coercion |
| numerical optimization/stats | `numpy` + `scipy` | pure Python loops | choose stable solver/test convergence |
| sync legacy integration | `requests` | async stack if not needed | simpler operational model in sync apps |
| async service integrations | `httpx` async client | one-off per-call clients | centralize client lifecycle and timeouts |
| DB-rich service layer | `sqlalchemy` | string SQL in handlers | isolate data access in repositories |

## Integration Blueprints

### FastAPI + Pydantic + SQLAlchemy (Service API)

- transport boundary: FastAPI route + response model
- input contract: Pydantic request model
- business layer: service functions (pure logic + policy)
- persistence boundary: SQLAlchemy session/repository
- outbound calls: HTTPX client injected as dependency

### Data + API hybrid service

- background ingestion: Pandas transforms + validation checks
- materialization: write curated tables/parquet
- API layer: FastAPI endpoints over curated datasets
- compute-heavy subroutines: NumPy/SciPy for vectorized work

### Operations platform workflow

- AsyncSSH for host execution
- HTTPX for control-plane APIs
- Pydantic models for command manifests and result envelopes
- Pytest contract tests for external integration assumptions

## Codebase Structure Template

```text
service/
  api/
    routers/
    deps.py
  domain/
    models.py
    services.py
  infra/
    db.py
    http_client.py
    ssh_runner.py
  schemas/
    requests.py
    responses.py
  tests/
    unit/
    integration/
    contract/
```

## Production Hardening Checklist (Python Track)

1. One configured HTTP client per process (`httpx` or `requests`), not per call.
2. Global timeout and retry policy docs tied to code constants.
3. Pydantic boundary models versioned for breaking changes.
4. SQLAlchemy session scope explicit and tested.
5. Pandas pipelines assert schema + row count invariants between stages.
6. AsyncSSH automation uses per-host timeout and bounded concurrency.
7. Pytest suite includes failure-path tests for every external dependency.

## Upgrade and Compatibility Notes

- Pin major versions of `pydantic`, `fastapi`, and `sqlalchemy` together in services with strong typing contracts.
- Treat `pandas` and `numpy` upgrades as compatibility events: run fixture-based regression tests.
- Capture third-party API schema assumptions in tests to detect upstream changes early.
