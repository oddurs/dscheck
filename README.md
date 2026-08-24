# dscheck

**The linter that knows your design system.**

dscheck reads the token source you already have — a Tailwind v4 `@theme`, DTCG JSON *(planned)*, or plain `:root` custom properties — and flags every off-system value in your code, with the nearest on-system token attached:

![dscheck demo](assets/demo/dscheck.gif)

Built for the age of agent-written UI: coding agents hallucinate plausible off-system values; dscheck catches them and hands back the exact fix, so the agent corrects itself before a human ever sees the diff.

## Why

Every existing "use a token" linter either accepts *any* `var()` without knowing which tokens are real, or is hard-wired to one company's design system. Nothing reads *your* token file and enforces it across CSS, JSX inline styles, style-object constants, and Tailwind arbitrary values. dscheck does exactly that, as ordinary eslint + stylelint plugins over one shared core — plus a CLI for baselines, SARIF, and agent hooks.

## Packages

| package | what |
|---|---|
| `@dscheck/core` | token resolver (`@theme`, `:root`, alias chains, Tailwind default theme) + matchers (ΔEOK color distance, scale steps, name edit-distance) |
| `@dscheck/eslint-plugin` | JSX `style={{}}`, referenced style maps, palette-const folding, Tailwind arbitrary values (`p-[13px]` → *class: p-3*) |
| `@dscheck/stylelint-plugin` | CSS/SCSS declarations, exact-match autofix |
| `dscheck` (CLI) | `check` / `baseline` / `report` / `tokens`; `--format pretty|json|agent|sarif` |
| `@dscheck/sarif` | SARIF 2.1.0 with stable fingerprints; standalone stylelint SARIF formatter |

## Rules

- `no-raw-color` — color literals; ΔEOK-nearest token; alpha-aware; autofix on exact
- `no-raw-length` — raw px/rem in spacing/radius/font-size properties; scale-step suggestions
- `no-unknown-token` — fabricated/typo'd `var(--…)` with did-you-mean
- `no-raw-font` — font stacks, numeric weights
- `no-raw-shadow` — box-shadows, numeric-fingerprint matched
- Literals inside `calc()`/`clamp()`/`min()`/`max()` are deliberate — skipped (vars inside are still validated). Dynamic classnames are never guessed at.

## Use

```jsonc
// dscheck.config.json (optional — zero-config finds @theme/:root css)
{ "tokens": ["app/tokens.css"], "ignore": ["app/blog/**"] }
```

```bash
dscheck check src            # lint
dscheck baseline src         # accept current debt; CI then fails only on new findings
dscheck check --format sarif # GitHub code scanning
dscheck report               # debt by rule + worst files, vs baseline
```

Agent guardrail (Claude Code): see `integrations/claude-code/` — a PostToolUse hook that lints every file the agent writes and feeds the fixes back.

## Documentation

Full docs live in [`docs-site/`](docs-site/src/content/docs/) (Starlight; deploys to Pages at go-public):
[agent guardrail](docs-site/src/content/docs/guides/agent-guardrail.md) ·
[eslint](docs-site/src/content/docs/guides/eslint.md) ·
[stylelint](docs-site/src/content/docs/guides/stylelint.md) ·
[CI & baselines](docs-site/src/content/docs/guides/ci.md) ·
[config](docs-site/src/content/docs/reference/config.md) ·
[architecture](docs-site/src/content/docs/reference/architecture.md)

## Contributing

False positives are the highest-priority bug class here — [report one](.github/ISSUE_TEMPLATE/false-positive.yml)
and it becomes a permanent regression fixture. See [CONTRIBUTING.md](CONTRIBUTING.md)
for setup and the rules that protect the core promise, [SECURITY.md](SECURITY.md) for
the threat model, and [RUNBOOK.md](RUNBOOK.md) for how the project is operated.

MIT licensed — see [LICENSE](LICENSE).

## Status & the road to 1.0

Pre-release. 1.0 is a promise, not a feature level — the criteria are public in
[RELEASES.md](RELEASES.md): three consecutive releases with **zero confirmed false
positives on supported surfaces**, plus passed stranger tests. Every finding surface is
contract-tested; every silence is documented and fixture-backed; `fix` is provably
identical-only. Found a false positive? It becomes a permanent fixture in
[`fixtures/fp/`](fixtures/fp/) and a scoreboard entry — that's the deal.

Planning corpus: [docs/](docs/) — research, concept, competitor analysis, requirements, roadmap, sprints.
