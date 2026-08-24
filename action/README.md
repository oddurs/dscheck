# dscheck GitHub Action

```yaml
- uses: oddurs/dscheck/action@v1
  with:
    paths: src
```

Findings land in the job summary, in GitHub code scanning (SARIF, `security-events: write`),
and optionally as a sticky pull-request comment (`comment: true`). Control the gate with
`fail-on: error | any | never`.

Adopting on an existing codebase? Record a baseline first (`npx dscheck baseline src`,
commit `.dscheck-baseline.json`) — the action then fails only on new findings.

Full documentation: **https://dscheck.dev**
