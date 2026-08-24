// Q2: every docs page is also served as plain markdown at <route>.md —
// dscheck's docs consumable by the agents it guards.
import { cpSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'docs-site/src/content/docs');
const dist = join(root, 'docs-site/dist');
let count = 0;

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(md|mdx)$/.test(entry.name)) {
      const route = relative(src, full).replace(/\.(md|mdx)$/, '').replace(/(^|\/)index$/, '$1index');
      const out = join(dist, `${route}.md`);
      mkdirSync(dirname(out), { recursive: true });
      cpSync(full, out);
      count++;
    }
  }
}
walk(src);
console.log(`docs-postbuild: ${count} pages mirrored as .md`);
