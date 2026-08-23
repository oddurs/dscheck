---
title: lint-staged / pre-commit
description: Catch off-system values at commit time.
---

dscheck rules are ordinary eslint/stylelint rules, so if those already run in
`lint-staged`, you're done. To run the CLI directly on staged files:

```json
// package.json
{
  "lint-staged": {
    "*.{css,scss,tsx,jsx}": "dscheck check"
  }
}
```

For the Python `pre-commit` framework:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: dscheck
        name: dscheck
        entry: npx dscheck check
        language: system
        files: \.(css|scss|tsx|jsx)$
```
