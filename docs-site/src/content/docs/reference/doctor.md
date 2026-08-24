---
title: tokens --doctor
description: Every ambiguity the resolver cannot decide, surfaced.
---

`dscheck tokens --doctor` is the resolver's complete known-unknowns inventory — if the
resolver had to guess, doctor tells you. Exit `1` on any error-level diagnostic.

| diagnostic | meaning | fix |
|---|---|---|
| `empty` | token sources matched no tokens | check the `tokens` globs in config |
| `conflict` | one name, different primary values, in root/theme scopes | keep one, or move the variant into a mode scope (`.dark`, `[data-theme=…]`) |
| `unresolved` | a `var()` chain (or SCSS `#{…}` interpolation) never reaches a literal | define the missing target; unresolved tokens are *known names* but can't participate in value matching |
| `dangling` | an alias points at a name that doesn't exist | fix the reference |

What doctor deliberately does **not** flag:

- **Mode values** (same name re-valued in `.dark`, `[data-theme=…]`, media-wrapped `:root`,
  or a later token file) — that's the supported theming pattern, not a conflict.
- **Cross-file component vars** — custom properties declared outside root scopes are
  component API; they're inventoried so `no-unknown-token` never lies about them, but
  they're not system tokens.
- **Vendor runtime vars** (`--tw-*`, `--radix-*`, …) — never expected in your sources.
