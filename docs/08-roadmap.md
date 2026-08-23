# offsystem — Roadmap

*Status: draft v1, 2026-08-23. Solo developer + agents; estimates assume part-time focus. Each phase has exit criteria — a phase isn't done until they pass.*

## Phase 0 — Claim & scaffold — **DONE 2026-08-23** (npm claim blocked: needs `npm login`; GH org deferred, private repo `oddurs/offsystem`)

- Confirm name; claim `offsystem` + `@offsystem` scope on npm (placeholder publish), GitHub org (`offsystem` user is taken-but-empty → use `offsystem-dev` or file a name claim; decide then), domain `offsystem.dev` if free.
- Scaffold monorepo (09 §layout): pnpm workspaces, tsdown, vitest, biome, changesets, CI skeleton.
- **Spike the resolver risk first:** load a real Tailwind v4 theme via `@tailwindcss/node` and print the value index from one of my repos. If Tailwind's internal API is unusable, the static-CSS-parse fallback becomes primary — find out now.
- ✅ Exit: `pnpm test` green in CI; spike prints a correct value index from a real repo.

## Phase 1 — MVP: the agent guardrail — **DONE 2026-08-23** (M1: 19 findings vs 0 with guardrail; M2: zero-config on 2nd repo; clamp/calc FP fix)

Scope = the demo, nothing else (FR1 minus roles, R1–R3, MVP surfaces, agent format, hook).

1. `@offsystem/core`: resolver (@theme via TW engine + static fallback, DTCG, :root) → value index; matchers (ΔEOK via culori, scale steps, Levenshtein). → verify: unit tests on fixture token sets incl. alias cycles, mode flattening.
2. `@offsystem/stylelint-plugin`: R1–R3 on CSS/SCSS declarations. → verify: fixture snapshots + run on dogfood repo.
3. `@offsystem/eslint-plugin`: R1–R3 on JSX `style={{}}`; Tailwind classname strings for R1/R2 literals only (arbitrary-class waits for P2). → verify: same.
4. `offsystem` CLI: `check` (drives the hosts), `--format pretty|json|agent`. → verify: NDJSON schema test.
5. Claude Code `PostToolUse` hook + docs snippet. → verify: **M1 demo run** — record the with/without numbers.
- ✅ Exit: M1 achieved (0 vs N≥10) on a real repo; M2 rehearsed on a second repo; FP eyeball-pass on both.

## Phase 2 — CI citizen & launch — **ENGINEERING DONE 2026-08-23**; gated remainder: GitHub Action + docs site + launch (need npm publish → `npm login`, and the public-repo decision)

1. Rules R4 (`no-arbitrary-class` wrapping Tailwind's canonical machinery), R5, R6; autofix per FR5.
2. SARIF with stable fingerprints (+ standalone stylelint-SARIF formatter package — free adoption wedge); rdjson.
3. Baseline: host-suppressions interop verified end-to-end; `offsystem baseline` + `offsystem report` (trend).
4. `offsystem/action` GitHub Action: run → SARIF upload → optional sticky PR comment ("off-system: 41 → 38").
5. Corpus CI (09 §infra) live; N2 FP budget measured, defaults tuned against it.
6. Docs site (Starlight, static) + README + the M1 demo as a 90-second recording.
7. **Launch:** Show HN + design-systems Slack/newsletter circuit + Tailwind community. Positioning per 06 §5.
- ✅ Exit: a stranger can adopt via README alone (M2); corpus FP < 5%; launch shipped.

## Phase 3 — Depth (months 3–5)

- `token-role` rule (R7) + roles schema — the input the whole family reuses.
- One CSS-in-JS flavor (chosen by what dogfood/users actually hit); Vue/Svelte via customSyntax.
- Monorepo multi-source configs; TS/JS token-object source.
- `offsystem mcp`; Cursor hooks recipe; VS Code "explain this finding" via eslint suggestions polish.
- Tokens Studio dialect import; deprecation maps (`old-token → new-token` autofix — what org plugins have and we don't).
- Triage: respond to every issue < 48h; FP reports become corpus cases.
- ✅ Exit: M4 traction targets; ≥ 1 external contributor merged.

## Phase 4 — The family (month 6+, gated on Phase 3 traction)

Same resolver, new commands (00-angles): `offsystem contrast` (role-aware matrix, WCAG2+APCA, baseline-diffable) → `offsystem diff` (semantic token diff/changelog/codemod) → `offsystem audit` (Playwright rendered check). Order by user pull, not by plan. Do **not** start these early — the moat is a deep resolver + trusted defaults, not breadth.

## Pre-mortem (top 5, from 06 §4)

1. **Noise kills it** → N2 budget is a hard gate; skip-don't-guess on dynamic code; `warn` defaults for lengths.
2. **Tailwind ships it in core** → R4 stays a thin wrapper; differentiation lives in cross-surface + distance + trend, never in class parsing.
3. **Tailwind internal API churn** (`__unstable__loadDesignSystem`) → static fallback maintained as first-class; pin + test matrix per TW minor.
4. **Terrazzo adds code-usage lint** → speed + eslint/stylelint distribution they lack; consider building *on* their parser to make us complementary.
5. **Solo-maintainer credibility** (06: vendor mortality) → boring stack, tiny surface area, MIT, no SaaS, publish provenance — look unkillable.
