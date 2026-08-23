# offsystem

**The linter that knows your design system.**

offsystem reads the token source you already have — a Tailwind v4 `@theme`, DTCG JSON *(planned)*, or plain `:root` custom properties — and flags every off-system value in your code, with the nearest on-system token attached:

```
✖ 48:13  Raw color #2a2520 — use var(--color-cedar-700) (ΔEOK 0.040)   offsystem/no-raw-color
⚠ 19:16  Raw length 14px in padding — use var(--spacing-3) (12px, Δ2px) offsystem/no-raw-length
✖ 12:9   Unknown token --color-primry — did you mean --color-primary?   offsystem/no-unknown-token
```

Built for the age of agent-written UI: coding agents hallucinate plausible off-system values; offsystem catches them and hands back the exact fix, so the agent corrects itself before a human ever sees the diff.

## Why

Every existing "use a token" linter either accepts *any* `var()` without knowing which tokens are real, or is hard-wired to one company's design system. Nothing reads *your* token file and enforces it across CSS, JSX inline styles, style-object constants, and Tailwind arbitrary values. offsystem does exactly that, as ordinary eslint + stylelint plugins over one shared core — plus a CLI for baselines, SARIF, and agent hooks.

## Packages

| package | what |
|---|---|
| `@offsystem/core` | token resolver (`@theme`, `:root`, alias chains, Tailwind default theme) + matchers (ΔEOK color distance, scale steps, name edit-distance) |
| `@offsystem/eslint-plugin` | JSX `style={{}}`, referenced style maps, palette-const folding, Tailwind arbitrary values (`p-[13px]` → *class: p-3*) |
| `@offsystem/stylelint-plugin` | CSS/SCSS declarations, exact-match autofix |
| `offsystem` (CLI) | `check` / `baseline` / `report` / `tokens`; `--format pretty|json|agent|sarif` |
| `@offsystem/sarif` | SARIF 2.1.0 with stable fingerprints; standalone stylelint SARIF formatter |

## Rules

- `no-raw-color` — color literals; ΔEOK-nearest token; alpha-aware; autofix on exact
- `no-raw-length` — raw px/rem in spacing/radius/font-size properties; scale-step suggestions
- `no-unknown-token` — fabricated/typo'd `var(--…)` with did-you-mean
- `no-raw-font` — font stacks, numeric weights
- `no-raw-shadow` — box-shadows, numeric-fingerprint matched
- Literals inside `calc()`/`clamp()`/`min()`/`max()` are deliberate — skipped (vars inside are still validated). Dynamic classnames are never guessed at.

## Use

```jsonc
// offsystem.config.json (optional — zero-config finds @theme/:root css)
{ "tokens": ["app/tokens.css"], "ignore": ["app/blog/**"] }
```

```bash
offsystem check src            # lint
offsystem baseline src         # accept current debt; CI then fails only on new findings
offsystem check --format sarif # GitHub code scanning
offsystem report               # debt by rule + worst files, vs baseline
```

Agent guardrail (Claude Code): see `integrations/claude-code/` — a PostToolUse hook that lints every file the agent writes and feeds the fixes back.

## Status

Pre-release. Docs: [docs/](docs/) — research, concept, competitor analysis, requirements, roadmap.
