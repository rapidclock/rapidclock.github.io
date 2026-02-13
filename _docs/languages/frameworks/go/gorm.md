---
title: GORM
description: ORM patterns in Go for model mapping, query composition, transactions, and migration workflows.
permalink: /languages/frameworks/go/gorm/
---

## Big Picture

`gorm` is the most widely used ORM in Go.

Use it when you need:

- quick model-to-table mapping
- composable query builders
- transaction helpers and associations

For maximal SQL control and lean dependencies, many teams still choose `database/sql` + query builders.

## Core Concepts

- model structs + tags
- auto migration helpers
- chainable query APIs
- explicit transactions (`db.Transaction`)

## Example: Model + Basic Queries

```go
package main

import (
    "fmt"

    "gorm.io/driver/sqlite"
    "gorm.io/gorm"
)

type User struct {
    ID    uint
    Email string `gorm:"uniqueIndex"`
    Name  string
}

func main() {
    db, err := gorm.Open(sqlite.Open("app.db"), &gorm.Config{})
    if err != nil {
        panic(err)
    }

    _ = db.AutoMigrate(&User{})

    db.Create(&User{Email: "ada@example.com", Name: "Ada"})

    var out User
    db.Where("email = ?", "ada@example.com").First(&out)
    fmt.Println(out.ID, out.Name)
}
```

## Example: Transaction Pattern

```go
func transfer(db *gorm.DB, fromID, toID uint, amount int64) error {
    return db.Transaction(func(tx *gorm.DB) error {
        // load/update balances with row-level consistency checks
        // return error to rollback
        // return nil to commit
        return nil
    })
}
```

## Tradeoffs

### Pros

- rapid CRUD and schema evolution workflows
- strong ecosystem and docs
- good developer productivity for standard patterns

### Cons

- generated SQL may be harder to reason about than explicit queries
- complex queries often need raw SQL anyway
- hidden N+1 query risks in association-heavy code

## Edge Cases and Gotchas

1. Implicit queries:
   inspect SQL logs for unexpected query explosion.
2. Transaction boundaries:
   keep transaction scopes short and explicit.
3. Migration safety:
   use reviewed migration workflows for production databases.
4. Zero-value field updates:
   know when GORM omits zero-values and how to force updates.

## Documentation Links

- GORM docs: [gorm.io/docs](https://gorm.io/docs/)
- GORM package docs: [pkg.go.dev/gorm.io/gorm](https://pkg.go.dev/gorm.io/gorm)
- SQLite driver: [pkg.go.dev/gorm.io/driver/sqlite](https://pkg.go.dev/gorm.io/driver/sqlite)
- Go stdlib `database/sql`: [pkg.go.dev/database/sql](https://pkg.go.dev/database/sql)

## Deep Dive Cookbook Additions

### Query Discipline Pattern

- keep repository methods focused and explicit
- log generated SQL in non-prod debug mode
- monitor query counts per request to catch N+1 patterns

### How-To: Preload Associations Safely

```go
var users []User
if err := db.Preload("Orders").Find(&users).Error; err != nil {
    // handle error
}
```

### How-To: Explicit Locking in Transactions (DB-specific)

```go
// Use tx.Clauses(...) with dialect-specific locking hints where needed.
// Keep lock scope short.
```

### Migration Guidance

1. Treat migrations as code-reviewed artifacts.
2. Validate both forward and rollback paths.
3. Separate destructive migrations into staged rollouts.

## Data Access Architecture

A practical GORM architecture uses repositories with explicit methods, for example:

- `CreateOrder`
- `GetOrderByID`
- `ListOrdersForCustomer`
- `UpdateOrderStatus`

Avoid generic repository methods that hide query intent.

## Complete Example: Repository + Transaction Service

```go
package main

import (
    "errors"

    "gorm.io/gorm"
)

type Account struct {
    ID      uint `gorm:"primaryKey"`
    Balance int64
}

type AccountRepo struct {
    db *gorm.DB
}

func (r AccountRepo) GetForUpdate(tx *gorm.DB, id uint) (Account, error) {
    var a Account
    if err := tx.First(&a, id).Error; err != nil {
        return Account{}, err
    }
    return a, nil
}

func (r AccountRepo) Save(tx *gorm.DB, a *Account) error {
    return tx.Save(a).Error
}

type TransferService struct {
    db   *gorm.DB
    repo AccountRepo
}

func (s TransferService) Transfer(fromID, toID uint, amount int64) error {
    if amount <= 0 {
        return errors.New("amount must be positive")
    }

    return s.db.Transaction(func(tx *gorm.DB) error {
        from, err := s.repo.GetForUpdate(tx, fromID)
        if err != nil {
            return err
        }
        to, err := s.repo.GetForUpdate(tx, toID)
        if err != nil {
            return err
        }

        if from.Balance < amount {
            return errors.New("insufficient funds")
        }

        from.Balance -= amount
        to.Balance += amount

        if err := s.repo.Save(tx, &from); err != nil {
            return err
        }
        if err := s.repo.Save(tx, &to); err != nil {
            return err
        }
        return nil
    })
}
```

## How-To: Query Performance Hygiene

1. enable SQL logging in non-prod when diagnosing behavior
2. run `EXPLAIN` for slow queries
3. add DB indexes for common filters and joins
4. set explicit select columns for wide tables where possible
5. cap page size on list endpoints

## How-To: Association Loading Strategy

- eager load only relationships needed by endpoint
- avoid global preloading that inflates response and query time
- verify query count in tests for list endpoints

## Migration Strategy

- use `AutoMigrate` for local/dev speed, not blind production changes
- keep reviewed SQL migrations for production databases
- roll out destructive schema changes in stages

## Common Pitfalls

1. hidden N+1 from nested association access in loops
2. long transactions that include network calls
3. assuming zero values always get updated without explicit config
4. trusting ORM defaults without checking generated SQL
