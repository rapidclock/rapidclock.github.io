---
title: Gin
description: High-performance Go HTTP framework with routing, middleware, and binding helpers.
permalink: /languages/frameworks/go/gin/
---

## Big Picture

`gin` is one of the most widely used Go API frameworks.

Use it when you want:

- quick API scaffolding
- middleware chain ergonomics
- input binding/validation helpers

## Core Concepts

- router groups and route handlers
- middleware chain (`Use`)
- JSON binding (`ShouldBindJSON`)
- context-driven response helpers

## Example: CRUD Skeleton

```go
package main

import (
    "net/http"

    "github.com/gin-gonic/gin"
)

type CreateItem struct {
    Name string `json:"name" binding:"required"`
}

func main() {
    r := gin.Default()

    r.POST("/items", func(c *gin.Context) {
        var req CreateItem
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
            return
        }
        c.JSON(http.StatusCreated, gin.H{"id": 1, "name": req.Name})
    })

    _ = r.Run(":8080")
}
```

## Tradeoffs

### Pros

- very productive for REST APIs
- widely known in Go ecosystem
- built-in middleware and binding patterns

### Cons

- abstraction over `net/http` can hide details newer teams should still learn
- magic-like helper usage can reduce explicitness if overused

## Edge Cases and Gotchas

1. Global middleware misuse:
   scope middleware carefully per route group.
2. Validation assumptions:
   binding tags are not full domain validation.
3. Context lifetime:
   do not store `*gin.Context` beyond request lifecycle.

## Documentation Links

- Gin docs: [gin-gonic.com](https://gin-gonic.com/)
- Gin package docs: [pkg.go.dev/github.com/gin-gonic/gin](https://pkg.go.dev/github.com/gin-gonic/gin)
- Go stdlib `net/http`: [pkg.go.dev/net/http](https://pkg.go.dev/net/http)

## Deep Dive Cookbook Additions

### API Layering Pattern

- transport layer: bind/validate and HTTP response mapping
- service layer: business logic
- repository layer: persistence interactions

### How-To: Route Groups + Versioning

```go
v1 := r.Group("/api/v1")
{
    v1.GET("/health", healthHandler)
    v1.POST("/items", createItemHandler)
}
```

### How-To: Request Timeout Middleware (Sketch)

```go
// Wrap handlers with context timeout derived from request.
// Ensure downstream code respects ctx.Done().
```

### Testing Guidance

- use `httptest.NewRecorder` + router.ServeHTTP
- assert status, response body, headers
- cover middleware behavior explicitly

## Layered Service Template

A robust Gin service usually separates code into:

1. transport handlers (HTTP binding + response)
2. service layer (domain rules)
3. repository layer (DB and external integrations)

Do not pass `*gin.Context` into service/repository layers.

## Complete Example: Handler -> Service -> Repo Flow

```go
package main

import (
    "errors"
    "net/http"

    "github.com/gin-gonic/gin"
)

type User struct {
    ID    int64  `json:"id"`
    Email string `json:"email"`
}

type CreateUserIn struct {
    Email string `json:"email" binding:"required,email"`
}

type UserRepo interface {
    Insert(email string) (User, error)
}

type InMemoryRepo struct {
    nextID int64
}

func (r *InMemoryRepo) Insert(email string) (User, error) {
    if email == "exists@example.com" {
        return User{}, errors.New("duplicate")
    }
    r.nextID++
    return User{ID: r.nextID, Email: email}, nil
}

type UserService struct {
    repo UserRepo
}

func (s UserService) Create(email string) (User, error) {
    return s.repo.Insert(email)
}

func main() {
    repo := &InMemoryRepo{}
    svc := UserService{repo: repo}

    r := gin.Default()

    r.POST("/users", func(c *gin.Context) {
        var req CreateUserIn
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
            return
        }

        user, err := svc.Create(req.Email)
        if err != nil {
            if err.Error() == "duplicate" {
                c.JSON(http.StatusConflict, gin.H{"error": "email already exists"})
                return
            }
            c.JSON(http.StatusInternalServerError, gin.H{"error": "internal"})
            return
        }

        c.JSON(http.StatusCreated, user)
    })

    _ = r.Run(":8080")
}
```

## How-To: Request Context Timeouts

```go
import (
    "context"
    "time"
)

func timeoutMiddleware(d time.Duration) gin.HandlerFunc {
    return func(c *gin.Context) {
        ctx, cancel := context.WithTimeout(c.Request.Context(), d)
        defer cancel()
        c.Request = c.Request.WithContext(ctx)
        c.Next()
    }
}
```

Ensure DB and outbound client calls use `c.Request.Context()`.

## Error Handling Pattern

- domain/service returns typed errors
- handler maps errors to HTTP codes
- central middleware logs and annotates errors

Keep this mapping consistent across all endpoints.

## Testing Strategy (Gin)

1. unit test service layer without Gin.
2. handler tests with `httptest.NewRecorder` + `ServeHTTP`.
3. middleware tests for timeout/auth/logging behavior.
4. integration tests for DB and external dependency boundaries.

## Production Checklist

1. apply request size limits
2. define timeout budget per endpoint class
3. avoid spawning uncontrolled goroutines in handlers
4. add structured logs with request IDs
5. run race detector and load test before release
