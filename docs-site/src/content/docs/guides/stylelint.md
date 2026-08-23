---
title: Stylelint setup
description: CSS and SCSS declarations, with exact-match autofix.
sidebar: { order: 3 }
---

```bash
pnpm add -D @dscheck/stylelint-plugin
```

```js
// stylelint.config.js (stylelint ≥ 16)
export default {
  extends: [],
  plugins: ['@dscheck/stylelint-plugin'],
  rules: {
    'dscheck/no-raw-color': true,
    'dscheck/no-unknown-token': true,
    'dscheck/no-raw-length': [true, { severity: 'warning' }],
    'dscheck/no-raw-font': [true, { severity: 'warning' }],
    'dscheck/no-raw-shadow': [true, { severity: 'warning' }],
  },
};
```

## Autofix

`stylelint --fix` rewrites **exact matches only**: `#1d4ed8` becomes
`var(--color-primary)` when the color is identical (ΔEOK ≤ 0.005); `14px` is *suggested*
as `--spacing-3 (12px, Δ2px)` but never silently changed. A linter that rounds your
spacing breaks your layout — dscheck asks instead.

## Vue / Svelte

`<style>` blocks work through stylelint's standard `postcss-html` custom syntax; configure
it as you would for any stylelint rule set.
