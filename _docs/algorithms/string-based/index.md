---
title: String Based
description: Pattern matching and string distance algorithms.
permalink: /algorithms/string-based/
---

## Subtopics

- [Distance (Hamming, Levenshtein)]({{ '/algorithms/string-based/distance-metrics/' | relative_url }})
- [Knuth-Morris-Pratt (KMP)]({{ '/algorithms/string-based/kmp/' | relative_url }})
- [Rabin-Karp]({{ '/algorithms/string-based/rabin-karp/' | relative_url }})

## String Algorithm Selection Matrix

| Need | Good first choice | Why |
| --- | --- | --- |
| exact pattern search with many repeated queries | KMP | linear-time search with deterministic fallback |
| probabilistic fast scanning / multiple patterns | Rabin-Karp | rolling hash can be very efficient |
| edit distance / typo tolerance | Levenshtein | explicit insertion/deletion/substitution model |
| equal-length mismatch count | Hamming distance | minimal model, very fast |

## Practical Caveats

1. Decide whether text model is bytes or Unicode code points.
2. Handle normalization if user-facing text equality matters.
3. For rolling hashes, always verify candidate matches to avoid collision errors.
4. Keep memory profile in mind for dynamic-programming distance algorithms.

## Benchmarking Guidance

- test short/medium/long text lengths
- test repetitive patterns and worst-case overlaps
- test multilingual/unicode-heavy input if relevant
