---
title: Pandas
description: DataFrame-centric data wrangling, analysis, and ETL patterns with production caveats.
permalink: /languages/frameworks/python/pandas/
---

## Big Picture

`pandas` is the default tool for tabular analytics and medium-scale ETL in Python.

Use it when you need:

- joins/groupby/window-like transformations
- strong CSV/Excel/Parquet interoperability
- fast iteration on analytical pipelines

## Core Concepts

- `DataFrame`: tabular structure with labeled columns
- `Series`: one typed column
- index: row labels, sometimes useful, often accidentally misused
- vectorized operations: column-level operations faster than row loops

## Typical Workflow

1. Read data (`read_csv`, `read_parquet`, SQL connector).
2. Normalize column names and types.
3. Filter/transform/aggregate.
4. Validate assumptions (nulls, duplicates, range checks).
5. Write output with explicit schema expectations.

## Example: Clean + Aggregate Orders

```python
import pandas as pd


def summarize_orders(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    df.columns = [c.strip().lower() for c in df.columns]

    required = {"order_id", "country", "amount", "status"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"missing columns: {sorted(missing)}")

    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    df = df.dropna(subset=["amount"])
    df = df[df["status"] == "paid"]

    out = (
        df.groupby("country", as_index=False)
        .agg(total_amount=("amount", "sum"), orders=("order_id", "nunique"))
        .sort_values("total_amount", ascending=False)
    )
    return out
```

## Example: Join Two Datasets Safely

```python
import pandas as pd


users = pd.DataFrame({"user_id": [1, 2], "name": ["Ada", "Grace"]})
orders = pd.DataFrame({"user_id": [1, 1, 2], "amount": [30, 20, 10]})

joined = users.merge(orders, on="user_id", how="left", validate="one_to_many")
print(joined)
```

`validate` is important. It catches silent key-shape mistakes.

## Tradeoffs

### Pros

- rich transformation API
- fast enough for many workloads
- huge ecosystem and community knowledge

### Cons

- high memory usage for very large data
- type coercion can be surprising if unchecked
- chain operations can hide bugs if not validated

## Edge Cases and Gotchas

1. `SettingWithCopyWarning`:
   Use `.loc[...]` for assignments; avoid chained indexing.
2. Unexpected `object` dtype:
   Use `pd.to_numeric`, `astype`, and `convert_dtypes` explicitly.
3. Date/time confusion:
   Normalize timezone handling early (`utc=True` when parsing).
4. Memory blowups:
   Read in chunks for large CSVs and downcast numeric types.
5. Join cardinality errors:
   Use `merge(..., validate=...)` to enforce assumptions.

## When To Avoid Pandas

- data larger than memory without chunk strategy
- low-latency services where heavy in-process dataframes are overkill
- workloads better suited to SQL engine pushdown or distributed processing

## Documentation Links

- Pandas user guide: [pandas.pydata.org/docs/user_guide](https://pandas.pydata.org/docs/user_guide/)
- `DataFrame` API: [pandas.pydata.org/docs/reference/frame.html](https://pandas.pydata.org/docs/reference/frame.html)
- IO tools: [pandas.pydata.org/docs/user_guide/io.html](https://pandas.pydata.org/docs/user_guide/io.html)

## Deep Dive Cookbook Additions

### Architecture Pattern: Bronze/Silver/Gold Dataframes

- Bronze: raw ingestion (minimal cleaning)
- Silver: validated/typed canonical records
- Gold: aggregated/reporting-ready outputs

This staging model avoids "single giant transformation" pipelines that are hard to debug.

### How-To: Process Very Large CSV Safely

```python
import pandas as pd


def aggregate_large_csv(path: str) -> pd.DataFrame:
    chunks = pd.read_csv(path, chunksize=200_000)
    partial = []

    for c in chunks:
        c.columns = [x.strip().lower() for x in c.columns]
        c["amount"] = pd.to_numeric(c["amount"], errors="coerce")
        c = c.dropna(subset=["amount", "country"])
        part = c.groupby("country", as_index=False)["amount"].sum()
        partial.append(part)

    merged = pd.concat(partial, ignore_index=True)
    return merged.groupby("country", as_index=False)["amount"].sum()
```

### How-To: Defensive Join Diagnostics

```python
import pandas as pd


def safe_join(users: pd.DataFrame, orders: pd.DataFrame) -> pd.DataFrame:
    # Detect duplicates in one-side key before one-to-many join.
    if users["user_id"].duplicated().any():
        raise ValueError("users.user_id must be unique")

    out = users.merge(orders, on="user_id", how="left", validate="one_to_many", indicator=True)
    # Investigate unmatched rows quickly.
    unmatched = out[out["_merge"] != "both"]
    if len(unmatched) > 0:
        print("unmatched users:", unmatched["user_id"].nunique())
    return out
```

### Performance Tuning

1. Use categorical dtype for low-cardinality strings.
2. Downcast numeric columns where safe.
3. Avoid Python loops (`apply` with Python lambdas on huge data can be slow).
4. Measure memory footprint with `df.memory_usage(deep=True)`.

### Testing Strategy

- Keep "golden" fixture CSVs for representative edge cases.
- Assert schema (columns + dtypes) in tests.
- Add data-quality invariants (null rates, key uniqueness, ranges).

## Dataframe Design Discipline

Treat each dataframe stage as a contract, not a temporary scratch object:

1. Define expected columns and dtypes.
2. Define key uniqueness assumptions.
3. Define nullability rules.
4. Enforce these assumptions after each major transform.

This approach prevents subtle errors from surviving multiple pipeline stages.

## Complete Example: Multi-Stage Orders Pipeline

```python
from __future__ import annotations

from dataclasses import dataclass
import pandas as pd


@dataclass(frozen=True)
class PipelineStats:
    rows_in: int
    rows_after_clean: int
    rows_after_dedupe: int


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out.columns = [c.strip().lower().replace(" ", "_") for c in out.columns]
    return out


def _validate_schema(df: pd.DataFrame) -> None:
    required = {
        "order_id",
        "customer_id",
        "country",
        "status",
        "amount",
        "created_at",
    }
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"missing required columns: {sorted(missing)}")


def build_curated_orders(path: str) -> tuple[pd.DataFrame, PipelineStats]:
    raw = pd.read_csv(path)
    rows_in = len(raw)

    df = _normalize_columns(raw)
    _validate_schema(df)

    # Type normalization.
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    df["created_at"] = pd.to_datetime(df["created_at"], utc=True, errors="coerce")

    # Drop rows that cannot be trusted for downstream analytics.
    df = df.dropna(subset=["order_id", "customer_id", "country", "amount", "created_at"])
    df = df[df["status"].isin(["paid", "refunded"])]
    rows_after_clean = len(df)

    # Deduplicate by most recent event for an order.
    df = df.sort_values("created_at").drop_duplicates(subset=["order_id"], keep="last")
    rows_after_dedupe = len(df)

    # Add derived metrics.
    df["is_refund"] = df["status"].eq("refunded")
    df["order_day"] = df["created_at"].dt.floor("D")

    stats = PipelineStats(
        rows_in=rows_in,
        rows_after_clean=rows_after_clean,
        rows_after_dedupe=rows_after_dedupe,
    )
    return df, stats


def country_daily_revenue(df: pd.DataFrame) -> pd.DataFrame:
    return (
        df.groupby(["country", "order_day"], as_index=False)
        .agg(
            gross_amount=("amount", "sum"),
            order_count=("order_id", "nunique"),
            refund_count=("is_refund", "sum"),
        )
        .sort_values(["country", "order_day"])
    )
```

## How-To: Time-Series Resampling + Rolling Windows

```python
import pandas as pd


def rolling_sales(df: pd.DataFrame) -> pd.DataFrame:
    # Expects columns: created_at (UTC datetime), amount (float)
    ts = (
        df.set_index("created_at")
        .sort_index()["amount"]
        .resample("D")
        .sum()
        .to_frame(name="daily_sales")
    )

    ts["sales_7d"] = ts["daily_sales"].rolling(window=7, min_periods=1).sum()
    ts["sales_28d"] = ts["daily_sales"].rolling(window=28, min_periods=1).sum()
    return ts.reset_index()
```

Caveat: rolling windows on sparse time series can be misleading if missing days represent outages vs true zero activity. Decide whether to fill gaps with zeros or keep nulls explicitly.

## How-To: Memory-Safe Ingestion Checklist

1. Use `usecols=` to avoid loading unnecessary columns.
2. Parse only required datetime fields.
3. Convert low-cardinality string fields to categorical dtype.
4. Aggregate early to reduce row count.
5. Avoid `.apply(lambda ...)` for large-row operations when vectorized alternatives exist.

## Debugging Playbook

When output looks wrong:

1. Print row counts after each major stage.
2. Print `df.dtypes` after normalization.
3. Check key uniqueness with `duplicated()`.
4. Use `merge(..., indicator=True)` and inspect unmatched rows.
5. Build a minimal failing fixture CSV and write regression test around it.

## Anti-Patterns

1. Chaining dozens of transforms without intermediate assertions.
2. Mixing timezone-aware and timezone-naive datetimes.
3. Treating object dtype columns as stable numeric columns.
4. Joining datasets without cardinality validation.
5. Running giant dataframe transforms in request-response API paths.
