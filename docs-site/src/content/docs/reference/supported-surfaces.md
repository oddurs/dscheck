---
title: Supported surfaces
description: Exactly what dscheck checks — and every silence, with its reason.
---

dscheck's contract: **a finding on a supported surface is always real, and every silence
is a decision, not an accident.** This page is the complete inventory. Each entry — checked
and skipped alike — is enforced by a fixture test; a change here is a semver event.

## Checked

| surface | constructs |
|---|---|
| CSS / SCSS | every declaration; `var()` references validated; `--*` definitions exempt |
| Vue · Svelte · Astro · HTML | `<style>` blocks **and** inline `style="…"` attributes, with positions inside the file (via stylelint's `postcss-html`) |
| JSX inline styles | `style={{ … }}` literals; numeric-px React semantics; unitless props respected |
| Referenced style maps | `const styles = { card: {…} }` used in `style={styles.card}`; palette-const folding (`palette.cedar`) |
| Tailwind classes | string `className`s; `clsx`/`cn`/`cx`/`cva`/`tv`/`classnames` arguments anywhere; template-literal static chunks; classnames-object keys; cva-config values. With Tailwind installed: variant-exact parsing + `no-unknown-class` |
| CSS-in-JS | `styled.*`, `styled(X)`, `css`, `keyframes`, `createGlobalStyle`, `injectGlobal` tagged templates (static chunks); `css({…})` objects; `sx={{…}}`; pseudo-selector nesting |
| Properties | colors: color-typed properties + color-bearing shorthands (`background`, `border`, `outline`) + hex/color-functions anywhere · lengths: spacing/inset/gap properties, radius, `font-size` · fonts: `font-family`, numeric `font-weight` · `box-shadow` |

## Deliberately skipped — silence with reasons

| skipped | why |
|---|---|
| Interpolated CSS-in-JS declarations (`padding: ${p => …}`) | dynamic — dscheck never guesses; the whole declaration is exempt |
| Dynamic classname expressions (`clsx(dynamic)`, `${x}-[…]` interpolations) | same rule: report what can be proven, nothing else |
| `calc()` / `clamp()` / `min()` / `max()` literals | fluid values are a design decision, not drift (`var()`s inside are still validated) |
| `width` / `height` | too noisy relative to the drift they represent |
| `letter-spacing` / `line-height` raw values | ditto — revisit with roles |
| `text-shadow` | box-shadow tokens are a different geometry |
| Named colors outside color properties/shorthands | `red` in `font-family` is a font name |
| `0`, `auto`, `100%`, `1px`, `currentColor`, `transparent`, keywords | never violations, any property |
| `--tw-*`, `--radix-*`, `--reach-*`, `--headlessui-*` references | vendor runtime-injected variables |
| Component-local custom properties (defined in the same file/template) | local API, not system drift |
| Names matched by config `allow` globs | declared runtime-injected vars (`--shiki-*`, `next/font`) |
| Files matched by config `ignore` globs | content surfaces exempted by decision |
| Class strings whose Tailwind root has no property mapping (regex fallback mode) | conservative: unmapped roots aren't guessed |
| Files importing a renderer that can't resolve `var()` — `next/og`, `@vercel/og`, `satori`, `react-native`, `@react-email/*`, `@react-pdf/renderer` | a token reference is **not** equivalent to the literal there, so neither the finding nor a fix would be honest |
| Framework image-generation paths — `**/api/og/**`, `opengraph-image.*`, `twitter-image.*`, `apple-icon.*`, `icon.*` | Satori-rendered by convention, including helper components that import nothing telling |
| `class` attributes in Vue/Svelte/HTML markup, and Astro `class:list` | Tailwind class checking is JSX-only for now |

Run `dscheck check --explain-skips` to see the skip counts for a real run.
