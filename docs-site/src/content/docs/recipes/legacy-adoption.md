---
title: Adopting on a legacy codebase
description: Turn dscheck on today without fixing 400 findings first.
---

1. **See the damage:** `dscheck report src` — totals by rule, worst files.
2. **Accept current debt:** `dscheck baseline src` and commit `.dscheck-baseline.json`.
3. **Gate the new:** add `dscheck check src` to CI. It fails only on findings beyond the
   baseline; the run header shows how much debt the baseline is absorbing.
4. **Pay down deliberately:** `dscheck report` shows the delta; when you clean a file,
   re-run `dscheck baseline` to prune its entries and lock in the progress.
5. **Exempt what's exempt:** content surfaces via `ignore` globs, runtime-injected
   variables via `allow` globs — visible in config, not scattered in disable comments.
