# dscheck — Library improvement sprints

*Status: plan v1, 2026-08-24. Complements [10-sprints.md](10-sprints.md) (OSS excellence — process/trust); this plan improves the linter itself. Sources: known gaps from the build, [07-requirements.md](07-requirements.md) P2/P3 scope, [08-roadmap.md](08-roadmap.md) Phase 3. All sprints are ungated. Each ≈ 1 focused week; corpus expectations are re-pinned (with justification) whenever a sprint moves finding counts.*

## Ordering principle

Correctness gaps first (silent wrongness beats missing features), then the inputs that unlock the family (DTCG, roles), then surface breadth, then fix/DX power. A sprint ships only if the corpus stays explainable and the FP budget holds.

---

## Sprint A — Correctness — **DONE 2026-08-24** (mode scopes incl. media/:root + themed selectors; clsx/cva/template classes — corpus +44 verified true positives; tolerance/rules plumbing; shorthand named colors; tokens --doctor)

**Goal: no real-world repo shape makes dscheck silently wrong.**

| # | ticket | verify |
|---|---|---|
| A1 | **Dark-mode/theme-scope definitions**: custom props declared in `.dark`, `[data-theme=…]`, `@media (prefers-color-scheme)` blocks are token *definitions* (mode values), not ignored — today a token defined only in `.dark` reports as unknown | fixture: light+dark token file; corpus repos re-checked for vanished unknowns |
| A2 | **`clsx`/`cva`/`cn` string arguments**: scan string literals inside call expressions in `className` (and `class:list`) — today `cva('p-[13px]')` escapes entirely; non-literal args still skipped | test matrix: clsx/cn/cva/tv literal args flagged, conditionals skipped |
| A3 | **Template-literal classNames**: static chunks of `` `p-[13px] ${x}` `` scanned; interpolations skipped | tests incl. nested templates |
| A4 | **Config plumbing**: `tolerance` and per-rule `allow` values from `dscheck.config.json` actually reach the checker (today only name-`allow` is wired); document every config key | config round-trip test per key |
| A5 | **Shorthand & edge properties**: `border`, `background`, `outline`, `text-shadow`, `columns` audited for missed/wrong category checks; `letter-spacing`/`line-height` length enforcement decided and documented | snapshot of decisions in rule docs |
| A6 | **Multi-file `:root` precedence**: deterministic ordering when several sources define one token; warn on conflicting duplicates via `dscheck tokens --doctor` | test: conflict surfaces, order stable |

**Exit:** corpus counts re-pinned with a changelog note per delta; zero known "silently wrong" shapes.

## Sprint B — DTCG & multi-source — **DONE 2026-08-24** (DTCG 2025.10 + legacy dialect, aliases/composites, light+dark mode merge, TS token objects via acorn, roles groundwork; B6 delivered as integration fixtures rather than a corpus repo — no good public DTCG app exists; bonus: tsc --noEmit CI gate, caught 3 latent errors)

**Goal: the concept's promise — "DTCG JSON as a first-class source" — is true.**

| # | ticket | verify |
|---|---|---|
| B1 | DTCG 2025.10 parser in core: `$value`/`$type`, `{alias.refs}` with cycle detection, group inheritance | spec-shape fixtures incl. Spectrum/Radix-style files |
| B2 | Mode handling: `$extensions` modes + Tailwind `.dark` values → one token, N mode values; any mode's value is "on-system" | light/dark fixture; no-raw-color matches against both |
| B3 | Roles groundwork: read `$extensions.dscheck.roles` + sidecar `roles.json` (schema per 07 FR1.5) into the index — data only, no rule yet | roles parsed and queryable via `dscheck tokens` |
| B4 | TS/JS token objects (`theme.ts` export) as a source via static evaluation | fixture with `as const` object |
| B5 | Tokens Studio dialect import-convert (`$themes.json` → DTCG in-memory) | real Tokens Studio export fixture |
| B6 | Corpus +1: a DTCG-based repo (non-Tailwind) to hold this honest | 4th corpus entry pinned |

**Exit:** `tokens: ["tokens.json"]` works end-to-end in both plugins and the CLI.

## Sprint C — token-role — **DONE 2026-08-24** (rule + role-aware ranking + `roles --suggest` bootstrap; marketing proposal: 34 tokens)

**Goal: "valid token, wrong job" caught — the family keystone.**

| # | ticket | verify |
|---|---|---|
| C1 | R7: token used in a property outside its declared roles (`--color-surface` as `color:`) → warn with the right-role nearest token | fixtures per role pair |
| C2 | Role-aware suggestion ranking everywhere: a `background` violation suggests bg-role tokens first, then falls back | message snapshots updated |
| C3 | Role inference assist: `dscheck roles --suggest` proposes a starter roles file from token names (`*-foreground` → fg, `surface|bg` → bg) — human commits it, we never guess silently at lint time | run on marketing repo; proposal reviewed |
| C4 | Docs: role schema page + "adding roles to an existing system" guide | pages built, linked from rules |

**Exit:** marketing repo dogfood with roles enabled; at least one real caught misuse.

## Sprint D — Tailwind depth — **DONE 2026-08-24** (synckit engine bridge, candidate-accurate parsing, no-unknown-class w/ did-you-mean, real autofix p-[12px]→p-3, tw-canary workflow; static regex remains the fallback — corpus repos exercise it since clones have no node_modules)

**Goal: first-class on the stack agents actually use — without owning class parsing.**

| # | ticket | verify |
|---|---|---|
| D1 | `@dscheck/tw` package: `loadDesignSystem` from the *target repo's* Tailwind install (isolation layer per 09; static parse remains the fallback) | works in a repo with TW plugins/custom utilities |
| D2 | Candidate-accurate arbitrary parsing via TW's own `parseCandidate` (replaces the regex): variants, modifiers, negative values, `text-[…]` type disambiguation | regex parser deleted; tests ported |
| D3 | **Real autofix** `p-[12px]` → `p-3` (eslint fixer inside the string literal), exact matches only | fix-applied snapshots |
| D4 | Unknown-utility detection (`bg-primry` → did you mean `bg-primary`) when the engine is available | test + corpus check for FP noise |
| D5 | Version matrix in CI: TW 4.0/4.1/latest pinned + canary job tracking `__unstable__` API churn (pre-mortem #3) | matrix green; canary allowed-to-fail |

**Exit:** shadcn corpus entry re-run with engine route; findings ≥ as accurate, zero new FPs.

## Sprint E — CSS-in-JS — **DONE 2026-08-24** (styled/emotion tagged templates w/ exact positions + fixes, css() objects, sx props, pseudo nesting, template-local vars; E4 as fixtures — no suitable public styled+css-vars repo found quickly)

**Goal: the styled-components/emotion template literal — the hardest gap the incumbents wontfixed.**

| # | ticket | verify |
|---|---|---|
| E1 | Tagged-template scanner in the eslint plugin: `styled.div`/`css` tags → parse static CSS chunks with the shared checker; interpolations become skip-markers, never guesses | port of stylelint fixtures + interpolation cases |
| E2 | Object-style `css({...})` / `sx={{...}}` (emotion, MUI-ish) via the existing style-object walker | tests |
| E3 | Positions map into the template (line/col inside the literal), fixes for exact matches in static chunks | editor-accurate ranges asserted |
| E4 | Corpus +1: a real styled-components repo pinned | 5th corpus entry |

**Exit:** a styled-components repo lints with accurate positions and the FP budget intact.

## Sprint F — Fix & DX — **DONE 2026-08-24** (dscheck fix: marketing copy 162→64 mechanically; editor suggestions for near-misses; --since; --watch; baseline --update prune-only; tokens query/--json/--category. Deferred: --interactive stepping, disk index cache — revisit on user pull)

**Goal: from detector to eraser of drift.**

| # | ticket | verify |
|---|---|---|
| F1 | `dscheck fix [paths]`: batch-apply all exact-match fixes via host fixers; `--interactive` steps through near-misses (the Δ2px calls a human makes once) | run on marketing repo; diff reviewed; findings drop measured |
| F2 | ESLint *suggestions* API for near-misses: one-click apply in editors without auto-changing anything | suggestion metadata asserted |
| F3 | `dscheck check --since <ref>`: changed-files mode for pre-push and fast CI | git fixture test |
| F4 | Baseline maintenance: `baseline --update` prunes paid-down entries; report notes "ratchet tightened by N" | round-trip test |
| F5 | `dscheck tokens` grows `--json`, `--category`, fuzzy search; `tokens --doctor` (unresolved aliases, conflicts, orphan namespaces) | CLI snapshot tests |
| F6 | Disk-cached index + `--watch` mode for the hook path (sub-100ms warm lint of one file) | timed in CI bench |

**Exit:** marketing repo taken from 145 findings to ~0 using only dscheck's own tooling — that run becomes a case study for the launch.

---

## Sequencing & interaction with the OSS plan

```
A (correctness) → B (DTCG/modes) → C (roles) → D (tailwind) → E (css-in-js) → F (fix/DX)
                     └── B3 feeds C ──┘             └── D2 deletes A2/A3's regex ──┘
```

- A ships before any publish (Sprint 1 of [10-sprints](10-sprints.md)) — correctness gaps shouldn't reach 0.1.0.
- B+C before the launch post (Sprint 5) — "roles" is the demo that separates dscheck from `declaration-strict-value`.
- D/E/F can trail the launch and be v0.2/v0.3 material, re-cut against real user feedback (10-sprints ticket 5.5).
