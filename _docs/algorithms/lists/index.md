---
title: Lists
description: Core list/array scanning patterns.
permalink: /algorithms/lists/
---

## Subtopics

- [Two Pointers]({{ '/algorithms/lists/two-pointers/' | relative_url }})
- [Sliding Window]({{ '/algorithms/lists/sliding-window/' | relative_url }})

## Pattern Selection Guide

| Problem shape | Preferred pattern | Why |
| --- | --- | --- |
| sorted array with pair/triple constraints | two pointers | eliminates impossible ranges in linear time |
| contiguous subarray/substring with rolling state | sliding window | reuses previous state in O(1) per step |
| unsorted pair sum with arbitrary lookup | hash map | direct membership lookup often simpler |

## Preconditions Checklist

1. Is input sorted? (required for classic two-pointer elimination logic)
2. Is the target range contiguous? (required for sliding window)
3. Are negative values allowed? (affects some window assumptions)
4. Are duplicates meaningful or should they be deduplicated?

## Debugging Playbook

- trace pointer/window boundaries per step
- assert invariants after each update
- build tiny counterexamples for edge behavior

## Practical Reminder

The biggest bug source in list-scan algorithms is boundary handling. Treat index movement rules as first-class invariants, not implementation details.
