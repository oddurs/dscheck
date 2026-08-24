# RUNBOOK

Every recurring duty of this project, written so a stranger could do it this afternoon.
If you find yourself doing something not in here twice, add it.

## Release

1. Changes land on `main` with a changeset (`pnpm changeset` — pick bump per
   [versioning policy](docs-site/src/content/docs/reference/versioning.md)).
2. The `release` workflow keeps a "Version Packages" PR open; merging it tags and
   publishes every package via OIDC trusted publishing — **no local credentials exist**.
3. After publish: update `RELEASES.md` (scoreboard row), verify the npm provenance badge.
4. Dry-run at any time: `pnpm changeset status` and `pnpm changeset version` on a branch.

## Upgrade playbooks (L4)

### tw-canary is red (Tailwind `next` broke the engine bridge)
- The blast radius is `packages/tw/` only — `src/worker.ts` touches
  `__unstable__loadDesignSystem`/`parseCandidate`/`candidatesToCss`; nothing else imports
  Tailwind internals.
- Fix the worker against the new API, keep the `ParsedClass` shape stable (it's the
  contract with the eslint plugin). `packages/tw/src/index.test.ts` +
  `packages/eslint-plugin/src/index.test.ts` ("tailwind engine path") prove the fix;
  the H3 differential proves theme agreement.
- Cannot be fixed today? Ship anyway: the **fallback guarantee** (L2 test) means users
  degrade to the static path. Note it in the changelog.

### Tailwind stable minor released
- Renovate opens the bump PR; CI's `check-theme-freshness` goes red if the default theme
  changed → run `pnpm build && node scripts/update-tailwind-theme.mjs node_modules/.pnpm/tailwindcss@<v>/node_modules/tailwindcss`
  (path printed by the failing check), commit, corpus counts may legitimately move → re-pin protocol below.

### ESLint / stylelint major released
- Bump the devDep in the affected adapter package only; `pnpm build && pnpm test`.
- Adapters are thin by design: breakage lands in `packages/eslint-plugin/src/index.ts`
  (rule/report/fix APIs) or `packages/stylelint-plugin/src/index.ts` (report/fix APIs).
- Keep the previous major in the `oldest-peers` CI job until two majors are newer, then
  raise the peer floor as a **major** release.

### Node LTS transition (each April — O3)
- Review `engines` floors; bump = major. Update CI matrices and the
  [compatibility page](docs-site/src/content/docs/reference/compatibility.md) together.

## Corpus re-pin protocol

Counts in `fixtures/corpus.json` move only with a reason:
1. Confirm the delta is intended (a rule improvement) — sample the new findings, verify
   each is true. A false one is an FP: stop, fix, fixture it.
2. Update `expected`, note the reason in the commit message ("corpus +N: <why>").
3. Regenerate the audit sample: `rm fixtures/audit.json && node scripts/audit.mjs`,
   review every `unreviewed` entry, classify, commit.
4. Refresh bundles if the pin SHA changed: `node scripts/corpus-bundle.mjs`.

## FP triage (the 48h loop)

report → reproduce → minimal case into `fixtures/fp/NNN-name/` (the suite only grows) →
fix → changelog credit → scoreboard entry in `RELEASES.md`. An FP that can't be
reproduced gets a comment asking for the token source + snippet (the issue template
collects these) and stays open 14 days.

## CI health

- **Transient failures** (network, clone): corpus/audit scripts retry once and exit `3`
  for availability problems — exit 3 is *not* a regression; re-run before investigating.
- **Flaky test policy**: a test that fails without a code cause gets an issue + a
  `it.skip` with the issue link in the same PR — never a silent re-run. Quarantined
  tests are reviewed monthly; more than 3 in quarantine blocks releases.
- **Nightly corpus red**: exit 3 → availability (see above). Exit 1 with count drift →
  either a regression (fix) or an unpinned improvement (re-pin protocol). Audit "FALSE" →
  FP triage, highest priority.

## Succession (N4)

- GitHub: repo lives under the `dscheck` org at go-public; a second owner (or a documented
  account-recovery path) is required before 1.0. `CODEOWNERS` covers `packages/`.
- npm: `@dscheck` org with OIDC trusted publishing — publishing survives any laptop.
- Security contact: the repo's SECURITY.md address, monitored by more than one inbox
  before 1.0.
- Everything reproducible from the repo alone: no server, no dashboard, no state that
  isn't committed. If the maintainer vanishes, `git clone` is the handover.

## Scheduled rituals

| when | what |
|---|---|
| monthly | `node scripts/health.mjs` → commit the report to `fixtures/health/`; review flaky quarantine |
| April | Node LTS floor review (playbook above) |
| yearly | snapshot-rot re-read (O4): resolver golden, API surface, message snapshots — confirm each is still the *intended* contract, initial + date below |
| yearly | dependency register review (`docs/dependencies.md`): still maintained? still smallest-viable? |

Snapshot re-reads: `2026-08-24 ✓ (initial)` —
