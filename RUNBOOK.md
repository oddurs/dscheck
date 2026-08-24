# RUNBOOK

Every recurring duty of this project, written so a stranger could do it this afternoon.
If you find yourself doing something not in here twice, add it.

## Release

1. Changes land on `main` with a changeset (`pnpm changeset` — pick bump per
   [versioning policy](docs-site/src/content/docs/reference/versioning.md)).
2. The `release` workflow keeps a "Version Packages" PR open; merging it tags and
   publishes every package via OIDC trusted publishing — **no local credentials exist**.
   Publishing is armed by the repo variable `RELEASES_ENABLED=true`
   (`gh variable set RELEASES_ENABLED -b true`) — set it once, at the first deliberate
   release, after npm trusted publishing is configured for this repo+workflow.
3. After publish: update `RELEASES.md` (scoreboard row), verify the npm provenance badge.
4. Dry-run at any time: `pnpm changeset status` and `pnpm changeset version` on a branch.

## First release (K1) — everything is staged behind two commands

Prepared and verified already: all six packages publint-clean with complete metadata,
per-package READMEs and LICENSE, the changesets + OIDC workflow, and an install
smoke-matrix that packs the real tarballs and asserts a fresh project gets correct
findings. What's left needs credentials:

1. `npm login` (once, on any machine).
2. Claim the names — they were verified free on 2026-08-24, so this is also the check
   that they still are:
   ```bash
   npm access list packages 2>/dev/null | grep dscheck   # expect nothing yet
   pnpm -r --filter "./packages/*" publish --dry-run      # last look at what ships
   ```
3. On npmjs.com, for each package: **Settings → Trusted publisher →** GitHub Actions,
   repo `oddurs/dscheck`, workflow `release.yml`. (This is what makes step 5 credential-free.)
4. Arm the workflow: `gh variable set RELEASES_ENABLED -b true`
5. Merge the "Version Packages" pull request. It publishes with provenance.
6. Add the release row to `RELEASES.md`, verify the provenance badge on npm, and run
   `node scripts/install-smoke.mjs` once more against the *published* versions.

## Going public (K2)

1. `gh repo edit --visibility public --accept-visibility-change-consequences`
2. Turn on what only works in public: `publish_results: true` in `scorecard.yml`, and run
   the `docs-deploy` workflow (`gh workflow run docs-deploy.yml`) to put the docs on Pages.
3. Point the domain at Pages if `dscheck.dev` is registered; otherwise change the
   `site` in `docs-site/astro.config.mjs` to the Pages URL first.
4. Seed good-first-issues from the labels already created (`good first issue`, `docs`,
   `surface`), and pin a roadmap discussion.
5. Start the stranger tests (K3): three outsiders, README only, audit their first ten
   findings. Log each in `fixtures/drills/`.

Repo metadata (description, topics, issues, discussions, labels, CODEOWNERS, security
policy) is already set — it doesn't depend on visibility.

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
