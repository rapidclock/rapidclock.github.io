---
title: Echo
description: Fast Go web framework with clean middleware model, context helpers, and structured routing.
permalink: /languages/frameworks/go/echo/
---

## Big Picture

`echo` is a popular Go API framework emphasizing middleware ergonomics and clean handler structure.

Use it when you want:

- composable middleware stack
- concise route/handler setup
- straightforward request/response helpers

## Core Concepts

- `echo.Echo` router
- middleware packages (`Recover`, `Logger`, rate-limit, CORS)
- bind + validate flow
- central HTTP error handler customization

## Example: Basic API

```go
package main

import (
    "net/http"

    "github.com/labstack/echo/v4"
    "github.com/labstack/echo/v4/middleware"
)

type CreateUser struct {
    Email string `json:"email"`
}

func main() {
    e := echo.New()
    e.Use(middleware.Logger(), middleware.Recover())

    e.POST("/users", func(c echo.Context) error {
        var req CreateUser
        if err := c.Bind(&req); err != nil {
            return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
        }
        if req.Email == "" {
            return c.JSON(http.StatusBadRequest, map[string]string{"error": "email required"})
        }
        return c.JSON(http.StatusCreated, map[string]any{"id": 1, "email": req.Email})
    })

    _ = e.Start(":8080")
}
```

## Tradeoffs

### Pros

- clean API and strong middleware UX
- good performance profile
- easy customization of error handling and request lifecycle

### Cons

- framework-specific patterns add portability cost
- binding/validation still needs clear domain-level checks

## Edge Cases and Gotchas

1. Binding trust:
   treat bound structs as untrusted until validated.
2. Middleware order:
   auth/logging/recover ordering affects behavior.
3. Error consistency:
   centralize error-to-response mapping.

## Documentation Links

- Echo docs: [echo.labstack.com](https://echo.labstack.com/)
- Echo package docs: [pkg.go.dev/github.com/labstack/echo/v4](https://pkg.go.dev/github.com/labstack/echo/v4)
- Echo middleware docs: [pkg.go.dev/github.com/labstack/echo/v4/middleware](https://pkg.go.dev/github.com/labstack/echo/v4/middleware)
- Go stdlib `context`: [pkg.go.dev/context](https://pkg.go.dev/context)

## Deep Dive Cookbook Additions

### Error Handling Architecture

- define domain error types
- centralize translation to HTTP status codes
- keep handler bodies small and predictable

### How-To: Grouped Middleware

```go
auth := e.Group("/api")
auth.Use(authMiddleware)
auth.GET("/profile", profileHandler)
```

### Testing Guidance

- use `httptest` with Echo context creation
- test binding validation and error responses
- run with race detector in CI

## Endpoint Design Pattern

For maintainable Echo services:

- keep handlers thin (bind/validate/respond)
- keep domain logic in service package
- keep DB queries in repository package

This avoids framework coupling across the entire codebase.

## Complete Example: Centralized Error Handler

```go
package main

import (
    "errors"
    "net/http"

    "github.com/labstack/echo/v4"
    "github.com/labstack/echo/v4/middleware"
)

var ErrNotFound = errors.New("not_found")

type APIError struct {
    Error string `json:"error"`
}

func main() {
    e := echo.New()
    e.Use(middleware.Logger(), middleware.Recover())

    e.HTTPErrorHandler = func(err error, c echo.Context) {
        if errors.Is(err, ErrNotFound) {
            _ = c.JSON(http.StatusNotFound, APIError{Error: "not found"})
            return
        }

        var he *echo.HTTPError
        if errors.As(err, &he) {
            _ = c.JSON(he.Code, APIError{Error: "request failed"})
            return
        }

        _ = c.JSON(http.StatusInternalServerError, APIError{Error: "internal"})
    }

    e.GET("/users/:id", func(c echo.Context) error {
        id := c.Param("id")
        if id == "404" {
            return ErrNotFound
        }
        return c.JSON(http.StatusOK, map[string]string{"id": id})
    })

    _ = e.Start(":8080")
}
```

## How-To: Request Validation Strategy

Echo's bind step parses payloads, but validation policy still needs to be explicit.

Pattern:

1. bind into transport struct
2. validate required/format/range constraints
3. map to domain command struct
4. pass to service layer

This creates a clean trust boundary.

## How-To: Group Middleware by Route Scope

```go
api := e.Group("/api")
api.Use(authMiddleware)

v1 := api.Group("/v1")
v1.GET("/health", healthHandler)
```

Use narrower groups for expensive middleware (auth/rate-limit) when not needed globally.

## Observability + Reliability Checklist

1. request ID propagation (header and context)
2. access logs with latency and status
3. per-route error-rate metrics
4. timeout and cancellation honored in downstream calls
5. graceful shutdown with in-flight request drain

## Common Pitfalls

1. returning raw internal errors to clients
2. assuming `Bind` equals complete validation
3. performing blocking work directly in request goroutine without timeout
4. mixing transport DTOs and domain models
