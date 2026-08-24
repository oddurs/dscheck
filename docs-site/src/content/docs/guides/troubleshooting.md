---
title: Troubleshooting
description: The likeliest failure modes, diagnosed in order — no findings, missing tokens, engine inactive, monorepo confusion.
sidebar: { order: 6 }
---

Work top to bottom — each step rules out a layer.

## "No findings" on a file that clearly has raw values

1. **Is a design system being found at all?** Run `dscheck tokens` from the file's
   directory. Empty output means config discovery found nothing — add a
   [`dscheck.config.json`](/reference/config/) or check its `tokens` globs
   (`dscheck tokens --doctor` reports an empty set explicitly).
2. **Is the file exempt?** Check the config's `ignore` globs, and run
   `dscheck check --explain-skips` — it prints what was deliberately not checked
   (ignored files, interpolated declarations, dynamic classnames, math functions).
3. **Is the value on a checked property?** Some properties are deliberately not
   enforced (`width`, `letter-spacing`, `text-shadow`…). The complete inventory:
   [supported surfaces](/reference/supported-surfaces/).
4. **Is there a token to enforce against?** Rules only fire when your system defines
   tokens of that category. No shadow tokens → no `no-raw-shadow` findings, by design.

## An OG image / React Native / email component reports nothing

Deliberate. Those renderers don't resolve CSS custom properties, so `var(--color-x)`
is not equivalent to the literal it replaces — reporting (or worse, fixing) there would
break rendering while the code still parses. dscheck detects the import and skips the
file. Keep design decisions in those files in sync by hand, or generate them from the
token source at build time.

## "Unknown token" on a variable that exists

- Defined in another file of the project? That's covered automatically (stylesheets
  project-wide feed the known-names inventory) — but only for `.css`/`.scss` files.
  A variable set **from JavaScript** (`style.setProperty`) is invisible to static
  analysis: declare it in the config's `allow` globs.
- Vendor-injected variables (`--tw-*`, `--radix-*`, `--reach-*`, `--headlessui-*`)
  are already allowed; others (`--shiki-*`, `next/font`) belong in `allow`.

## `no-unknown-class` never fires / Tailwind parsing seems approximate

The class-level engine needs Tailwind installed **in the linted project** (that's where
your theme and plugins live). Without it, dscheck degrades to a conservative static
parser: arbitrary values are still checked, but fabricated utilities can't be detected
and variant parsing is approximate. Install `tailwindcss` locally, or accept the
fallback — it never guesses, so it never lies.

## Monorepo picks the wrong tokens

Discovery walks up from each linted file to the **nearest** `dscheck.config.json`; an
explicit config anywhere up to the repository root beats zero-config discovery at a
package boundary. Per-package systems: one config per package. One shared system:
one config at the root. Verify with `dscheck tokens` run from inside the package.

## The baseline isn't absorbing / keeps failing

- Counts are per file **and rule**: when a file's count for a rule rises, every
  occurrence in that file is reported — dscheck doesn't guess which one is new.
  Fix the new one and the file goes quiet again.
- After paying debt down, run `dscheck baseline --update` (prune-only: counts can
  fall, never rise).

## Config errors on a key you're sure about

Validation fails fast with a did-you-mean on unknown keys. Two escape valves:
`x-` prefixed keys are reserved extension space (always ignored), and a config written
for a newer dscheck (`$schema` pointing at a newer version) downgrades unknown-key
errors to warnings.

## Still stuck

`dscheck tokens --doctor` prints every ambiguity the resolver couldn't decide
([the full inventory](/reference/doctor/)). If a finding itself is wrong, that's a
false positive — [we want it](https://github.com/oddurs/dscheck/blob/main/RELEASES.md):
it becomes a permanent regression fixture and a scoreboard entry.
