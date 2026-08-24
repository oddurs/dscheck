# dscheck

**The linter that knows your design system.** Reads the token source you already have —
Tailwind v4 `@theme`, DTCG JSON, or `:root` custom properties — and flags every
off-system value in your code, with the nearest on-system token attached.

```bash
npm i -D dscheck-cli    # the command it installs is `dscheck`
npx dscheck-cli check src
```

```text
✖ 48:13  Raw color #2a2520 — use var(--color-cedar-700) (ΔEOK 0.040)    dscheck/no-raw-color
⚠ 19:16  Raw length 14px in padding — use var(--spacing-3) (12px, Δ2px)  dscheck/no-raw-length
✖ 12:9   Unknown token --color-primry — did you mean --color-primary?    dscheck/no-unknown-token
```

- `dscheck check` · `fix` · `baseline` · `report` · `tokens` · `roles --suggest`
- `--format pretty|json|agent|sarif` — `agent` is NDJSON built for coding-agent loops
- Prefer the editor/CI path? Mount [`eslint-plugin-dscheck`](https://www.npmjs.com/package/eslint-plugin-dscheck)
  and [`stylelint-dscheck`](https://www.npmjs.com/package/stylelint-dscheck)
  in the linters you already run.

Full documentation: **https://oddurs.github.io/dscheck** · MIT licensed.

Changelog: https://oddurs.github.io/dscheck/reference/changelog/
