// Regenerates packages/core/src/tailwind-theme.ts from an installed tailwindcss package.
// Usage: node scripts/update-tailwind-theme.mjs node_modules/tailwindcss
import { readFileSync, writeFileSync } from 'node:fs';
import { loadCssTokens } from '../packages/core/dist/index.js';

const pkgDir = process.argv[2];
if (!pkgDir) throw new Error('pass the tailwindcss package directory');
const index = loadCssTokens([`${pkgDir}/theme.css`]);
const entries = Object.fromEntries([...index.tokens.values()].map((t) => [t.name, t.value]));
const { version } = JSON.parse(readFileSync(`${pkgDir}/package.json`, 'utf8'));
writeFileSync(
  'packages/core/src/tailwind-theme.ts',
  `// Generated from tailwindcss@${version} theme.css — do not edit by hand.
// Regenerate: node scripts/update-tailwind-theme.mjs <path-to-tailwindcss-pkg>
/** Tailwind v4 default theme: merged into the allowed set when a token source imports "tailwindcss". */
export const tailwindDefaultTheme: Record<string, string> = ${JSON.stringify(entries, null, 2)};
`,
);
console.log(
  `tailwind-theme.ts: ${Object.keys(entries).length} entries from tailwindcss@${version}`,
);
