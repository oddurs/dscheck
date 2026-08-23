---
title: Architecture (for contributors)
description: Where things live and where a new rule goes.
---

```text
@dscheck/core          resolver + matchers + checker  (host-agnostic, browser-safe)
├─ css-source.ts       @theme/:root loader, var() alias chains, TW default theme merge
├─ config.ts           config discovery, ignore/allow globs, mtime-cached index
├─ match.ts            ΔEOK color distance (alpha-aware), scale steps, edit distance
└─ check.ts            checkDeclaration(prop, value, ctx) → Violation[]   ← rules live here

@dscheck/eslint-plugin     thin adapter: JSX walk → checkDeclaration, host reporting/fixing
@dscheck/stylelint-plugin  thin adapter: decl walk → checkDeclaration, host reporting/fixing
dscheck (CLI)              drives the hosts; adds baseline/report/SARIF/agent + worker pool
@dscheck/sarif             SARIF builder + standalone stylelint formatter
```

**Adding a rule:** implement it in `core/check.ts` (add the `RuleId`, return `Violation`s
with matches), register the id in both adapters' `RULES` arrays and preset configs, add
fixture tests in core plus one integration test per adapter, and add a docs page. The
adapters need no logic — they only map offsets to host AST positions.

**The two invariants:** every violation carries the nearest token with a real distance
(that's what makes agent self-correction work), and every skip is deliberate and
documented (`calc()` internals, dynamic classnames, `--tw-*`). The corpus
(`fixtures/corpus.json`) pins finding counts on real repos — if your change moves a
number, justify it in the PR.
