# dscheck — Sprints for open-source excellence

*Status: plan v1, 2026-08-23. Follows phases 0–2 ([08-roadmap.md](08-roadmap.md)); these sprints take dscheck from "working code, green CI" to an exemplary OSS project. Solo + agents; each sprint ≈ 1 focused week. Sprints 2 and 4 can run before/parallel to gated work; Sprint 1 unblocks on `npm login`, Sprint 3's go-live is a user decision.*

## Doctrine

Open-source excellence for a linter is **trust**, earned four ways: it installs cleanly everywhere, its docs answer the question you actually have, its defaults never cry wolf, and the project looks alive and safe to depend on. Every ticket below serves one of those.

---

## Sprint 1 — Installable excellence (packaging & releases) 🔒 gated: npm login

**Goal: `pnpm add -D @dscheck/eslint-plugin` is flawless on every runtime we claim.**

| # | ticket | verify |
|---|---|---|
| 1.1 | Claim `dscheck` + `@dscheck/*`; npm **trusted publishing (OIDC) + provenance**, no long-lived tokens | provenance badge on package page |
| 1.2 | Package metadata: description, keywords, `repository`/`homepage`/`bugs`, `funding`, exports maps | `publint` + `arethetypeswrong` clean on all 5 packages |
| 1.3 | changesets release flow: release PR → tag → publish → GitHub Release notes | one dry-run + one real 0.1.0 release |
| 1.4 | Install smoke-test in CI: npm/pnpm/yarn/bun × node 20/22/24 — fresh project, install, first finding | matrix green; M2 (<5 min to first finding) timed in CI |
| 1.5 | Semver + support policy in README (what's a breaking change for a *linter* — new findings = minor, changed defaults = major) | documented, linked from CHANGELOG |
| 1.6 | GitHub Action `dscheck/action@v1` (now unblocked): run → SARIF upload → sticky PR trend comment | marketplace listing; used in our own corpus workflow |

**Exit:** 0.1.0 live with provenance; a stranger's repo gets its first finding in under 5 minutes using only the README.

## Sprint 2 — Documentation excellence (no gate — can start now)

**Goal: every question a user hits in the first hour is answered one click away.**

| # | ticket | verify |
|---|---|---|
| 2.1 | Docs site: Astro Starlight → Cloudflare Pages, custom domain if bought | site live, `<2s` load |
| 2.2 | Per-rule pages: what it flags, why, ✅/❌ examples, options, *when to disable* — each rule's `meta.url` points at its page | link-check CI; zero dead `meta.url`s |
| 2.3 | Persona guides: (a) eslint flat config, (b) stylelint, (c) CLI + CI/SARIF, (d) **Claude Code / Cursor guardrail** — the headline guide | each guide executable start-to-finish in a clean repo |
| 2.4 | The M1 demo as a 90-second recording + before/after GIF on the landing page | asset committed; plays in README |
| 2.5 | Recipes: lint-staged, pre-commit, reviewdog, GitHub code scanning, monorepo/multi-brand, baseline adoption on a legacy codebase | one page each, copy-paste ready |
| 2.6 | Architecture doc for contributors (resolver → checker → adapters; where a new rule goes; corpus philosophy) | a first-time contributor adds a trivial rule using only this doc |

**Exit:** docs site live; every rule documented; the agent-guardrail guide is the best page on the site.

## Sprint 3 — Community health & going public 🔒 go-live gated: user decision

**Goal: the repo looks — and is — safe to depend on and easy to contribute to.**

| # | ticket | verify |
|---|---|---|
| 3.1 | LICENSE (MIT), CONTRIBUTING (setup, tests, corpus rules, FP philosophy), CODE_OF_CONDUCT, SECURITY.md w/ disclosure path | GitHub community-health checklist 100% |
| 3.2 | Issue templates: bug (requires token source + snippet), **false-positive report** (auto-asks for the exact fields a corpus case needs), feature; PR template w/ checklist | FP template → corpus case pipeline exercised once |
| 3.3 | Labels taxonomy (rule:*, fp, dx, docs, good-first-issue); seed 6–8 real good-first-issues with pointers | issues filed with file/line pointers |
| 3.4 | Repo polish: description, topics, social-preview image, Discussions on, pinned "roadmap" discussion | — |
| 3.5 | **Go public** + transfer to `dscheck` org; branch protection; CODEOWNERS | org owns repo; old URLs redirect |
| 3.6 | Adopt dscheck in my other repos (marketing, sava-brand-presentation) as living references | 2 public-visible consumers (if repos allow) |

**Exit:** public, 100% community checklist, first-hour contributor path proven.

## Sprint 4 — Trust: tests, corpus, supply chain (no gate — can start now)

**Goal: the defaults never cry wolf, and the supply chain is visibly clean.**

| # | ticket | verify |
|---|---|---|
| 4.1 | Coverage gate: ≥85% on core, reported in CI + badge | threshold enforced, not aspirational |
| 4.2 | Property/fuzz tests for the value parser paths (pathological CSS: nested funcs, comments-in-values, unicode, huge files) | zero crashes over 100k generated inputs |
| 4.3 | Corpus → 4–5 pinned repos (mix: TW v4 app, component lib, non-TW custom-props repo); publish FP-rate per rule as CI artifact | 7 consecutive green nights before launch |
| 4.4 | Perf benchmark in CI with budget assertion (N1: 1k files < 5s; resolver < 200ms warm) | regression fails CI |
| 4.5 | Supply chain: Renovate, actions pinned by SHA, OpenSSF Scorecard workflow + badge, `pnpm audit` gate | Scorecard ≥ 7 |
| 4.6 | Error-message audit: every finding ≤ 2 lines, names value + token + distance; snapshot-tested | message snapshots reviewed once, locked |

**Exit:** corpus + coverage + scorecard all enforced by CI, badges honest.

## Sprint 5 — Launch & the feedback flywheel 🔒 sequenced after 1–4

**Goal: arrive credible, respond fast, convert feedback into corpus cases.**

| # | ticket | verify |
|---|---|---|
| 5.1 | Launch post: "The linter that knows your design system" — the M1 numbers, the tailwindcss.com findings, the hook demo | published on docs site |
| 5.2 | Show HN + design-systems newsletter/Slack circuit + Tailwind Discord + r/webdev; stagger over a week | posted; links tracked in a launch log |
| 5.3 | Triage SLA: every issue answered < 48h for the first month; FP reports → corpus case → fix → credit in changelog | SLA held; ≥1 FP converted end-to-end |
| 5.4 | Metrics baseline: stars/downloads/issues dashboard (M4: 500★ or 5k dl/wk in 3 months) | weekly snapshot committed |
| 5.5 | v0.2 scope cut *from feedback only* (candidates: roles rule, one CSS-in-JS flavor, DTCG source — see roadmap P3) | scope doc referencing ≥3 user reports |

**Exit:** launched, SLA held one month, v0.2 scoped by users rather than by us.

---

## Sequencing

```
now ──► Sprint 2 (docs) ──► Sprint 4 (trust) ──► [npm login] Sprint 1 ──► [go-public] Sprint 3 ──► Sprint 5
        └────────── both ungated; can interleave ──────────┘
```

Docs and trust work start immediately; packaging waits on the npm gate; community/go-live on your call; launch last, on top of all four.
