# stylelint-dscheck

Stylelint rules that enforce **your** design system in CSS and SCSS.

```js
// stylelint.config.js
export default {
  plugins: ['stylelint-dscheck'],
  rules: {
    'dscheck/no-raw-color': true,
    'dscheck/no-unknown-token': true,
    'dscheck/no-raw-length': [true, { severity: 'warning' }],
  },
};
```

Reads your Tailwind `@theme`, DTCG JSON, or `:root` custom properties and flags values
that aren't from them, naming the nearest token. `--fix` rewrites only provably-identical
matches — `14px` is never rounded to `12px`.

Full documentation: **https://dscheck.dev** · MIT licensed.

Changelog: https://dscheck.dev/reference/changelog/
