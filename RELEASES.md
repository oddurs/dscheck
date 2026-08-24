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
| _0.1.0_ | pending npm publish | — | pre-release engineering: corpus ×5 audited 39/39 true; fix-at-scale 74 fixes / 0 damage |

Stranger tests: 0 / 3 (begins at go-public).
