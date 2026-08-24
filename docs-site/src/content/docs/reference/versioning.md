---
title: Versioning policy
description: What semver means for a linter, and what is frozen.
---

A linter's output *is* its API — people gate CI on it and parse it in scripts. dscheck
versions accordingly.

## What each bump means

| change | bump |
|---|---|
| A rule finds **more** true positives (new rule, wider coverage, new surface) | **minor** — your CI may newly fail, on real drift; use the [baseline](/guides/ci/) to absorb |
| A rule finds **fewer** false positives | patch |
| Message *wording* changes (same structure) | patch |
| **Structure** of any parseable output changes — JSON/agent/SARIF keys, exit codes, baseline format, config keys, rule names | **major** |
| Default severity or default tolerance changes | **major** |
| A deliberate skip becomes checked (or vice versa) — the [supported-surfaces](/reference/supported-surfaces/) contract | **minor** if it only adds findings; **major** if it removes checking |
| Node/eslint/stylelint support floor raised | major |

## Frozen at 1.0 (change = major)

- Rule ids: `no-raw-color`, `no-raw-length`, `no-unknown-token`, `no-raw-font`,
  `no-raw-shadow`, `token-role`, `no-unknown-class`, `unparsed`
- Config keys ([schema](/config.schema.json)) and their semantics — validated at load;
  unknown keys fail fast rather than being silently ignored
- Output shapes: `--format json` finding keys, `agent` NDJSON (`fix` first), SARIF 2.1.0
  with `dscheckFingerprint`, exit codes (`0` clean / `1` errors / `2` usage)
- `.dscheck-baseline.json`: per-file/per-rule counts, count-rise-reports-all semantics,
  `--update` prune-only monotonicity
- The public exports of `@dscheck/core` (snapshot-tested)

All of the above are enforced by contract tests in CI — a violation cannot ship
accidentally; it has to arrive as a reviewed, versioned decision.

## On-disk artifacts

dscheck writes exactly one file: `.dscheck-baseline.json` (opt-in, `$version`-stamped,
unknown `$`-metadata preserved on rewrite, always safe to delete and regenerate). There
are no hidden caches; all in-memory caches die with the process. A config written for a
newer dscheck degrades gracefully: `x-*` keys are reserved-and-ignored, and a newer
`$schema` turns unknown-key errors into warnings.

## Deprecation

A frozen surface is never removed in place: it ships a deprecation notice for at least
one minor release, with the replacement named in the message and the changelog.
