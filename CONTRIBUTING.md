# Contributing

The short version: **dscheck's promise is that it never lies and never damages.**
Contributions are welcome; contributions that protect that promise are the most welcome.

## Setup

```bash
pnpm install
pnpm build
pnpm test
```

Node ≥ 20.19, pnpm 11. `pnpm typecheck` and `pnpm lint` mirror CI.

## The one thing to read first

[`docs-site/src/content/docs/reference/architecture.md`](docs-site/src/content/docs/reference/architecture.md)
— where the resolver, matchers, checker, and thin host adapters live, and where a new
rule goes. The two invariants it names are not negotiable:

1. **Every violation carries the nearest token with a real distance.** That's what makes
   agent self-correction work.
2. **Every skip is deliberate and documented.** A skip that isn't in the
   [supported-surfaces contract](docs-site/src/content/docs/reference/supported-surfaces.md)
   is a bug, because silence must never look like approval.

## Adding a rule

Implement it in `packages/core/src/check.ts`, register the id in both adapters and their
presets, add fixture tests in core plus one integration test per adapter, and write the
rule's docs page (the prose gate checks that the page's stated default matches the code).

## Changing what gets reported

If your change moves corpus counts, that's fine — but it's a reviewed decision, never an
incidental one:

1. Sample the new findings and confirm every one is true. A false one is a false
   positive: stop, fix it, and add a case under `fixtures/fp/`.
2. Update `fixtures/corpus.json` and say why in the commit message.
3. Regenerate and classify the audit: `rm fixtures/audit.json && node scripts/audit.mjs`.

Full protocol in [RUNBOOK.md](RUNBOOK.md).

## False positives

They're the highest-priority bug class. Every confirmed one becomes a permanent fixture
in `fixtures/fp/` and an entry on the [scoreboard](RELEASES.md). Use the issue template —
it collects exactly what a fixture needs.

## Flaky tests

A test that fails without a code cause gets an issue **and** an `it.skip` linking it, in
the same PR — never a silent re-run. Quarantined tests are reviewed monthly; more than
three in quarantine blocks releases.

## Commits and releases

Conventional-ish commit subjects; a `pnpm changeset` for anything user-visible, with the
bump chosen per the [versioning policy](docs-site/src/content/docs/reference/versioning.md)
(more true findings = minor; changed output shape or defaults = major).
