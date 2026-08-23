# Concept: `dslint` — the off-system value linter

*Working name. Status: concept, 2026-08-23. Draws on [00-angles.md](00-angles.md) angle A, [01 §4 Linting](01-tooling-landscape.md), [03 §4.1/4.4](03-ai-era-opportunities.md), [04 §4](04-foundations-craft-problems.md).*

## One-liner

**A linter that knows *your* design system.** It reads your token source, then flags every value in your code that isn't from it — and tells you which token you meant.

## The problem it solves

A design system is a promise that UI uses a finite set of values. Nothing enforces the promise:

- `stylelint-declaration-strict-value` forces "use a variable" but accepts *any* `var()`, and won't touch CSS-in-JS (wontfix #134).
- Every org that cares (Atlassian, Shopify, Mozilla, MetaMask) wrote bespoke rules hard-wired to their own package. Polaris's is archived. Nothing is reusable.
- Tailwind v4 made the token set machine-readable (`@theme`) but arbitrary values (`p-[13px]`, `text-[#333]`) punch straight through it, and nothing tracks how often.
- Agents (Claude Code, Cursor, v0) now write most new UI and "hallucinate" plausible-but-off-system values: `#3b82f6` instead of `--color-primary`, `gap: 14px` instead of `--space-3`, `--color-surface` used as text color.
- Drift is invisible until someone audits by hand (Shopify: 14% of admin UI off-system after a year, found via a weekly manual 20-minute audit).

The research verdict: DS tooling has plenty of generators and no validators. This is the first validator.

## Who it's for

1. **Anyone using an agent against a codebase with a design system** — the agent's guardrail. Runs in the loop (pre-commit / CI / agent hook) so the agent fixes its own drift before a human sees it.
2. **The lone DS maintainer** (median team = 2 people) who can't review every PR but can make CI say no.
3. Later: teams measuring adoption — "% off-system values per package, over time" is the adoption metric nobody has.

## Core idea: one allowed-set, many surfaces

```
            ┌───────────────┐
 DTCG JSON ─┤               │
 @theme CSS ┤  allowed set  ├──► value index (by $type, with roles)
 :root vars ┤   resolver    │
 TS/JS obj ─┤               │
            └───────────────┘
                    │
   ┌────────────────┼──────────────────────┐
   ▼                ▼                      ▼
 CSS / SCSS    JSX/TSX inline,         Tailwind classes
 declarations  styled-components,      (arbitrary values,
               CSS-in-JS objects       off-theme utilities)
   └────────────────┼──────────────────────┘
                    ▼
          findings → nearest token → --fix / JSON / SARIF / pretty
```

The resolver is the asset. The surface scanners are thin. New surface = new scanner, same rules.

## Rules (v1)

| rule | fires when | example |
|---|---|---|
| `no-raw-color` | a color literal appears where a color token exists | `color: #3b82f6` → suggest `var(--color-primary)` (ΔE 0.4) |
| `no-raw-length` | px/rem/em literal in a spacing/size/radius property | `gap: 14px` → suggest `--space-3` (12px) or `--space-4` (16px) |
| `no-raw-font` | font-size / weight / family / line-height literal | `font-size: 15px` → `--text-sm` |
| `no-raw-shadow` | box-shadow literal | → `--shadow-md` |
| `no-unknown-token` | `var(--x)` where `--x` isn't in the allowed set (typo, deleted, fabricated by agent) | `var(--color-primary-500)` → `--color-primary` |
| `no-arbitrary-class` | Tailwind `[…]` arbitrary value when a theme utility exists | `p-[13px]` → `p-3` |
| `token-role` *(opt-in)* | token used outside its declared role | `color: var(--color-surface)` → surface tokens are `bg` only; did you mean `--color-text` |

Each finding carries: file:line:col, property, raw value, **nearest token(s) with distance**, fixability, and the rule. "Nearest" is perceptual for color (OKLCH ΔE), numeric for lengths (exact or ±1 step), string-match for fonts.

## The `--fix` policy

Auto-fix only when the match is exact or within a configurable tolerance (default: ΔE < 1, lengths exact). Everything else is a suggestion. A linter that "fixes" `14px` to `12px` silently breaks layouts — it must ask.

## Escape hatches are data, not noise

`/* dslint-allow no-raw-color: brand illustration */` suppresses *and* records. `dslint report` prints suppressions and arbitrary values as a trend — the first tool to track escape hatches over time (01 gap #11).

## Config

```jsonc
// dslint.config.json
{
  "tokens": ["./tokens/*.json", "./src/app.css#@theme"],  // any mix of sources
  "include": ["src/**/*.{css,scss,tsx,jsx,vue,svelte}"],
  "tolerance": { "color": 1.0, "length": 0 },
  "roles": "./tokens/roles.json",     // optional: { "color.surface.*": ["bg"], "color.text.*": ["fg"] }
  "rules": { "no-arbitrary-class": "warn" }
}
```

Zero-config path: if `app.css` has an `@theme` block or `tokens.json` exists, it just works.

## Fits the existing lint + CI stack (first-class, not later)

Nobody wants a fifth linter with its own runner, config, and CI step. The core is a library; the things people actually run are adapters into tools they already have.

```
                 @dslint/core   (resolver + scanners + rules + nearest-token)
                       │
   ┌───────────┬───────┴────────┬──────────────┬─────────────┐
   ▼           ▼                ▼              ▼             ▼
 eslint      stylelint        biome/oxlint   dslint CLI    agent hook
 plugin      plugin           (when plugin    (thin; for    (Claude Code /
 (JSX/TSX,   (CSS/SCSS/       APIs land)     repos with    Cursor post-edit)
 CSS-in-JS,  vue/svelte                       no linter)
 Tailwind)   <style>)
```

**Editor + PR experience comes for free**: eslint/stylelint already run in VS Code, in `lint-staged`, in every CI. dslint rules show up as ordinary squiggles and ordinary CI failures, next to the team's other rules, with the team's existing severity/override/disable conventions.

### Drop-in
```js
// eslint.config.js (flat config)
import dslint from '@dslint/eslint-plugin';
export default [
  dslint.configs.recommended({ tokens: ['./src/app.css#@theme'] }),
];
```
```js
// stylelint.config.js
export default { plugins: ['@dslint/stylelint-plugin'], rules: { 'dslint/no-raw-color': true } };
```
One `dslint.config.json` at the root is shared by all adapters so the token source is declared once.

### CI conventions it honours
- **Exit codes & severities** follow eslint/stylelint (`error` fails, `warn` doesn't). No custom exit semantics.
- **SARIF** output → GitHub Code Scanning annotations, GitLab, Azure DevOps. Also plain `--format github` workflow commands for repos without code scanning.
- **Baseline / "only new"**: `dslint baseline` writes `.dslint-baseline.json`; CI fails only on findings not in the baseline (the Betterer / `eslint --max-warnings` pattern). Legacy debt doesn't block; it's reported as a number that should go down.
- **Changed-files mode**: `--since origin/main` or works under `lint-staged` / `pre-commit` / reviewdog with no special handling because it's just an eslint/stylelint rule.
- **Caching**: resolver output is cached by token-source hash; eslint's `--cache` covers the rest.
- **Monorepos**: config discovery walks up like eslint; per-package token sources allowed (a `packages/marketing` brand vs `packages/app`).
- **Action**: `dslint/action@v1` = setup + run + SARIF upload + optional PR comment with the trend ("off-system values: 41 → 38, 3 suppressions added").

### Agent loop
`dslint --format agent` emits one compact JSON line per finding, suggestion first. Shipped hook snippet for Claude Code (`PostToolUse` on Edit/Write) so the agent lints its own writes before the human or CI sees them. Same rules, same config — the agent is just another consumer of the eslint output.

## What it is *not*

- Not a Figma tool. Figma is out of scope (Enterprise-gated API, lossy). Token file is the contract.
- Not a token *generator* or docs site.
- Not a new linter runner. It rides on eslint/stylelint; the CLI exists only for what those can't do (baseline, trend report, SARIF for CSS-only repos).

## MVP (week 1–2)

1. Resolver: DTCG 2025.10 + Tailwind v4 `@theme` + `:root` custom props → value index. Aliases resolved, modes flattened to a default.
2. Scanners: plain CSS/SCSS declarations + JSX inline `style={{}}` + Tailwind arbitrary classes in className strings.
3. Rules: `no-raw-color`, `no-raw-length`, `no-unknown-token`, `no-arbitrary-class`.
4. Ship as `@dslint/eslint-plugin` (JSX/TSX + Tailwind strings) and `@dslint/stylelint-plugin` (CSS/SCSS) over the shared core; thin CLI only for SARIF/baseline/report. `--fix` via the hosts' own fixers for exact matches.
5. Baseline mode + SARIF so it can be turned on in an existing CI without a cleanup sprint.
6. Dogfood on one of my own repos with an `@theme`; measure off-system count before/after one agent session.

**Success criteria:** (a) a team with eslint+stylelint in CI adopts it by adding one plugin line and one config file, with no new CI step; (b) run an agent against a repo with dslint in a hook; agent-produced PR lands with zero off-system values without a human asking.

## Phase 2 (the family)

Same resolver, new commands — see [00-angles.md](00-angles.md):
`dslint contrast` (role-aware contrast matrix), `dslint diff` (semantic token diff / changelog), `dslint audit` (Playwright rendered check). Roles, introduced here as opt-in, become the key input for all three.

## Risks / open questions

- **Tailwind class parsing** is the messiest surface (conditional classnames, `clsx`, `cva`). Start with string literals; ignore dynamic.
- **CSS-in-JS** (styled-components, Emotion, vanilla-extract, Panda) — each is a scanner. Pick one for MVP based on dogfood repo.
- **False-positive fatigue** kills linters. Defaults must be conservative: warn on lengths, error on colors and unknown tokens.
- **Naming**: `dslint` collides with nothing on npm as of writing (to verify). Alternatives: `tokenlint`, `offsystem`, `onsystem`.
- Multi-mode tokens (light/dark): v1 treats any mode's value as allowed; role checks are mode-agnostic.
