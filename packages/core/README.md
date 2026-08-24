# dscheck-core

The engine behind [dscheck](https://dscheck.dev): resolves a design system's **allowed
set** from Tailwind `@theme`, DTCG JSON, `:root` custom properties, or TS token objects
(including theme modes and aliases), then matches code values against it — perceptual
ΔEOK for color, scale steps for lengths, edit distance for token names.

Host-agnostic and offline. Used by `eslint-plugin-dscheck`,
`stylelint-dscheck`, and the `dscheck` CLI.

MIT licensed.

Changelog: https://dscheck.dev/reference/changelog/
