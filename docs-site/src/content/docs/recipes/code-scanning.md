---
title: GitHub code scanning
description: Findings as PR annotations, new-only, via SARIF.
---

```yaml
# .github/workflows/dscheck.yml
name: dscheck
on: [pull_request]
permissions:
  security-events: write
  contents: read
jobs:
  dscheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: oddurs/dscheck/action@v1
        with:
          paths: src
          comment: true
```

The action runs the CLI, writes a findings table to the job summary, uploads SARIF, and
fails on error-severity findings (`fail-on: any | never` to change that). Prefer wiring it
by hand? That works too:

```yaml
      - run: npx dscheck-cli check src --format sarif > dscheck.sarif || true
      - uses: github/codeql-action/upload-sarif@v3
        with: { sarif_file: dscheck.sarif }
```

Findings appear in the PR's **Security → Code scanning** annotations. Because dscheck
emits stable `partialFingerprints`, GitHub shows only findings whose lines are new in the
PR — pre-existing debt stays quiet without any baseline file.
