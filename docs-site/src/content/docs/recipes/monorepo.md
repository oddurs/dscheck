---
title: Monorepos & multi-brand
description: Different token sets per package.
---

Config discovery walks up from each linted file and stops at the nearest
`dscheck.config.json` — so packages can carry their own systems:

```text
repo/
├── packages/app/
│   ├── dscheck.config.json    → { "tokens": ["src/theme.css"] }
│   └── src/…
└── packages/marketing/
    ├── dscheck.config.json    → { "tokens": ["brand.css"] }
    └── src/…
```

A file with no config in scope falls back to zero-config discovery at its package
boundary (`package.json`/`.git`), and a package with no token source at all is simply not
linted — dscheck never enforces a system that isn't there.
