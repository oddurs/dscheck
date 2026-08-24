# dscheck — Post-launch sprints

*Status: plan v1, 2026-08-24, written the hour 0.1.0 went live. The engineering axes are
covered (correct → excellent → durable → documented). What's missing now is different in
kind: the package exists but nothing exercises it continuously, releases still need hands,
and there are no users — so there is no evidence, and 1.0 is defined by evidence.
Sequence S → T → U → V.*

## What changed at publish

| before | now |
|---|---|
| "does the code work?" | "does the *published artifact* work, on someone else's machine?" |
| tests and corpus prove behaviour | only an install from the registry proves delivery |
| 1.0 criteria were aspirational | the scoreboard has a real row, and needs two more clean ones |
| naming was a plan | the names are permanent: `dscheck-cli`, `eslint-plugin-dscheck`, `stylelint-dscheck`, `dscheck-core`, `dscheck-sarif`, `dscheck-tw` |

---

## Sprint S — Release machinery (make 0.1.1 boring)

**Goal: releases need no hands, no OTP, no laptop — and the published artifact is watched, not assumed.**

| # | ticket | verify |
|---|---|---|
| S1 | **Automated publishing**: `NPM_TOKEN` secret + `RELEASES_ENABLED=true`; merging the Version PR publishes with `NPM_CONFIG_PROVENANCE=true` | 0.1.1 ships from CI with a provenance badge on every package page |
| S2 | **Trusted publishing** now that the packages exist: configure the OIDC publisher per package, then *remove* the token entirely | a release succeeds with no `NPM_TOKEN` in the repo |
| S3 | **Registry smoke, continuously**: extend `install-smoke` with a mode that installs the *published* versions (not local tarballs) and asserts the documented first run; nightly | a deliberately broken publish would be caught within a day |
| S4 | **Pin what CI runs**: the Action defaults to `dscheck-cli@latest` — pin to the released version at tag time, with `latest` opt-in | supply-chain review: no floating version in the default path |
| S5 | **Changelog as a surface**: changesets output rendered on the docs site and linked from every package README; the versioning policy governs the wording | a reader can answer "what changed and does it affect me?" in one page |
| S6 | **Release drill**: run the whole thing on a no-op patch before any real feature lands | drill logged in `fixtures/drills/`, RUNBOOK corrected wherever it lied |

**Exit:** a release is one merged PR; the published packages are verified daily; provenance on everything.

## Sprint T — The adoption path (from "installable" to "adopted")

**Goal: the distance between finding dscheck and having it green in CI is minutes, on a codebase we didn't design.**

| # | ticket | verify |
|---|---|---|
| T1 | **`dscheck init`**: detect the token source, write `dscheck.config.json`, offer the baseline, print the exact plugin lines for the linters already present | on three unfamiliar repos, init → first useful run with zero manual editing |
| T2 | **Living references**: adopt dscheck in `marketing` and `sava-brand-presentation` for real — config, baseline, CI job, debt paid down — and write up each as a short case study with real numbers | two repos green in CI; case studies published |
| T3 | **Editor truth**: verify the eslint/stylelint plugin experience in VS Code (squiggles, quick-fixes, suggestion menu) and screenshot it for the docs; fix whatever is ugly | recorded walkthrough on the docs site |
| T4 | **Adoption doc, honest**: a page that says *what dscheck will find on day one and what to do about it* — including "your first run will report a lot; here's the baseline" | reviewed against the voice rules |
| T5 | **Migration from the incumbents**: config translation from `declaration-strict-value` and org plugins, plus what dscheck adds and what it doesn't replace | a migration recipe per incumbent |
| T6 | **Framework coverage decision**: Vue/Svelte `<style>` blocks are the biggest honest hole — either implement (stylelint customSyntax path is short) or state the position louder | either shipped, or a documented "not planned, here's why" |

**Exit:** two real codebases enforced by dscheck in CI, with the numbers written down.

## Sprint U — Evidence and the road to 1.0 🔒 partly gated: go-public

**Goal: produce the evidence 1.0 requires, in public, on the record.**

| # | ticket | verify |
|---|---|---|
| U1 | 🔒 **Go public** (RUNBOOK procedure): visibility, Pages deploy, Scorecard publishing, domain if `dscheck.dev` is registered | docs live at a real URL; badges honest |
| U2 | **Seed the contribution surface**: good-first-issues with file/line pointers, a pinned roadmap discussion, labels already in place | an outsider can pick up a task without asking a question |
| U3 | 🔒 **Stranger tests ×3**: outsiders adopt from the README alone; audit their first ten findings; log each in `fixtures/drills/` | 3/3 pass, or the failures become fixes |
| U4 | **FP intake drill**: file a real false-positive issue against ourselves, run it through the 48h loop (fixture → fix → changelog credit → scoreboard) | the loop works before a stranger tests it |
| U5 | **Two more clean releases**: 0.1.1 and 0.1.2 with zero confirmed FPs on supported surfaces | scoreboard shows three consecutive zeros |
| U6 | **Tag 1.0** when U3 and U5 are both satisfied — by the published criteria, not by feeling ready | v1.0.0 with the evidence trail linked from the release notes |

**Exit:** 1.0, earned.

## Sprint V — The family (only what users pull for)

**Goal: extend the surface where real demand shows up — the shared resolver makes each of these small.**

| # | candidate | why it's next | trigger |
|---|---|---|---|
| V1 | **`dscheck contrast`** | the resolver already knows roles and modes; the docs' own contrast audit is a working prototype | any accessibility-shaped request |
| V2 | **`dscheck diff`** | semantic token diff + changelog + blast radius; the gap the research found most underserved | first user with a token-rename migration |
| V3 | **`dscheck mcp`** | agents query the allowed set *before* writing, instead of being corrected after | agent-heavy users, or MCP demand in issues |
| V4 | **`fix --interactive`** | the Δ2px decisions a human should make once, quickly | reported friction paying down a baseline |
| V5 | **Disk index cache / watch perf** | only matters at very large scale | a repo where warm lint is slow |

**Rule:** nothing here starts without a user asking for it. The moat is a deep resolver and
trusted defaults, not breadth — and every new surface is new FP risk against a promise
that's now public.

---

## Sequencing

```
S (releases boring) → T (adoption real) → U (evidence → 1.0) → V (family, on demand)
                                   └── U1/U3 gated on go-public ──┘
```

S first because every later sprint ships through it. T before U because stranger tests
are worth more once `init` and the adoption doc exist. V last, and only on pull.
