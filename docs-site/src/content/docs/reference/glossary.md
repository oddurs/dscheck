---
title: Glossary
description: One canonical definition per term, used consistently across the docs.
---

| term | means |
|---|---|
| **token** | one named design decision — a custom property (or DTCG entry) with a value: `--spacing-3: 12px` |
| **system** | the complete set of tokens your config's `tokens` sources resolve to — the *allowed set* dscheck enforces |
| **mode** | an alternate value a token takes under a theme scope (`.dark`, `[data-theme=…]`, media-wrapped `:root`, or a second token file); any mode's value counts as on-system |
| **role** | an opt-in semantic job for a token (`fg`, `bg`, `border`) — lets dscheck flag a *valid* token doing the *wrong* job |
| **finding** | one report: a value, its location, the rule that fired, and the nearest on-system tokens with distances |
| **verdict** | the mark a finding carries — ✔ on-system, ⚠ needs judgment, ✖ off-system |
| **surface** | a place dscheck reads values from: CSS declarations, `style={{}}`, class strings, tagged templates… — the checked and skipped inventory is the [supported-surfaces contract](/reference/supported-surfaces/) |
| **skip** | a deliberate, documented non-check (an interpolation, a dynamic classname) — never silent, always listed by `--explain-skips` |
| **baseline** | accepted existing debt, recorded as per-file/per-rule counts; CI then fails only on findings beyond it |
| **exact match** | a suggestion whose value is provably identical to the raw value — the only kind autofix will ever apply |
