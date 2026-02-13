---
title: Logging
description: Cross-language logging architecture for Python, Rust, and Go, from fundamentals to structured production patterns.
permalink: /languages/general/logging/
---

## Why Logging Matters

Logging is not just printing text. In production systems, logs are part of your runtime control plane.

Good logging should answer:

1. What happened?
2. When did it happen?
3. Where did it happen?
4. Why did it fail or behave unexpectedly?
5. Which request/job/user/entity did it affect?

## Universal Logging Principles

### Levels

Use stable semantic levels:

- `DEBUG`: diagnostic detail for development/debug sessions
- `INFO`: expected lifecycle events and key state transitions
- `WARN`: unusual but recoverable conditions
- `ERROR`: failed operation requiring attention

### Structured vs Unstructured

Prefer structured logs (`key=value` or JSON fields) over free-form strings.

Why:

- machine queryable
- easier aggregation/filtering
- safer schema evolution

### Context Fields (High-Value)

Always consider attaching:

- `request_id` / `trace_id`
- `user_id` or domain entity id
- `operation` name
- `component` or module
- latency (`duration_ms`)
- error classification

## Cross-Language Design Pattern

Use this consistent architecture for all languages:

1. Application code emits events with context fields.
2. Logger pipeline filters by level/module/component.
3. Pipeline routes events to one or more destinations.
4. Downstream tooling aggregates/searches/alerts.

Typical destinations:

- stdout/stderr (containers, platform-native collection)
- rotating file sink
- remote sink (syslog, OpenTelemetry collector, log platform)

## Python Logging (Basics -> Advanced)

### Basic Setup (`logging` stdlib)

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

log = logging.getLogger("payments.service")
log.info("service started")
log.warning("cache miss", extra={"key": "user:42"})
```

### Multiple Destinations (Console + Rotating File)

```python
import logging
from logging.handlers import RotatingFileHandler


def build_logger() -> logging.Logger:
    logger = logging.getLogger("app")
    logger.setLevel(logging.INFO)
    logger.propagate = False

    fmt = logging.Formatter(
        "%(asctime)s %(levelname)s %(name)s %(message)s"
    )

    console = logging.StreamHandler()
    console.setLevel(logging.INFO)
    console.setFormatter(fmt)

    file_handler = RotatingFileHandler(
        "app.log",
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(fmt)

    logger.handlers.clear()
    logger.addHandler(console)
    logger.addHandler(file_handler)
    return logger


log = build_logger()
log.info("startup complete")
```

### Filtering (Level + Custom Filter)

```python
import logging


class DropHealthChecks(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        msg = record.getMessage()
        return "GET /health" not in msg


logger = logging.getLogger("http")
handler = logging.StreamHandler()
handler.addFilter(DropHealthChecks())
logger.addHandler(handler)
logger.setLevel(logging.INFO)
```

### Structured Logging Pattern

- Option 1: custom formatter emitting JSON.
- Option 2: `structlog` ecosystem for richer structured pipelines.

For service platforms, JSON logs to stdout are usually easiest to ingest.

### Advanced: Async-Safe Pipeline

For high-throughput apps, use `QueueHandler` + `QueueListener` to decouple application threads from sink IO latency.

### Python Best Practices

1. Use module-level loggers (`logging.getLogger(__name__)`).
2. Configure logging once at process startup.
3. Avoid `basicConfig` in reusable libraries.
4. Redact secrets/tokens/PII before logging.
5. Keep high-cardinality data out of top-level message text.

## Rust Logging (Basics -> Advanced)

Rust has no one built-in logging pipeline. Common production stack:

- `tracing` for structured events and spans
- `tracing-subscriber` for filtering/formatting/layering
- optionally `tracing-appender` for non-blocking file sinks

### Basic Structured Logging with `tracing`

```rust
use tracing::{debug, error, info, warn};

fn main() {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    info!(service = "billing", "startup complete");
    warn!(operation = "cache_lookup", key = "user:42", "cache miss");
    error!(code = "DB_TIMEOUT", "database operation failed");
    debug!("this is hidden at INFO level");
}
```

### Multiple Destinations (stdout + file layers)

```rust
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

fn init_logging() -> tracing_appender::non_blocking::WorkerGuard {
    let env_filter = EnvFilter::new("info,my_app::db=warn,my_app::http=debug");
    let file_appender = tracing_appender::rolling::daily("./logs", "app.log");
    let (file_writer, guard) = tracing_appender::non_blocking(file_appender);

    let stdout_layer = fmt::layer()
        .with_writer(std::io::stdout)
        .with_target(true);

    let file_layer = fmt::layer()
        .with_ansi(false)
        .with_writer(file_writer)
        .with_target(true);

    tracing_subscriber::registry()
        .with(env_filter)
        .with(stdout_layer)
        .with(file_layer)
        .init();

    guard
}
```

For production file sinks, prefer non-blocking appenders and rotation (`tracing-appender`).

### Filtering

`EnvFilter` supports module-level directives:

- `info`
- `my_app=debug`
- `my_app::sql=trace,hyper=warn`

This gives fast runtime control without code changes.

### Spans and Context Propagation

Use spans for scoped context:

```rust
use tracing::{info, info_span};

fn handle_request(req_id: &str, user_id: u64) {
    let span = info_span!("http_request", request_id = req_id, user_id = user_id);
    let _guard = span.enter();

    info!(operation = "load_profile", "begin");
    info!(operation = "load_profile", "complete");
}
```

All events inside the span inherit context fields.

### Rust Best Practices

1. Use structured fields; avoid long free-form blobs.
2. Keep `trace/debug` high-volume logs gated by filters.
3. Prefer spans for request/job scope.
4. Standardize error fields (`error.class`, `error.msg`, `retryable`).
5. Avoid expensive string formatting when log level may drop event.

## Go Logging (Basics -> Advanced)

For modern Go, use `log/slog` (Go 1.21+).

### Basic Structured Logging

```go
package main

import (
	"log/slog"
	"os"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	slog.Info("service started", "service", "payments")
	slog.Warn("cache miss", "key", "user:42")
	slog.Error("db timeout", "operation", "load_invoice", "retryable", true)
}
```

### Multiple Destinations (stdout + file)

```go
package main

import (
	"io"
	"log/slog"
	"os"
)

func main() {
	f, err := os.OpenFile("app.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		panic(err)
	}
	defer f.Close()

	writer := io.MultiWriter(os.Stdout, f)
	handler := slog.NewJSONHandler(writer, &slog.HandlerOptions{Level: slog.LevelInfo})
	logger := slog.New(handler)

	logger.Info("startup complete", "component", "api")
}
```

### Filtering and Dynamic Level Control

```go
package main

import (
	"log/slog"
	"os"
)

func main() {
	var level slog.LevelVar
	level.Set(slog.LevelInfo)

	h := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: &level})
	logger := slog.New(h)

	logger.Debug("hidden at info")
	level.Set(slog.LevelDebug)
	logger.Debug("visible now")
}
```

### Context Enrichment Pattern

Use `logger.With(...)` for scoped fields:

```go
requestLogger := logger.With("request_id", reqID, "user_id", userID)
requestLogger.Info("request begin")
requestLogger.Info("request complete", "duration_ms", 17)
```

### Go Best Practices

1. Prefer JSON handler for production ingestion.
2. Use `With` for repeated context fields.
3. Keep key names consistent across services.
4. Avoid logging raw request/response bodies by default.
5. Control volume for high-frequency paths.

## Multiple Destinations: Common Strategies

### Strategy A: Single fan-out writer

- easiest to implement
- good for stdout + file
- one sink failure can impact shared write path if not handled carefully

### Strategy B: Separate handlers/layers per sink

- independent filtering and formatting per destination
- better isolation and control
- slightly more setup complexity

### Strategy C: Queue/buffer before sink IO

- protects hot path latency
- smoother handling under sink slowdowns
- requires backpressure/drop policy decisions

## Filtering Patterns

1. **By level**: keep defaults conservative (`INFO` in production).
2. **By component/module**: raise level only for subsystem under investigation.
3. **By event type**: suppress noisy health checks or repetitive probes.
4. **By sampling**: sample repetitive success logs at high QPS.

## Security and Compliance

1. Never log secrets (tokens, passwords, private keys).
2. Minimize or hash PII where possible.
3. Add redaction filters before sink output.
4. Define retention and access policy with compliance constraints.

## Performance Considerations

1. Logging can become a bottleneck under load.
2. Prefer async/non-blocking sinks for high-throughput systems.
3. Avoid large payload serialization on hot paths.
4. Cap log size and rotate files where needed.

## Testing Logging Behavior

1. Assert critical error paths emit expected structured fields.
2. Test redaction behavior explicitly.
3. Test filter rules (what is suppressed vs emitted).
4. Validate multi-destination setup in integration tests.

## Anti-Patterns

1. Logging everything at `INFO` without curation.
2. Using logs as primary metrics system.
3. Embedding unstructured data blobs in message text.
4. Emitting different key names for same semantic field across services.
5. Logging and then swallowing errors with no propagation policy.

## Production Checklist

1. Define log schema (keys, levels, required fields).
2. Decide sink topology (stdout/file/remote) and failure behavior.
3. Set baseline filters and runtime override strategy.
4. Add correlation IDs everywhere request/job boundaries exist.
5. Add redaction and compliance checks.
6. Verify logging overhead under load test.
