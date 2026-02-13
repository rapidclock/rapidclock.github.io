# Contributing Guide

## Content Contract (Required for leaf pages)

Every leaf page in `Data Structures` and `Algorithms` should include:

1. Basic explanation (2-6 short paragraphs)
2. Detailed explanation (invariants, failure modes, tradeoffs)
3. Complexity section with time and space
4. At least one illustration (`mermaid` or static diagram)
5. Pseudocode
6. Full working examples in:
   - Python (3.12+)
   - Rust (stable, edition 2021)
   - Go (1.23+)

`Languages` pages should prioritize short, practical snippets.

## Code Quality Rules

- Use idiomatic style for each language.
- Keep snippets executable with minimal setup.
- Avoid pseudo-APIs and placeholders.
- Add comments only where they clarify non-obvious behavior.

## Library Policy

- Use standard library first.
- If stdlib is insufficient, include:
  - one recommended library
  - one to two popular alternatives
  - official documentation/GitHub links

## Hierarchy and URLs

- Keep pages under `_docs/` and follow hierarchy-based paths.
- Add/update navigation in `_data/navigation.yml`.
- Use simple, stable slugs.

## Styling and Components

- Use the existing tab structure:

```html
<div class="code-tabs">
  <div class="tab-panel" data-lang="python" markdown="1">...</div>
  <div class="tab-panel" data-lang="rust" markdown="1">...</div>
  <div class="tab-panel" data-lang="go" markdown="1">...</div>
</div>
```

- Missing language implementations should be treated as incomplete work.

## CI Expectations

PRs should pass:

- Markdown lint
- Link checks
- Jekyll build
