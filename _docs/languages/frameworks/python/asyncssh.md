---
title: AsyncSSH
description: Async SSH client/server library for high-concurrency remote command execution and file transfer.
permalink: /languages/frameworks/python/asyncssh/
---

## Big Picture

`asyncssh` gives you async-native SSH workflows:

- run commands across many hosts concurrently
- manage SFTP/SCP flows without blocking threads
- build SSH automation in one event loop

## Core Concepts

- connection context managers (`asyncssh.connect`)
- command execution (`conn.run`)
- host key verification and known-hosts policy
- concurrency control with semaphores

## Example: Run Command Across Hosts with Concurrency Limit

```python
import asyncio
import asyncssh


async def run_on_host(host: str, sem: asyncio.Semaphore) -> tuple[str, str]:
    async with sem:
        async with asyncssh.connect(host, username="deploy") as conn:
            result = await conn.run("uname -a", check=True)
            return host, result.stdout.strip()


async def main() -> None:
    hosts = ["srv-1.example", "srv-2.example", "srv-3.example"]
    sem = asyncio.Semaphore(10)

    tasks = [run_on_host(h, sem) for h in hosts]
    for host, output in await asyncio.gather(*tasks):
        print(host, output)


if __name__ == "__main__":
    asyncio.run(main())
```

## Example: Upload File with SFTP

```python
import asyncio
import asyncssh


async def upload(host: str, local: str, remote: str) -> None:
    async with asyncssh.connect(host, username="deploy") as conn:
        async with conn.start_sftp_client() as sftp:
            await sftp.put(local, remote)


asyncio.run(upload("srv-1.example", "build.tar.gz", "/tmp/build.tar.gz"))
```

## Tradeoffs

### Pros

- async-native SSH at scale
- single event loop controls many sessions
- mature SSH feature set

### Cons

- event-loop lifecycle mistakes can leak sessions
- cryptography/SSH policy complexity in enterprise environments
- debugging distributed failures needs strong logging

## Edge Cases and Gotchas

1. Host key policy:
   do not disable host key checks in production.
2. Connection storms:
   cap concurrency with semaphore to protect bastions/targets.
3. Long-running commands:
   set explicit command timeouts.
4. Partial failure handling:
   aggregate per-host success/failure rather than all-or-nothing.

## Documentation Links

- AsyncSSH docs: [asyncssh.readthedocs.io](https://asyncssh.readthedocs.io/)
- API reference: [asyncssh.readthedocs.io/en/latest/api.html](https://asyncssh.readthedocs.io/en/latest/api.html)
- Python `asyncio`: [docs.python.org/3/library/asyncio.html](https://docs.python.org/3/library/asyncio.html)

## Deep Dive Cookbook Additions

### Fleet Orchestration Pattern

Use explicit result envelopes per host:

- host
- success flag
- stdout/stderr snippet
- duration
- error classification

This makes large fan-out runs debuggable and retryable.

### How-To: Per-Host Timeout + Error Capture

```python
import asyncio
import asyncssh


async def run_checked(host: str) -> dict[str, str]:
    try:
        async with asyncssh.connect(host, username="deploy") as conn:
            result = await asyncio.wait_for(conn.run("uptime", check=True), timeout=10)
            return {"host": host, "status": "ok", "out": result.stdout.strip()}
    except Exception as exc:
        return {"host": host, "status": "error", "out": str(exc)}
```

### How-To: Bounded Fan-Out Runner

```python
import asyncio


async def run_many(hosts: list[str], runner):
    sem = asyncio.Semaphore(20)

    async def wrapped(h: str):
        async with sem:
            return await runner(h)

    return await asyncio.gather(*(wrapped(h) for h in hosts))
```

### Operational Guidance

1. Pin host key policy explicitly.
2. Log remote command, host, duration, exit status.
3. Separate retryable transport errors from command failures.
4. Use staged rollouts (small host batches first).

## Execution Model for Fleet Automation

At scale, treat each remote command as a bounded operation with explicit metadata:

- host
- command
- start/end time
- exit code
- stdout/stderr preview
- error class (auth, network, timeout, command)

This makes reruns and incident review practical.

## Complete Example: Batched Runner with Classification

```python
from __future__ import annotations

import asyncio
from dataclasses import dataclass
import asyncssh


@dataclass
class HostResult:
    host: str
    ok: bool
    category: str
    output: str


async def run_one(host: str, command: str, timeout_sec: float) -> HostResult:
    try:
        async with asyncssh.connect(host, username="deploy") as conn:
            result = await asyncio.wait_for(conn.run(command, check=False), timeout=timeout_sec)
            if result.exit_status == 0:
                return HostResult(host=host, ok=True, category="ok", output=result.stdout.strip())
            return HostResult(host=host, ok=False, category="command", output=result.stderr.strip())
    except asyncio.TimeoutError:
        return HostResult(host=host, ok=False, category="timeout", output="timed out")
    except asyncssh.PermissionDenied:
        return HostResult(host=host, ok=False, category="auth", output="permission denied")
    except Exception as exc:
        return HostResult(host=host, ok=False, category="network", output=str(exc))


async def run_fleet(hosts: list[str], command: str, max_concurrency: int = 20) -> list[HostResult]:
    sem = asyncio.Semaphore(max_concurrency)

    async def wrapped(h: str) -> HostResult:
        async with sem:
            return await run_one(h, command, timeout_sec=15)

    return await asyncio.gather(*(wrapped(h) for h in hosts))
```

## How-To: Safe Retry Policy

Retry only transient transport categories, not command failures:

1. retry: network reset, temporary DNS, connection timeout
2. do not retry by default: authentication errors, non-zero command exit
3. always cap attempts and use jittered backoff

## Security Guidance

1. Enforce known-host verification in production.
2. Prefer key-based auth with restricted principals.
3. Avoid building shell commands from untrusted input.
4. Redact secrets from command logs and error output.

## Operations Checklist

1. Fan-out in progressive batches (canary -> larger waves).
2. Collect per-host duration metrics.
3. Persist full result envelope to file/DB for auditability.
4. Keep command idempotency in mind before enabling retries.
5. Define stop conditions (abort threshold) for fleet-wide failures.
