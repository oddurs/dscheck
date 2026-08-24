---
title: CLI
description: check, baseline, report, tokens.
---

```text
dscheck check [paths...]     Lint files (default: cwd) against the token set
dscheck fix [paths...]       Apply every exact-match fix, report what remains
dscheck baseline [paths...]  Record current findings as accepted debt (--update: prune-only)
dscheck report [paths...]    Debt overview: counts by rule, worst files, vs baseline
dscheck tokens [query]       Print the allowed set (--json, --category, --doctor)
dscheck roles --suggest      Propose a roles.json from token names

--format pretty|json|agent|sarif    Output format (default: pretty)
--since <ref>                       Only lint files changed since a git ref
--watch                             Re-lint files as they change
--no-baseline                       Ignore .dscheck-baseline.json
```

- **`agent`** — one JSON line per finding, `fix` field first; built for model loops.
- **`sarif`** — SARIF 2.1.0 with stable fingerprints for GitHub code scanning.
- Directories are expanded to `**/*.{css,scss,jsx,tsx}` minus `node_modules`/`dist`/`.next`.
- Large runs are fanned out across CPU cores automatically (3,200-file repo ≈ 4s).
- `fix` applies only exact matches (identical values) — `14px` is never rounded to `12px`;
  near-misses surface as one-click **editor suggestions** via the eslint plugin instead.
- Exit codes: `0` clean, `1` error-severity findings, `2` usage error.
