---
title: CLI
description: check, baseline, report, tokens.
---

```text
dscheck check [paths...]     Lint files (default: cwd) against the token set
dscheck baseline [paths...]  Record current findings as accepted debt
dscheck report [paths...]    Debt overview: counts by rule, worst files, vs baseline
dscheck tokens               Print the resolved allowed set

--format pretty|json|agent|sarif    Output format (default: pretty)
--no-baseline                       Ignore .dscheck-baseline.json
```

- **`agent`** — one JSON line per finding, `fix` field first; built for model loops.
- **`sarif`** — SARIF 2.1.0 with stable fingerprints for GitHub code scanning.
- Directories are expanded to `**/*.{css,scss,jsx,tsx}` minus `node_modules`/`dist`/`.next`.
- Large runs are fanned out across CPU cores automatically (3,200-file repo ≈ 4s).
- Exit codes: `0` clean, `1` error-severity findings, `2` usage error.
