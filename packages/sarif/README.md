# dscheck-sarif

SARIF 2.1.0 output for [dscheck](https://dscheck.dev), with stable `partialFingerprints`
so GitHub code scanning shows only newly-introduced findings on pull requests.

Also ships **a standalone SARIF formatter for stylelint** — usable with any stylelint
rules, not just dscheck's:

```bash
stylelint <files> --custom-formatter dscheck-sarif/stylelint-formatter
```

MIT licensed.

Changelog: https://dscheck.dev/reference/changelog/
