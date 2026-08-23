---
title: dscheck.config.json
description: One config file, read by the CLI and both plugins.
---

Zero-config works when your repo has an `@theme` CSS entry or a `tokens.css`/`:root`
block. The config file makes it explicit:

```jsonc
{
  // Token sources, relative globs. Merged into one allowed set.
  "tokens": ["app/tokens.css", "app/global.css"],

  // Files exempt from linting entirely (content pages, generated code).
  "ignore": ["app/blog/**", "src/generated/**"],

  // Custom-property names never reported as unknown —
  // for variables injected at runtime (syntax highlighters, next/font).
  "allow": ["--shiki-*", "--font-geist-*", "--header-height"]
}
```

Discovery walks up from each linted file to the nearest config; nearest wins
([monorepos](/recipes/monorepo/)). `@import "tailwindcss"` in a token source pulls in
Tailwind's full default theme, with your declarations taking precedence; `--tw-*`
internals are always allowed.
