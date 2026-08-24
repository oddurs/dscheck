# dscheck — Durability sprints

*Status: plan v1, 2026-08-24. Correctness is proven ([12](12-sprints-road-to-1.0.md)); excellence is built ([10](10-sprints.md)). Durability is the third axis: **the project keeps working as the world changes, and survives its maintainer's absence.** The research graveyard (Specify, Backlight, Pattern Lab, Polaris-lint…) says design-system tooling dies of neglect and churn more often than of bugs — these sprints are the countermeasures. Each ≈ 1 week; all ungated.*

## Threat model

1. **Ecosystem churn** — Tailwind 4.x internals shift (`__unstable__` is a promise of it), eslint 10 / stylelint 17 / Node LTS roll forward, peer ranges rot
2. **External-state rot** — corpus repos get force-pushed or deleted; pinned SHAs vanish; nightly CI fails for reasons that aren't ours
3. **Data-format drift** — baselines, audit files, vendored theme data, and configs written today must be readable by future versions (and fail-fast validation must not reject future configs)
4. **Maintainer absence** — solo project: anything only the maintainer can do is a single point of failure
5. **Slow decay** — perf regressions that creep, snapshots that fossilize, benches nobody reads

---

## Sprint L — Ecosystem churn armor — **DONE 2026-08-24** (eslint 10 + stylelint 17 primary, suite unchanged; oldest-peers CI job; engine-loss fallback test; theme-freshness gate; compat policy; playbooks in RUNBOOK)

**Goal: a host or Tailwind release never breaks users before it breaks CI, and never breaks CI without a playbook.**

| # | ticket | verify |
|---|---|---|
| L1 | **Full peer matrix in CI**: eslint 9 + 10, stylelint 16 + 17, Tailwind 4.0/4.1/4.2/latest — oldest-supported and newest, not just newest | matrix green; any red names the exact combination |
| L2 | **Fallback guarantee test**: simulate engine loss (no tailwind install, engine throwing, worker dead) — the static path must pass the full class-checking suite minus engine-only rules, and `no-unknown-class` must go silent, never wrong | suite runs both modes explicitly |
| L3 | Compat policy page: which host versions are supported for how long (support the two newest majors of each host; floor bumps are majors per the versioning policy) | page live, linked from README |
| L4 | **Upgrade playbooks** as docs: "Tailwind minor bumped and canary is red", "eslint major released", "stylelint changed the suppressions API" — each with the exact files to touch (tw/ isolation layer, adapters) and the tests that prove the fix | playbooks written against the real code layout |
| L5 | Vendored-data freshness: CI job diffs `tailwind-theme.ts` against the currently-pinned tailwindcss package and fails when stale; Renovate's tailwind group triggers regeneration | intentional stale → red |

**Exit:** every supported combination tested; every foreseeable churn event has a playbook.

## Sprint M — External-state & data durability — **DONE 2026-08-24** (corpus cache — offline drill 5/5 exact + exit-3 availability; bundles later made a LOCAL gitignored cache rather than committed artifacts, because the corpus repos' own licenses (AGPL / none) forbid redistribution from an MIT repo — caught pre-public; drill caught knownNames needing the full stylesheet sweep; clone retry; x-*/newer-$schema forward-compat; baseline $version + tolerant reader)

**Goal: nothing outside the repo can break the build; nothing written today becomes unreadable tomorrow.**

| # | ticket | verify |
|---|---|---|
| M1 | **Corpus self-containment**: commit each corpus repo as a shallow git bundle (`fixtures/corpus-bundles/`, LFS if size demands); corpus script prefers upstream, falls back to the bundle with a loud `⚠ upstream gone — running from bundle` — external deletion degrades, never breaks | delete-simulation run passes from bundles |
| M2 | Corpus health separated from correctness: network/availability failures exit distinctly (and don't page as FP regressions); nightly job retries transient git errors once | forced network failure → distinct status |
| M3 | **Config forward-compat**: fail-fast validation learns two escape valves — `x-*` keys are reserved-and-ignored, and a `$schema` pointing at a *newer* schema version downgrades unknown-key errors to warnings. Old dscheck + future config = warn, not die | fixture: future-shaped config lints with a warning |
| M4 | Baseline/audit format versioning: a `"version": 1` field, tolerant reader (unknown fields preserved on rewrite), documented migration story | round-trip test preserves unknown fields |
| M5 | Cache hygiene: any on-disk artifacts dscheck ever writes (baseline, future index cache) carry format versions and are safe to delete wholesale | documented; delete-and-rerun test |

**Exit:** `git clone` + `pnpm install` + `pnpm test` passes on a machine with the corpus upstreams firewalled.

## Sprint N — Maintainer-absence resilience — **DONE 2026-08-24** (RUNBOOK; changesets + OIDC release workflow, zero local credentials; availability warns not fails; flaky quarantine policy; absence drill from fresh clone: zero undocumented steps, log committed)

**Goal: every recurring duty is either automated or written down well enough that a stranger could do it this afternoon.**

| # | ticket | verify |
|---|---|---|
| N1 | **RUNBOOK.md**: release (changesets → tag → publish), corpus re-pin protocol (when counts move legitimately), FP triage → fixture → scoreboard, canary-red response, secret rotation, "the nightly failed" decision tree | a cold read suffices to execute a release dry-run |
| N2 | Releases fully automated: changesets release PR → merge → OIDC publish with provenance — zero local credentials, zero manual steps beyond merging | dry-run through CI |
| N3 | CI self-healing: transient-failure retry (network steps), flaky-test quarantine policy (a flake gets an issue + skip-with-link, never a silent re-run culture) | policy in CONTRIBUTING; retry wrappers in workflows |
| N4 | Succession: repo under the `dscheck` org (at go-public) with a second owner or documented recovery path; npm org likewise; CODEOWNERS; security contact that isn't one inbox | ownership documented in RUNBOOK |
| N5 | **Absence drill**: simulate it — from a fresh clone with no local state, execute N1's runbook end to end (release dry-run, corpus re-pin, FP fixture) touching nothing undocumented | drill log committed |

**Exit:** the drill passes, performed strictly by-the-book.

## Sprint O — Slow-decay countermeasures — **DONE 2026-08-24** (perf trend vs trailing median in corpus gate, history seeded; dependency register; April/monthly/yearly rituals in RUNBOOK; health script + first report committed)

**Goal: decay is measured, so it gets noticed while it's still cheap.**

| # | ticket | verify |
|---|---|---|
| O1 | **Perf trend, not just budget**: corpus job appends ms/file per repo to a committed `fixtures/perf-history.jsonl`; a 2× drift over the trailing median fails even inside the absolute budget | seeded history; synthetic slowdown → red |
| O2 | Dependency posture audit: the runtime dep tree enumerated with a one-line justification each (culori, postcss, picomatch, synckit, acorn, tinyglobby…); smallest-viable check yearly; vendoring criteria written (single-maintainer + tiny + stable = vendor candidate) | `docs/dependencies.md` committed |
| O3 | Node/host floor cadence: floors reviewed each April (Node LTS transition), bumped as majors, recorded in the compat page | calendar note in RUNBOOK; policy live |
| O4 | Snapshot-rot review: golden/API/message snapshots get a scheduled yearly re-read (are these still the *intended* contract?) — a RUNBOOK ritual, not a vibe | checklist entry with date fields |
| O5 | Health without telemetry: a manual `scripts/health.mjs` — npm downloads, open FP count, corpus age, canary status, days since last release — one screen, run monthly | script output committed as first health report |

**Exit:** decay has instruments; the instruments have a schedule; the schedule lives in the RUNBOOK.

---

## Sequencing & posture

```
L (churn armor) → M (external-state) → N (absence) → O (decay instruments)
```

L and M defend against the outside world; N and O defend against entropy and the bus.
Everything is ungated. N4's org transfer lands with go-public but its documentation
doesn't wait. The durability stance stays the same one the stack was chosen for:
**boring dependencies, zero servers, everything reproducible from the repo alone.**
