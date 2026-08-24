# Release scoreboard

The 1.0 criteria, stated before any release and tracked here release by release:

> **dscheck tags 1.0 after three consecutive releases with zero confirmed false
> positives on [supported surfaces](docs-site/src/content/docs/reference/supported-surfaces.md),
> plus three passed stranger tests** (an outsider adopts via the README alone; their first
> ten findings are audited; all must be true).

A confirmed FP is one reproduced from a report and admitted into
[`fixtures/fp/`](fixtures/fp/). The count can't be argued down — the fixture is the record.

| release | date | confirmed FPs (supported surfaces) | notes |
|---|---|---|---|
| 0.1.0 | 2026-08-24 | 0 | first public release. corpus ×5 audited 39/39 true; fix-at-scale 74 fixes / 0 damage; verified by installing from the registry into a clean project |

**Published names** — the `dscheck` npm org was taken and the bare `dscheck` package name
is blocked by npm's similarity filter (`depcheck`, `es-check`), so the packages use the
conventional unscoped names. The installed **command is still `dscheck`**.

| package | what |
|---|---|
| [`dscheck-cli`](https://www.npmjs.com/package/dscheck-cli) | the CLI (installs the `dscheck` command) |
| [`eslint-plugin-dscheck`](https://www.npmjs.com/package/eslint-plugin-dscheck) | ESLint rules |
| [`stylelint-dscheck`](https://www.npmjs.com/package/stylelint-dscheck) | stylelint rules |
| [`dscheck-core`](https://www.npmjs.com/package/dscheck-core) | resolver + matchers |
| [`dscheck-sarif`](https://www.npmjs.com/package/dscheck-sarif) | SARIF output + stylelint formatter |
| [`dscheck-tw`](https://www.npmjs.com/package/dscheck-tw) | Tailwind engine bridge |

Stranger tests: 0 / 3 (begins at go-public).
