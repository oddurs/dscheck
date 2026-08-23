---
title: no-unknown-token
description: Every var(--…) must reference a token that exists.
---

The agent-era rule: models fabricate plausible token names (`--color-primary-500` in a
system that stops at `--color-primary`), and humans typo them. Any `var(--x)` not found in
the token set is flagged, with a did-you-mean by edit distance.

```text
✖ Unknown token --color-primry — did you mean --color-primary?
```

- **Not flagged:** custom properties defined in the same file (component-local vars),
  `--tw-*` (Tailwind internals), names matched by [`allow` globs](/reference/config/) —
  the escape hatch for runtime-injected vars like `--shiki-*` or `next/font` variables.
- **Default severity:** error. This rule has no legitimate steady-state violations: either
  the token should exist, or the name belongs in `allow`.
