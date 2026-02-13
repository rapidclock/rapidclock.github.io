# CS Cookbook (GitHub Pages)

A topic-first computer science coding reference with:

- 3-tier hierarchy: Main Topics -> Subtopics -> Sub-subtopics
- Dark docs-style UI with collapsible sidebar navigation
- Full-text client-side search
- Syntax-highlighted code blocks with copy buttons
- Language tabs for Python, Rust, and Go
- Interactive algorithm/data-structure walkthrough animations
- Learning modules on deep-topic pages (prereqs, objectives, worked example, checks, practice)
- Official documentation link hub for language-centric pages

## Main Topic Structure

- Languages
- Data Structures
- Algorithms

## Local Development

```bash
bundle config set --local path vendor/bundle
bundle config set --local disable_shared_gems true
bundle install
bundle exec jekyll serve
```

Then open `http://127.0.0.1:4000`.

### If You Hit Permission Errors On macOS

If Bundler tries to write under `/Library/Ruby/Gems/...`, you are using system Ruby.
Use the two `bundle config set --local ...` commands above, then run `bundle install` again.
Avoid `sudo bundle install`.

## Linux CI + GitHub Pages Deploy

This repo is configured to build on Linux in GitHub Actions:

- `.github/workflows/ci.yml` runs markdown lint, link checks, curriculum quality checks, JS syntax checks, and `jekyll build`.
- `.github/workflows/deploy-pages.yml` builds and deploys `_site` to GitHub Pages from Linux runners.

In GitHub repository settings:

1. Open `Settings -> Pages`.
2. Set source to `GitHub Actions`.
3. Keep your default branch as `main` (or `master`, both are supported by workflow trigger).

## Content Principles

- Explanations are factual and paced for early CS learners.
- Data structure and algorithm pages include asymptotic time/space analysis.
- Working code examples should provide Python, Rust, and Go variants.
- Prefer standard library usage unless a third-party library is clearly justified.

## Quality Gates

The repository enforces curriculum consistency via `scripts/validate_curriculum.py`.
It validates:

- Required teaching sections exist in Data Structures and Algorithms leaf pages.
- Mermaid illustration and interactive animation coverage.
- Python/Rust/Go language panels on worked examples.
- Learning-module coverage for deep DS/Algorithm pages.
- Language reference link coverage for language leaf pages.

## Authoring Docs

- `CONTRIBUTING.md`
- `templates/leaf-topic-template.md`
