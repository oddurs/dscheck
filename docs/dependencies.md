# Dependency register

*O2: every runtime dependency justified, reviewed yearly (RUNBOOK ritual). Criteria for
vendoring a dep: single-maintainer AND tiny AND stable. Last review: 2026-08-24.*

## Runtime (`dscheck-core`)

| dep | why | posture |
|---|---|---|
| `postcss` | CSS AST for the token loader; also a peer of stylelint itself | bedrock; keep |
| `postcss-scss` | scss token sources parse without crashing | official postcss org; keep |
| `postcss-value-parser` | declaration value walking in the checker | tiny + frozen-stable; vendor candidate if it ever breaks |
| `culori` | OKLCH/ΔEOK color math | best-in-class; wrapped in `safeParseColor` (upstream throw contained); vendor candidate (single maintainer) |
| `picomatch` | ignore/allow glob matching | ubiquitous; keep |
| `tinyglobby` | token-source and knownNames file discovery | small, active; fallback would be `fast-glob` |
| `acorn` | static evaluation of TS token objects (never executes code) | bedrock; keep |

## Runtime (adapters & CLI)

| dep | why | posture |
|---|---|---|
| `synckit` (`dscheck-tw`) | sync bridge over Tailwind's async engine for eslint rules | the standard for this problem (prettier plugins use it) |
| `@tailwindcss/node` (`dscheck-tw`) | the engine itself — candidate parsing via Tailwind's own code, never reimplemented | isolated to `packages/tw`; static fallback removes hard dependence |
| `eslint` / `stylelint` / `@typescript-eslint/parser` (CLI) | the CLI drives the real hosts so findings match editors exactly | by design |
| `picocolors` | terminal color | trivial; vendor candidate |
| `postcss-scss` (CLI) | scss customSyntax for the stylelint run | as above |

## Deliberately absent

No HTTP clients, no telemetry SDKs, no config frameworks, no ORMs, no dates/uuids —
dscheck never touches the network at runtime and writes one on-disk file
([versioning](../docs-site/src/content/docs/reference/versioning.md)). Dev-only tooling
(vitest, tsdown, biome, fast-check, changesets) is out of scope here: it can rot without
affecting users, and Renovate keeps it current.
