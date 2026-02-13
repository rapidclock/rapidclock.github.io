# CS Cookbook (GitHub Pages)

A topic-first computer science coding reference with:

- 3-tier hierarchy: Main Topics -> Subtopics -> Sub-subtopics
- Dark docs-style UI with collapsible sidebar navigation
- Full-text client-side search
- Syntax-highlighted code blocks with copy buttons
- Language tabs for Python, Rust, and Go

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

## Content Principles

- Explanations are factual and paced for early CS learners.
- Data structure and algorithm pages include asymptotic time/space analysis.
- Working code examples should provide Python, Rust, and Go variants.
- Prefer standard library usage unless a third-party library is clearly justified.

## Authoring Docs

- `CONTRIBUTING.md`
- `templates/leaf-topic-template.md`
