## What and why

<!-- One or two sentences. Link the issue if there is one. -->

## Checklist

- [ ] `pnpm test` and `pnpm typecheck` pass
- [ ] A changeset if this changes behaviour (`pnpm changeset` — see the [versioning policy](docs-site/src/content/docs/reference/versioning.md))
- [ ] If a rule changed: `node scripts/corpus.mjs` — counts unchanged, **or** re-pinned with the reason in the commit message ([re-pin protocol](RUNBOOK.md))
- [ ] If this fixes a false positive: a case added under `fixtures/fp/`
- [ ] If docs changed: `node scripts/docs-snippets.mjs` and `node scripts/prose-lint.mjs` pass
