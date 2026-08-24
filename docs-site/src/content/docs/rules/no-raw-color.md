---
title: no-raw-color
description: Color literals must come from the token set.
---

Flags hex literals and color functions (`rgb()`, `oklch()`, `hsl()`, …) anywhere, and
named colors (`tomato`) in color-typed properties and color-bearing shorthands
(`background`, `border`, `outline`), whenever your system defines color
tokens. Suggests up to three nearest tokens by **ΔEOK** (perceptual distance in OKLab),
with an alpha term so `rgba(0,0,0,0.05)` never "matches" solid black.

```text
✖ Raw color #1d4fd9 — use var(--color-primary) (ΔEOK 0.003)
```

- **Fixable:** yes, when the match is exact (ΔEOK ≤ 0.005). Near misses are suggested, never applied.
- **Default severity:** error.
- **Not flagged:** `transparent`, `currentColor`, `inherit`, values already using `var()`, literals inside `calc()`/gradients' math functions, unparseable strings.

**When to disable:** content surfaces with deliberate one-off art (blog illustrations,
marketing one-pagers). Prefer [`ignore` globs](/reference/config/) over inline disables so
the exemption is visible in one place.
