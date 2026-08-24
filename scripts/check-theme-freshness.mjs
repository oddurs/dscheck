// L5: the vendored Tailwind default theme must match the pinned tailwindcss
// package — Renovate bumps tailwind, this fails, the regen script fixes it.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { loadCssTokens, tailwindDefaultTheme } from '../packages/core/dist/index.js';

const require = createRequire(join(process.cwd(), 'packages/tw/package.json'));
const twDir = dirname(require.resolve('tailwindcss/package.json'));
const { version } = JSON.parse(readFileSync(join(twDir, 'package.json'), 'utf8'));
const fresh = Object.fromEntries(
  [...loadCssTokens([join(twDir, 'theme.css')]).tokens.values()].map((t) => [t.name, t.value]),
);
const vendored = tailwindDefaultTheme;
const missing = Object.keys(fresh).filter((k) => !(k in vendored));
const changed = Object.keys(fresh).filter((k) => k in vendored && vendored[k] !== fresh[k]);
const removed = Object.keys(vendored).filter((k) => !(k in fresh));
if (missing.length || changed.length || removed.length) {
  console.error(
    `✖ tailwind-theme.ts is stale vs tailwindcss@${version}: ` +
      `${missing.length} missing, ${changed.length} changed, ${removed.length} removed.\n` +
      `  Regenerate: pnpm build && node scripts/update-tailwind-theme.mjs ${twDir}`,
  );
  process.exit(1);
}
console.log(
  `✔ tailwind-theme.ts fresh vs tailwindcss@${version} (${Object.keys(fresh).length} entries)`,
);
