---
title: no-raw-length
description: Spacing, radius, and font-size literals must come from the scale.
---

Flags raw `px`/`rem`/`em` literals in **spacing properties** (`margin`, `padding`, `gap`,
`inset`, …), **radius properties**, and `font-size` — the properties where a scale exists
and drift hurts. Deliberately not enforced on `width`/`height`, `letter-spacing`, or `line-height` (too
noisy relative to the drift they represent — revisit with roles).

```text
⚠ Raw length 14px in padding — use var(--spacing-3) (12px, Δ2px)
```

Suggestions are the nearest scale steps with their real values, so the choice between
rounding up and down stays yours (or your agent's).

- **Fixable:** only exact scale hits (`1rem` → `var(--spacing-4)` when identical).
- **Default severity:** warning.
- **Not flagged:** `0`, `auto`, `100%`, `1px` hairlines, `calc()`/`clamp()` internals
  (fluid values are a design decision, not drift).
