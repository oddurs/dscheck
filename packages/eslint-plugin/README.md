# @dscheck/eslint-plugin

ESLint rules that enforce **your** design system — not just "use a variable".

```js
// eslint.config.js
import dscheck from '@dscheck/eslint-plugin';

export default [dscheck.configs.recommended];
```

Checks JSX inline styles, referenced style objects, Tailwind class strings (including
`clsx`/`cva` arguments), and CSS-in-JS tagged templates against the tokens your project
already defines. Every finding names the nearest on-system token with its distance;
exact matches autofix, near misses become editor suggestions.

Full documentation: **https://dscheck.dev** · MIT licensed.
