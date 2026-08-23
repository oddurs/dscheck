---
title: no-raw-font
description: Font stacks and numeric weights must come from the token set.
---

Flags hand-written `font-family` stacks when font tokens exist (a stack identical to a
token is fixable), and numeric `font-weight`s with the nearest weight token.

```text
⚠ Raw font stack in font-family — use var(--font-sans)
⚠ Raw font-weight 600 — use var(--font-weight-medium)
```

- **Not flagged:** stacks made only of generic families (`system-ui, sans-serif`), keyword
  weights (`bold`), values already using `var()`.
- **Default severity:** warning.
