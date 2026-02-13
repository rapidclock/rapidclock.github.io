---
title: NumPy + SciPy
description: Numerical computing and scientific algorithms in Python with vectorization-first design.
permalink: /languages/frameworks/python/numpy-scipy/
---

## Big Picture

`numpy` is the foundation for numeric arrays and vectorized compute.

`scipy` builds on NumPy for:

- optimization
- linear algebra wrappers
- interpolation
- signal processing
- statistics

Use them when performance and numerical correctness matter more than convenience loops.

## Core Concepts

- `ndarray`: typed dense numeric array
- vectorization: operate on arrays, not Python loops
- broadcasting: shape-aware arithmetic expansion
- SciPy submodules: focused algorithm packages

## Example: Vectorized Feature Engineering

```python
import numpy as np

x = np.array([1.0, 2.0, 3.0, 4.0])
mean = x.mean()
std = x.std()

z = (x - mean) / std
poly = np.column_stack([x, x**2, np.log1p(x)])

print(z)
print(poly)
```

## Example: Optimization with SciPy

```python
from scipy.optimize import minimize


def objective(v: tuple[float, float]) -> float:
    x, y = v
    return (x - 3) ** 2 + (y + 2) ** 2


result = minimize(objective, x0=(0.0, 0.0), method="BFGS")
print(result.x, result.fun)
```

## Example: Statistical Test

```python
from scipy import stats

control = [10.2, 9.9, 10.5, 10.1, 9.8]
treatment = [10.8, 10.9, 11.1, 10.7, 11.0]

stat, p_value = stats.ttest_ind(control, treatment, equal_var=False)
print(stat, p_value)
```

## Tradeoffs

### Pros

- major performance gain via native vectorized kernels
- mature ecosystem for scientific and ML workflows
- interoperates with pandas, PyTorch, scikit-learn

### Cons

- shape/dtype mistakes are common and can be subtle
- numerical stability still needs careful thinking
- memory copies can silently dominate runtime

## Edge Cases and Gotchas

1. Broadcasting surprises:
   Always inspect array shapes before arithmetic.
2. Copy vs view confusion:
   slicing often returns views; mutation may affect source arrays.
3. Float equality traps:
   use `np.isclose`, not `==`, for most floating-point comparisons.
4. Contiguous memory assumptions:
   some operations copy arrays due to layout mismatches.
5. Algorithm mismatch:
   SciPy has many solvers; wrong method can fail silently or converge poorly.

## Documentation Links

- NumPy docs: [numpy.org/doc/stable](https://numpy.org/doc/stable/)
- NumPy broadcasting: [numpy.org/doc/stable/user/basics.broadcasting.html](https://numpy.org/doc/stable/user/basics.broadcasting.html)
- SciPy docs: [docs.scipy.org/doc/scipy](https://docs.scipy.org/doc/scipy/)
- SciPy optimize: [docs.scipy.org/doc/scipy/reference/optimize.html](https://docs.scipy.org/doc/scipy/reference/optimize.html)
- SciPy stats: [docs.scipy.org/doc/scipy/reference/stats.html](https://docs.scipy.org/doc/scipy/reference/stats.html)

## Deep Dive Cookbook Additions

### Numerical Reliability Practices

1. Normalize scales before optimization.
2. Use stable algorithms (avoid direct matrix inverse when possible).
3. Check condition numbers for linear systems.
4. Validate convergence criteria and solver status.

### How-To: Solve Linear System Robustly

```python
import numpy as np

A = np.array([[3.0, 1.0], [1.0, 2.0]])
b = np.array([9.0, 8.0])

x = np.linalg.solve(A, b)
print(x)
```

Prefer `solve` over computing `inv(A) @ b`.

### How-To: Constrained Optimization (SciPy)

```python
from scipy.optimize import minimize


def objective(v):
    x, y = v
    return (x - 1.5) ** 2 + (y - 2.5) ** 2

cons = ({"type": "ineq", "fun": lambda v: v[0] + v[1] - 2.0},)
bounds = [(0, None), (0, None)]

res = minimize(objective, x0=[0.1, 0.1], bounds=bounds, constraints=cons)
print(res.success, res.x, res.fun)
```

### How-To: Sparse Matrix Workflow

```python
import numpy as np
from scipy import sparse

rows = np.array([0, 0, 1, 2])
cols = np.array([0, 2, 1, 2])
vals = np.array([1.0, 2.0, 3.0, 4.0])

m = sparse.csr_matrix((vals, (rows, cols)), shape=(3, 3))
print(m.dot(np.array([1.0, 1.0, 1.0])))
```

### Performance/Scale Guidance

- Profile memory copies and temporary arrays.
- Prefer in-place ops when safe.
- For very large or distributed workloads, hand off to specialized engines rather than forcing single-node NumPy.

## Array Thinking (For Newcomers)

Many beginners use NumPy as "a faster list". A better model is:

- arrays have shape (`(rows, cols, ...)`) and dtype (`float64`, `int32`, ...)
- operations are done over whole arrays, not one element at a time
- broadcasting lets smaller arrays combine with larger arrays by matching trailing dimensions

Before writing a transform, always write down expected input and output shapes.

## Complete Example: Feature Matrix + Regularized Optimization

```python
from __future__ import annotations

import numpy as np
from scipy.optimize import minimize


def build_features(x: np.ndarray) -> np.ndarray:
    # x shape: (n_samples,)
    # output shape: (n_samples, 4)
    return np.column_stack([
        np.ones_like(x),
        x,
        x**2,
        np.log1p(np.clip(x, a_min=0.0, a_max=None)),
    ])


def ridge_loss(w: np.ndarray, X: np.ndarray, y: np.ndarray, lam: float) -> float:
    pred = X @ w
    residual = pred - y
    mse = np.mean(residual**2)
    reg = lam * np.sum(w[1:] ** 2)  # do not regularize bias term
    return mse + reg


def fit_ridge(X: np.ndarray, y: np.ndarray, lam: float = 0.1) -> np.ndarray:
    w0 = np.zeros(X.shape[1], dtype=np.float64)
    res = minimize(
        ridge_loss,
        x0=w0,
        args=(X, y, lam),
        method="L-BFGS-B",
    )
    if not res.success:
        raise RuntimeError(f"optimizer failed: {res.message}")
    return res.x


def main() -> None:
    rng = np.random.default_rng(7)
    x = np.linspace(0.0, 10.0, 200)
    noise = rng.normal(0.0, 0.3, size=x.shape[0])
    y = 2.0 + 1.2 * x + 0.08 * (x**2) + noise

    X = build_features(x)
    w = fit_ridge(X, y, lam=0.01)

    print("weights:", w)
```

## How-To: Numerical Stability Habits

1. Scale features before optimization when magnitudes differ widely.
2. Use `np.linalg.solve(A, b)` instead of `np.linalg.inv(A) @ b`.
3. Prefer stable aggregations (`np.mean`, `np.log1p`, `np.expm1`) over naive formulas.
4. Guard against divide-by-zero with explicit epsilon policy.
5. Check condition number for linear systems (`np.linalg.cond`).

## How-To: Validate Shape Contracts

```python
import numpy as np


def assert_2d(name: str, a: np.ndarray) -> None:
    if a.ndim != 2:
        raise ValueError(f"{name} must be 2D, got shape={a.shape}")


def matmul_checked(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    assert_2d("a", a)
    assert_2d("b", b)
    if a.shape[1] != b.shape[0]:
        raise ValueError(f"shape mismatch: {a.shape} x {b.shape}")
    return a @ b
```

Shape assertions make failures immediate and understandable.

## How-To: Sparse Pipeline for High-Dimensional Features

```python
import numpy as np
from scipy import sparse
from scipy.sparse.linalg import lsqr


def sparse_regression() -> np.ndarray:
    # Example sparse matrix with many zeros.
    row = np.array([0, 0, 1, 2, 2, 3])
    col = np.array([0, 3, 1, 2, 3, 1])
    val = np.array([1.0, 0.5, 2.0, 3.0, 1.0, 4.0])

    X = sparse.csr_matrix((val, (row, col)), shape=(4, 4))
    y = np.array([1.0, 2.0, 3.0, 4.0])

    result = lsqr(X, y)
    return result[0]
```

## Troubleshooting Solver Failures

If `scipy.optimize.minimize` fails or converges poorly:

1. Confirm objective is finite at initialization.
2. Check scale of input variables and objective value.
3. Add simple bounds if domain is constrained.
4. Try multiple initial points.
5. Inspect `result.message`, `result.nit`, and gradient norm.

## Performance Checklist

1. Keep arrays contiguous when possible (`np.ascontiguousarray`).
2. Minimize temporary allocations in tight loops.
3. Prefer vectorized operations to Python-level loops.
4. Use profiling to find copy-heavy operations.
5. For giant workloads, consider chunking or parallel/distributed alternatives.
