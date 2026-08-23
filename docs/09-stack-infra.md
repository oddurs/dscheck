# offsystem — Tech stack, integrations, infra

*Status: draft v1, 2026-08-23. Guiding principle from research ([06](06-competitors-lint.md)): every SaaS in this space died (Specify, Backlight, Omlet-hosted). offsystem is OSS, CLI-first, **zero servers** — infra is registries, static pages, and CI.*

## Tech stack

| layer | choice | why |
|---|---|---|
| Language | TypeScript, ESM-only | eslint/stylelint plugins must be JS anyway; one language end-to-end. No Rust in v1 — parse cost lives in the hosts; core is matching logic. Revisit only if CLI-standalone perf demands it. |
| Runtime | Node ≥ 20.19 | ESM/require interop settled; matches eslint 9 / stylelint 16 floors |
| Monorepo | pnpm workspaces (+ turborepo only when build times hurt) | boring, standard |
| Build | tsdown | fast, ESM-first, zero-config d.ts |
| Tests | vitest + rule-fixture snapshots | eslint's RuleTester + stylelint's testRule wrappers on top |
| Repo lint | biome + offsystem on itself (dogfood from day 1) | fast; the dogfood matters |
| CSS parsing (core/CLI) | postcss + postcss-value-parser; css-tree lexer for value classification | stylelint host already provides postcss ASTs — core stays AST-agnostic over a small internal IR |
| Color math | culori | OKLCH conversion + ΔEOK, tree-shakeable, maintained |
| Tailwind theme | `@tailwindcss/node` `loadDesignSystem` (what better-tailwindcss / prettier-plugin-tailwindcss use); **static `@theme` CSS parse as first-class fallback** | reuse Tailwind's own resolution incl. plugins/presets; fallback caps the API-churn risk (roadmap pre-mortem #3) |
| DTCG | own minimal parser (2025.10: `$value/$type/$ref` aliases, cycle detection, modes) | small spec surface; avoids depending on Terrazzo (competitor) — reconsider if spec churn hurts |
| eslint side | flat-config plugin, ESLint ≥ 9; JSX via the host's parser (parser-agnostic rule walkers) | |
| stylelint side | plugin for stylelint ≥ 16; Vue/Svelte via postcss-html customSyntax (P2) | |
| CLI | commander + picocolors | boring on purpose; CLI drives the hosts rather than reimplementing them |
| Versioning | changesets; semver; conventional commits | |

## Package layout

```
offsystem/                      (github: offsystem-dev — or org-claim outcome)
├─ packages/
│  ├─ core/                     @offsystem/core        resolver, value index, matchers, IR, finding type
│  ├─ eslint-plugin/            @offsystem/eslint-plugin
│  ├─ stylelint-plugin/         @offsystem/stylelint-plugin
│  ├─ cli/                      offsystem              check / baseline / report / init / (mcp P3)
│  ├─ sarif/                    @offsystem/sarif       SARIF builder + the standalone stylelint SARIF formatter
│  └─ tw/                       @offsystem/tw          Tailwind theme loading + candidate parsing isolation layer
├─ action/                      offsystem/action       composite GitHub Action (marketplace)
├─ integrations/                hook + recipe snippets: claude-code/, cursor/, lint-staged/, pre-commit/, reviewdog/
├─ fixtures/                    token sets + code samples (rule snapshot corpus)
└─ docs/                        Starlight site
```

Isolation rules: only `tw/` imports Tailwind internals; only adapters import host APIs; `core` depends on nothing host-shaped (it must run in a browser later for the playground).

## Integrations & services

**CI / code review**
- **GitHub Actions** — `offsystem/action@v1`: install, run, SARIF upload (`github/codeql-action/upload-sarif`), optional sticky PR trend comment. Code Scanning fingerprints give "new findings only" on PRs with no baseline file.
- **reviewdog** — `--format rdjson`; recipe in integrations/. GitLab/Azure get SARIF + JSON (no bespoke apps in v1).
- **pre-commit ecosystems** — lint-staged/husky recipe; `.pre-commit-hooks.yaml` for the Python `pre-commit` framework.

**Editors** — free ride: findings surface through the eslint & stylelint VS Code/JetBrains extensions. No own extension in v1.

**Agents**
- Claude Code: shipped `PostToolUse` hook (Edit/Write → lint written file → findings back to the agent) + optional project skill snippet; `--format agent` NDJSON.
- Cursor: hooks/rules recipe.
- MCP (P3): `offsystem mcp` — `lint_file`, `query_tokens`, `nearest_token` — so any MCP-speaking agent can query the allowed set *before* writing.

**Distribution** — npm (with provenance), GitHub Marketplace (action), Starlight docs site, launch channels per roadmap P2.

## Infra (deliberately boring)

| concern | solution | cost |
|---|---|---|
| Registries | npm `offsystem` + `@offsystem/*` (claim in Phase 0); GitHub org per name-claim outcome | $0 |
| Publishing | GitHub Actions + npm **trusted publishing (OIDC) + provenance**; no long-lived tokens; changesets release PR flow | $0 |
| CI | GitHub Actions (free, public repo). Matrix: Node 20/22/24 × ubuntu/macos/windows; peer matrix: eslint 9/10, stylelint 16/17, TW v4 minors pinned+latest | $0 |
| **Corpus CI** (the important one) | nightly job lints ~10 pinned real-world OSS Tailwind/DTCG repos; diffs finding-counts against committed expectations; any jump = FP regression, fails the job. This is how the N2 <5% FP budget is *enforced*, not hoped | $0 |
| Perf gate | vitest bench on fixture repo in CI; budget N1 asserted, not eyeballed | $0 |
| Docs | Starlight → Cloudflare Pages (or GH Pages) | $0 |
| Domain | offsystem.dev via Cloudflare Registrar | ~$12/yr |
| Playground (P3) | static page, `@offsystem/core` in-browser (paste tokens + code → findings); no backend | $0 |
| Telemetry / analytics | **none** in the tool (N4). Docs site: Cloudflare's aggregate analytics only | $0 |
| Security | Dependabot/Renovate, `pnpm audit` in CI, 2FA everywhere, SECURITY.md | $0 |
| Support | GitHub issues + discussions; FP report template auto-asks for token source + snippet → becomes a corpus case | $0 |

**Total standing cost: ~$12/year.** Nothing to keep alive, nothing to get acquired or sunset — which, given the graveyard this research walked through, is itself a competitive feature.

## Deliberate non-choices

- No hosted dashboard/API/DB — the trend report is a CLI artifact + PR comment; if demand appears, a static HTML report (`offsystem report --html`) ships before any server does.
- No Rust/WASM rewrite, no own VS Code extension, no GitHub App, no Tailwind v3, no CJS builds — each is a maintenance surface that doesn't serve M1–M4.
- No Terrazzo dependency in v1 (competitor coupling), but keep the IR close to DTCG so switching to their parser later is cheap.
