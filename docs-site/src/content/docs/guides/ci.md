---
title: CI, baselines & SARIF
description: Adopt on a legacy codebase without a cleanup sprint.
sidebar: { order: 4 }
---

## The baseline ratchet

Existing debt shouldn't block adoption. Record it once:

```bash
dscheck baseline src        # writes .dscheck-baseline.json — commit it
```

From then on, `dscheck check` fails only on **new** findings. The format is the same
per-file/per-rule count sidecar ESLint (9.24+), stylelint (16.25+), and oxlint converged
on — counts, no line numbers, so it survives edits and merges cleanly. When a count
*rises*, every occurrence of that file+rule is reported (like the hosts, dscheck doesn't
guess which one is new). Debt you pay down is reported as prunable.

```bash
dscheck report              # totals by rule, worst files, delta vs baseline
```

## GitHub code scanning

```bash
dscheck check src --format sarif > dscheck.sarif
```

Upload with `github/codeql-action/upload-sarif`. Findings carry stable
`partialFingerprints`, so pull requests surface **only newly-introduced findings** — a
server-side baseline you get for free.

## Exit codes

`0` clean (or baseline-absorbed), `1` at least one error-severity finding, `2` usage error.
Warnings never fail the build — promote a rule to `error` when you're ready.
