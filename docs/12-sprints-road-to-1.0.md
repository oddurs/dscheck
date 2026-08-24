# dscheck — Road to 1.0

*Status: plan v1, 2026-08-24. Implements the 1.0 contract: a linter's 1.0 is a promise, not a feature level. Feature work is done (sprints A–F); these sprints turn "works" into "provably never lies, never damages, never changes shape underfoot." Sprints G–J are ungated engineering; Sprint K carries the release gates. Each ≈ 1 focused week.*

## The contract being engineered

1. Never lie on supported surfaces (zero FPs; silence is deliberate and enumerable)
2. The resolver reads your system correctly, always
3. Fix never damages code
4. A suggestion, applied, yields exactly what it claimed
5. Config/output/baseline contracts frozen and versioned
6. Baseline arithmetic exact across merges and renames

**1.0 is declared by evidence, not by date:** three consecutive releases with zero confirmed FPs on supported surfaces, plus passed stranger tests.

---

## Sprint G — Zero-FP engineering (contract #1)

**Goal: every finding on a supported surface is true, and every silence is a documented decision.**

| # | ticket | verify |
|---|---|---|
| G1 | **"Supported surfaces" spec page**: enumerate every checked construct and every deliberate skip (interpolations, dynamic classnames, math functions, width/height, text-shadow…) with rationale. The anti-placebo document: "didn't check" is never confusable with "passed" | each listed skip has a fixture test asserting the skip |
| G2 | **FP audit harness**: `scripts/audit.mjs` samples findings per repo × rule into a review file; every sampled finding classified true/false, classifications committed. Target on supported surfaces: **0 false** | audit file committed; CI fails if an audited finding's classification flips |
| G3 | `check --explain-skips`: report what was skipped and why (n interpolated decls, n dynamic classnames, n ignored files) — silence made visible and debuggable | snapshot test; count shown in pretty output footer |
| G4 | Corpus → 5 repos: +1 CSS-heavy non-Tailwind (custom-props system), +1 with heavy cva/clsx usage; per-rule expected counts | 5 pins green 7 consecutive nights |
| G5 | FP regression protocol: every FP ever found (corpus, dogfood, future reports) becomes a named fixture in `fixtures/fp/` — the suite that can only grow | suite green; contributing doc references it |

**Exit:** audit shows 100% true on supported surfaces; skip list is exhaustive and fixture-backed.

## Sprint H — Resolver totality (contract #2)

**Goal: no real-world token-source shape parses wrong, and every ambiguity has a diagnostic.**

| # | ticket | verify |
|---|---|---|
| H1 | **Resolver spec matrix**: golden-file fixtures for the full cross-product — `@theme`/`@theme inline`/`:root`/mode scopes/`@import "tailwindcss"`/DTCG aliases/TS objects/multi-source precedence/Tokens Studio dialect — one expected-index snapshot each | matrix suite green; every loader branch covered |
| H2 | **`--doctor` completeness**: a diagnostic for every ambiguity the resolver can't decide — add cross-source duplicates (info), mode-only orphans, unparseable values, category conflicts, empty index. Doctor's inventory IS the resolver's known-unknowns | doc page lists all diagnostics; each has a fixture |
| H3 | **Differential test**: static `@theme` parse vs Tailwind-engine theme on the same entry CSS — token names and values must agree; disagreement fails CI (catches loader drift from TW releases) | differential job green in ci + tw-canary |
| H4 | Property tests: multi-source merge (order invariance where promised, precedence where promised), alias-chain resolution vs a naive reference implementation | fast-check suites, 10k runs |

**Exit:** resolver matrix + differential + doctor inventory all green and complete.

## Sprint I — Fix safety proofs (contracts #3, #4)

**Goal: `fix` is provably harmless; suggestions are provably honest.**

| # | ticket | verify |
|---|---|---|
| I1 | **Round-trip property**: for every fixture and corpus repo — fix → output parses → re-lint yields no new findings → fix is idempotent (second run changes nothing) | property suite in CI |
| I2 | **Suggestion honesty test**: for every emitted suggestion in the test corpus, applying it yields the value the message stated, in the mode it matched (incl. mode-value matches: message must name the mode) | assertion added to corpus script |
| I3 | **Fix at scale**: run `dscheck fix` on all corpus repos + dogfood copies; where the repo builds, build before/after; commit the diff summaries as evidence | zero build regressions; evidence in `fixtures/fix-runs/` |
| I4 | Fix-path fuzz: malformed/hostile inputs never produce a write (temp-dir property test: no file mutation unless a fix applied cleanly) | fuzz suite extended |
| I5 | Mode-aware suggestion messages: when the match came from a mode value, say so (`use var(--color-surface) (dark: #111113)`) — honesty requires naming the mode | message snapshots updated |

**Exit:** round-trip + honesty + scale-run all green; fix documented as "provably identical-only".

## Sprint J — Contract freeze (contracts #5, #6)

**Goal: everything a user's CI or script can parse is schema'd, tested, and versioned.**

| # | ticket | verify |
|---|---|---|
| J1 | **JSON Schema for `dscheck.config.json`** — published on the docs site, `$schema` support, validated at load with friendly errors (unknown key → did-you-mean) | schema tests; bad-config fixtures produce good errors |
| J2 | **Output contracts**: JSON + agent-NDJSON schemas published and schema-validated in tests; SARIF snapshot; exit codes specified; `--format` outputs never write to stderr noise | contract test suite |
| J3 | **Baseline invariants as property tests**: absorb ≤ accepted, count-rise reports all, `--update` monotonically non-increasing, stable across file renames (documented behavior) and git merges (counts, no lines — test the merge story) | fast-check suite |
| J4 | **Semver policy finalized** (new findings = minor, changed defaults/messages-shape = major, message *text* = patch), deprecation policy, and the freeze list (rule ids, config keys, formats) on one docs page | policy page live; CHANGELOG template references it |
| J5 | **Public API snapshot**: exported surface of `@dscheck/core` and both plugins snapshot-tested — accidental API change fails CI | api snapshot committed |

**Exit:** a script written against 0.x output/config keeps working, verifiably, through 1.0.

## Sprint K — Beta, proofs, and the tag 🔒 gates: npm login, go-public

**Goal: 1.0 earned in public, declared by the criteria, not the calendar.**

| # | ticket | verify |
|---|---|---|
| K1 | 🔒 Publish 0.1.0 (executes 10-sprints Sprint 1: provenance, publint/attw, install matrix, Action) | live on npm |
| K2 | 🔒 Go public + launch (10-sprints Sprints 3+5) with 1.0 criteria stated openly in the README — "we tag 1.0 after N clean releases", invite FP hunting | criteria published |
| K3 | **Stranger tests ×3**: outsiders adopt via README alone; protocol: record time-to-first-finding and audit their first 10 findings — all must be true | 3 recorded runs, all pass |
| K4 | FP pipeline exercised in anger: report → `fixtures/fp/` case → fix → changelog credit, within the 48h SLA | ≥1 real cycle completed |
| K5 | **1.0 scoreboard**: `RELEASES.md` tracking per-release confirmed-FP count on supported surfaces; tag 1.0 at three consecutive zeros + K3 passed | scoreboard public; 1.0 tagged when criteria met |

**Exit:** v1.0.0, with the evidence trail public.

---

## Sequencing

```
G (zero-FP) → H (resolver) → I (fix proofs) → J (freeze) ──► [gates] K (beta → 1.0)
```

G–J are pure engineering and can start immediately. K1/K2 unblock on `npm login` and the go-public decision; K3–K5 need real outsiders, so the 0.x beta window is where the calendar re-enters. Nothing in G–J is wasted if gates slip — it all hardens 0.1.0 too.
