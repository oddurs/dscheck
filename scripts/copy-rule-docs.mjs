// `dscheck explain` reads the same rule pages the website serves, so the two
// cannot drift. They ship inside the CLI package so explain works offline.
import { cpSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, 'docs-site/src/content/docs/rules');
const to = join(root, 'packages/cli/dist/rules');
mkdirSync(to, { recursive: true });
let n = 0;
for (const file of readdirSync(from).filter((f) => f.endsWith('.md'))) {
  cpSync(join(from, file), join(to, file));
  n++;
}
console.log(`rule docs: ${n} pages bundled for \`dscheck explain\``);
