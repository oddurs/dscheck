// S5: one changelog page for readers, assembled from the per-package files
// changesets maintains. Runs before the docs build.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES = [
  ['dscheck-cli', 'cli'],
  ['eslint-plugin-dscheck', 'eslint-plugin'],
  ['stylelint-dscheck', 'stylelint-plugin'],
  ['dscheck-core', 'core'],
  ['dscheck-sarif', 'sarif'],
  ['dscheck-tw', 'tw'],
];

/** Group entries by version across packages: readers think in releases. */
const releases = new Map();
for (const [name, dir] of PACKAGES) {
  const file = join(root, 'packages', dir, 'CHANGELOG.md');
  if (!existsSync(file)) continue;
  const text = readFileSync(file, 'utf8');
  for (const section of text.split(/^## /m).slice(1)) {
    const version = section.split('\n')[0].trim();
    const body = section.slice(version.length).trim();
    if (!releases.has(version)) releases.set(version, []);
    releases.get(version).push({ name, body });
  }
}

const lines = [
  '---',
  'title: Changelog',
  'description: What changed in each release, and whether it affects you.',
  '---',
  '',
  'Versioned per the [versioning policy](/reference/versioning/): more true findings is a',
  'minor; a changed output shape or default is a major; message wording is a patch.',
  '',
];
for (const [version, entries] of [...releases].sort((a, b) =>
  b[0].localeCompare(a[0], undefined, { numeric: true }),
)) {
  lines.push(`## ${version}`, '');
  const shared = entries[0]?.body;
  const identical = entries.every((e) => e.body === shared);
  if (identical && shared) {
    lines.push(
      shared,
      '',
      `<sub>Released: ${entries.map((e) => `\`${e.name}\``).join(' · ')}</sub>`,
      '',
    );
  } else {
    for (const entry of entries) lines.push(`### ${entry.name}`, '', entry.body, '');
  }
}
writeFileSync(
  join(root, 'docs-site/src/content/docs/reference/changelog.md'),
  `${lines.join('\n')}\n`,
);
console.log(`changelog: ${releases.size} release(s) rendered`);
