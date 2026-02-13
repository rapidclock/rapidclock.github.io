---
title: Tower + Axum
description: Layered Rust web-service architecture using Tower middleware abstractions and Axum routing.
permalink: /languages/frameworks/rust/tower-axum/
---

## Big Picture

`axum` is a web framework built around Tower's service/middleware model.

Use this stack when you need:

- typed HTTP handlers
- composable middleware layers
- strong integration with Tokio and Hyper ecosystem

## Core Concepts

- handlers return `impl IntoResponse`
- shared app state via `State<T>`
- middleware layering via `tower::Layer`
- extractors (`Json`, `Path`, headers, query)

## Example: Typed JSON Endpoint with Shared State

```rust
use axum::{extract::State, routing::get, Json, Router};
use serde::Serialize;
use std::sync::Arc;

#[derive(Clone)]
struct AppState {
    service_name: Arc<String>,
}

#[derive(Serialize)]
struct Health {
    status: &'static str,
    service: String,
}

async fn health(State(state): State<AppState>) -> Json<Health> {
    Json(Health {
        status: "ok",
        service: (*state.service_name).clone(),
    })
}

#[tokio::main]
async fn main() {
    let state = AppState {
        service_name: Arc::new("payments".to_string()),
    };

    let app = Router::new().route("/health", get(health)).with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

## Example: Middleware Layer

```rust
use tower::{Layer, ServiceBuilder};
use tower_http::trace::TraceLayer;

let middleware = ServiceBuilder::new()
    .layer(TraceLayer::new_for_http());
```

This pattern keeps cross-cutting concerns (logging/auth/rate-limit) separate from handlers.

## Tradeoffs

### Pros

- strongly typed and ergonomic handlers
- Tower model scales well for larger services
- excellent middleware composition

### Cons

- generic type signatures can be intimidating early
- some middleware stacks need careful ordering

## Edge Cases and Gotchas

1. Middleware order:
   auth/logging/compression order changes behavior.
2. State ownership:
   clone cheaply (Arc) for shared state.
3. Error mapping:
   standardize domain error -> HTTP response conversion.
4. Request body limits:
   enforce explicit limits for safety.

## Documentation Links

- Axum docs: [docs.rs/axum](https://docs.rs/axum/latest/axum/)
- Tower docs: [docs.rs/tower](https://docs.rs/tower/latest/tower/)
- tower-http middleware: [docs.rs/tower-http](https://docs.rs/tower-http/latest/tower_http/)
- Serde derive: [serde.rs/derive.html](https://serde.rs/derive.html)

## Deep Dive Cookbook Additions

### Middleware Ordering Guidelines

Common order (outer -> inner):

1. request ID / tracing
2. authn/authz
3. rate limit
4. compression
5. handler

### How-To: Error-to-HTTP Mapping Pattern

```rust
use axum::{http::StatusCode, response::IntoResponse, Json};
use serde::Serialize;

#[derive(Serialize)]
struct ErrBody { error: String }

enum AppError { NotFound, BadRequest(String), Internal }

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        match self {
            AppError::NotFound => (StatusCode::NOT_FOUND, Json(ErrBody { error: "not found".into() })).into_response(),
            AppError::BadRequest(m) => (StatusCode::BAD_REQUEST, Json(ErrBody { error: m })).into_response(),
            AppError::Internal => (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrBody { error: "internal".into() })).into_response(),
        }
    }
}
```

### Testing Strategy

- handler unit tests for domain behavior
- router integration tests through `tower::ServiceExt::oneshot`
- middleware behavior tests (auth, rate-limit, trace headers)

## Service Architecture Blueprint

A scalable Axum service usually has these layers:

1. Router layer: route wiring and extractor selection.
2. Handler layer: transport mapping + thin orchestration.
3. Domain/service layer: business logic with framework-agnostic interfaces.
4. Repository/client layer: DB and external dependency adapters.

Keep framework-specific types (`State`, extractors) out of core domain logic.

## Complete Example: Error-Aware Handler Pipeline

```rust
use axum::{extract::State, http::StatusCode, response::IntoResponse, routing::post, Json, Router};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Clone)]
struct AppState {
    service: Arc<UserService>,
}

#[derive(Default)]
struct UserService;

impl UserService {
    fn create_user(&self, email: &str) -> Result<u64, AppError> {
        if !email.contains('@') {
            return Err(AppError::BadRequest("invalid email".into()));
        }
        Ok(42)
    }
}

#[derive(Debug)]
enum AppError {
    BadRequest(String),
    Internal,
}

#[derive(Serialize)]
struct ErrBody {
    error: String,
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        match self {
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, Json(ErrBody { error: msg })).into_response(),
            AppError::Internal => (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrBody { error: "internal".into() }),
            )
                .into_response(),
        }
    }
}

#[derive(Deserialize)]
struct CreateUserIn {
    email: String,
}

#[derive(Serialize)]
struct CreateUserOut {
    id: u64,
}

async fn create_user(
    State(state): State<AppState>,
    Json(payload): Json<CreateUserIn>,
) -> Result<Json<CreateUserOut>, AppError> {
    let id = state.service.create_user(&payload.email)?;
    Ok(Json(CreateUserOut { id }))
}

#[tokio::main]
async fn main() {
    let state = AppState {
        service: Arc::new(UserService::default()),
    };

    let app = Router::new().route("/users", post(create_user)).with_state(state);
    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

## How-To: Layer Timeouts + Concurrency Limits

```rust
use tower::{ServiceBuilder, limit::ConcurrencyLimitLayer, timeout::TimeoutLayer};
use std::time::Duration;

let layers = ServiceBuilder::new()
    .layer(ConcurrencyLimitLayer::new(256))
    .layer(TimeoutLayer::new(Duration::from_secs(3)));
```

Apply limits at the correct scope (global vs route-group specific) based on expected traffic shape.

## Testing Strategy (Axum/Tower)

1. Handler-level tests for domain mapping behavior.
2. Router-level tests using `oneshot` requests.
3. Middleware order tests (auth before business handler, timeout before heavy work).
4. Serialization compatibility tests for response contracts.

## Production Checklist

1. enforce request body size limits
2. standardize error response envelope
3. apply trace/request IDs in middleware
4. define per-route timeout budgets
5. document graceful shutdown and in-flight request behavior
