// P6: every fg/bg pairing the docs site uses, WCAG-checked and recorded.
// Also the manual dry-run for the future `dscheck contrast` command.
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadCssTokens } from '../packages/core/dist/index.js';

// culori belongs to @dscheck/core — resolve it from there, not from scripts/
const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { wcagContrast } = require('culori');

const index = loadCssTokens(['docs-site/src/styles/tokens.css']);
const value = (name, mode) => {
  const t = index.tokens.get(name);
  if (!t) throw new Error(`missing token ${name}`);
  return mode === 'dark' && t.modeValues?.[0] ? t.modeValues[0] : t.value;
};

/** The pairings the site actually renders, with their minimum requirement. */
const PAIRS = [
  ['--color-ink', '--color-surface', 7, 'body headings'],
  ['--color-ink-soft', '--color-surface', 4.5, 'body copy'],
  ['--color-ink-faint', '--color-surface', 3, 'markers, captions (large/quiet)'],
  ['--color-ink', '--color-surface-raised', 7, 'card titles'],
  ['--color-ink', '--color-surface-sunken', 4.5, 'inline code'],
  ['--color-primary', '--color-surface', 4.5, 'links'],
  ['--color-primary-strong', '--color-surface', 4.5, 'link hover'],
  ['--color-on-primary', '--color-primary', 4.5, 'primary button'],
  ['--color-primary-strong', '--color-primary-soft', 4.5, 'active nav item'],
  ['--color-ink', '--color-success-soft', 4.5, 'tip aside text'],
  ['--color-ink', '--color-warning-soft', 4.5, 'caution aside text'],
  ['--color-ink', '--color-danger-soft', 4.5, 'danger aside text'],
];

const lines = [
  '# Contrast audit — docs design system',
  '',
  `Generated ${new Date().toISOString().slice(0, 10)} by scripts/contrast-audit.mjs (WCAG 2 ratios via culori).`,
  '',
];
let failures = 0;
for (const mode of ['light', 'dark']) {
  lines.push(
    `## ${mode}`,
    '',
    '| pairing | use | ratio | needs | verdict |',
    '|---|---|---|---|---|',
  );
  for (const [fg, bg, min, use] of PAIRS) {
    const ratio = wcagContrast(value(fg, mode), value(bg, mode));
    const ok = ratio >= min;
    if (!ok) failures++;
    lines.push(`| ${fg} / ${bg} | ${use} | ${ratio.toFixed(2)} | ${min} | ${ok ? '✔' : '✖'} |`);
    console.log(
      `${ok ? '✔' : '✖'} [${mode}] ${fg} on ${bg}: ${ratio.toFixed(2)} (needs ${min}) — ${use}`,
    );
  }
  lines.push('');
}
writeFileSync('fixtures/docs-ui/contrast.md', `${lines.join('\n')}\n`);
process.exit(failures > 0 ? 1 : 0);
