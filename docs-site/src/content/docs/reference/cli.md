---
title: CLI
description: check, baseline, report, tokens.
---

```text
dscheck init                 Detect the token source and propose a config (--write to save)
dscheck check [paths...]     Lint files (default: cwd) against the token set
dscheck fix [paths...]       Apply every exact-match fix, report what remains
dscheck baseline [paths...]  Record current findings as accepted debt (--update: prune-only)
dscheck report [paths...]    Debt overview: counts by rule, worst files, vs baseline
dscheck tokens [query]       Print the allowed set (--json, --category, --doctor)
dscheck roles --suggest      Propose a roles.json from token names
dscheck explain <rule>       What a rule flags, what it never flags, how to disable
dscheck completions <shell>  Completion script for fish, zsh, or bash

-v, --version                       Print the version
--format pretty|json|agent|sarif    Output format (default: pretty)
--only <rule[,rule]>                Report only these rules
--severity error|warning            Report only this severity
--max-warnings <n>                  Fail when warnings exceed n
--quiet                             Findings only, one per line, machine-friendly
--ascii                             ASCII marks for terminals without ✔ ⚠ ✖
--since <ref>                       Only lint files changed since a git ref
--watch                             Re-lint files as they change
--explain-skips                     Show what was deliberately not checked, and why
--no-baseline                       Ignore .dscheck-baseline.json
```

## When nothing was checked

A run that finds no design system, or no lintable files, **exits `2` and says so** — it is
never reported as a clean pass. Silence only means something when it means "checked, and
found nothing":

```text
no design system found — nothing was checked

  Find it automatically:  dscheck init
```

## Output and terminals

Severity is carried by a glyph *and* a word, never colour alone. Output adapts to the
terminal width, and to not being a terminal: colour is dropped when piped (or under
`NO_COLOR`), progress is shown only on a TTY outside CI, and `--ascii` swaps the marks for
terminals that can't render them.

- **`agent`** — one JSON line per finding, `fix` field first; built for model loops.
- **`sarif`** — SARIF 2.1.0 with stable fingerprints for GitHub code scanning.
- Directories are expanded to `**/*.{css,scss,jsx,tsx}` minus `node_modules`/`dist`/`.next`.
- Large runs are fanned out across CPU cores automatically (3,200-file repo ≈ 4s).
- `fix` applies only exact matches (identical values) — `14px` is never rounded to `12px`;
  near-misses surface as one-click **editor suggestions** via the eslint plugin instead.
- Exit codes: `0` clean · `1` error-severity findings (or `--max-warnings` exceeded) ·
  `2` usage error, invalid config, no design system, or nothing to check.
