---
title: ESLint setup
description: JSX inline styles, style-object constants, and Tailwind classes.
sidebar: { order: 2 }
---

```bash
pnpm add -D eslint-plugin-dscheck
```

```js
// eslint.config.js (flat config, eslint ≥ 9)
import dscheck from 'eslint-plugin-dscheck';

export default [
  // …your existing config
  dscheck.configs.recommended,
];
```

That's it — zero-config finds your tokens (`@theme` in an imported CSS entry, or
`tokens.css`/`:root` custom properties). To be explicit, add a
[`dscheck.config.json`](/reference/config/).

## What it checks

- `style={{ color: '#333', padding: 14 }}` — literals, with React's numeric-px semantics
- `const styles = { card: { … } }` referenced from `style={styles.card}`
- Palette constants: `const palette = { cedar: '#7a4a2b' }` … `color: palette.cedar`
- Tailwind class strings — including `clsx`/`cn`/`cva` arguments and template statics.
  With Tailwind installed, parsing runs through **Tailwind's own engine**: variants are
  handled exactly, `p-[12px]` **autofixes** to `p-3` when identical, and fabricated
  utilities are caught ([no-unknown-class](/rules/no-unknown-class/)).

CSS-in-JS tagged templates and `css()`/`sx` objects are covered too — see the
[CSS-in-JS guide](/guides/css-in-js/). Dynamic expressions are **skipped, never
guessed** — a guardrail that cries wolf gets disabled.

## Severities

`recommended` sets colors and unknown tokens to `error`, lengths/fonts/shadows to `warn`.
Override per rule like any eslint rule:

```js
{ rules: { 'dscheck/no-raw-length': 'error' } }
```
