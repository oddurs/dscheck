---
title: reviewdog
description: Inline PR review comments from dscheck findings.
---

reviewdog accepts SARIF directly:

```yaml
- run: npx dscheck check src --format sarif > dscheck.sarif || true
- uses: reviewdog/action-setup@v1
- run: reviewdog -f=sarif -name=dscheck -reporter=github-pr-review < dscheck.sarif
  env:
    REVIEWDOG_GITHUB_API_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
