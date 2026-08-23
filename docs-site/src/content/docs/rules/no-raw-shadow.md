---
title: no-raw-shadow
description: Box shadows must come from the elevation system.
---

Flags raw `box-shadow` values when shadow tokens exist. Shadows are matched by a numeric
fingerprint (every `px` component in order), so a shadow that duplicates a token modulo
color format is reported as identical.

```text
⚠ Raw box-shadow — use var(--shadow-md) (identical)
```

- **Default severity:** warning.
- **Not flagged:** `none`, values already using `var()`.
