#!/usr/bin/env python3
"""Curriculum quality gates for DS/Algorithms/Language reference pages."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS_ROOT = ROOT / "_docs"

LEAF_TOPIC_ROOTS = ("data-structures", "algorithms")
REQUIRED_BASE_HEADINGS = (
    "## Basic Explanation",
    "## Detailed Explanation",
    "## Edge Cases",
    "## Full Examples",
)
REQUIRED_DS_HEADINGS = ("## Pros", "## Cons", "## Use Cases")
REQUIRED_LANGS = ('data-lang="python"', 'data-lang="rust"', 'data-lang="go"')


def leaf_pages(root_name: str) -> list[Path]:
    pages: list[Path] = []
    for path in sorted((DOCS_ROOT / root_name).rglob("*.md")):
        if path.name == "index.md":
            continue
        pages.append(path)
    return pages


def language_leaf_pages() -> list[Path]:
    pages: list[Path] = []
    for path in sorted((DOCS_ROOT / "languages").rglob("*.md")):
        if path.name == "index.md":
            continue
        pages.append(path)
    return pages


def page_url(path: Path) -> str:
    rel = path.relative_to(DOCS_ROOT).with_suffix("")
    return f"/{rel.as_posix()}/"


def load_data_keys(path: Path, errors: list[str]) -> set[str]:
    if not path.exists():
        errors.append(f"Missing required data file: {path.relative_to(ROOT).as_posix()}")
        return set()
    text = path.read_text(encoding="utf-8")
    return set(re.findall(r'^"([^"]+)":\s*$', text, flags=re.MULTILINE))


def fail(errors: list[str]) -> None:
    if not errors:
        print("Curriculum validation passed.")
        return
    print("Curriculum validation failed:\n")
    for entry in errors:
        print(f"- {entry}")
    sys.exit(1)


def main() -> None:
    errors: list[str] = []

    learning_keys = load_data_keys(ROOT / "_data" / "learning_modules.yml", errors)
    reference_keys = load_data_keys(ROOT / "_data" / "language_references.yml", errors)

    for root_name in LEAF_TOPIC_ROOTS:
        for path in leaf_pages(root_name):
            text = path.read_text(encoding="utf-8")
            url = page_url(path)
            title = path.relative_to(ROOT).as_posix()

            for heading in REQUIRED_BASE_HEADINGS:
                if heading not in text:
                    errors.append(f"{title}: missing required heading `{heading}`")

            if root_name == "data-structures":
                for heading in REQUIRED_DS_HEADINGS:
                    if heading not in text:
                        errors.append(f"{title}: missing required heading `{heading}`")

            if "```mermaid" not in text:
                errors.append(f"{title}: missing mermaid illustration block")

            anim_count = text.count('class="operation-anim"')
            if "class=\"kmp-anim\"" in text:
                anim_count += 1
            if anim_count < 2:
                errors.append(f"{title}: expected at least 2 interactive animations, found {anim_count}")

            for lang_marker in REQUIRED_LANGS:
                if lang_marker not in text:
                    errors.append(f"{title}: missing language panel marker `{lang_marker}`")

            if url not in learning_keys:
                errors.append(f"{title}: no learning module entry for URL `{url}`")

    for path in language_leaf_pages():
        url = page_url(path)
        title = path.relative_to(ROOT).as_posix()
        if url not in reference_keys:
            errors.append(f"{title}: missing language reference links entry for URL `{url}`")

    fail(errors)


if __name__ == "__main__":
    main()
