import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import stylelint from 'stylelint';
import { describe, expect, it } from 'vitest';

const dir = mkdtempSync(join(tmpdir(), 'offsystem-sl-'));
writeFileSync(join(dir, 'package.json'), '{}');
writeFileSync(join(dir, 'offsystem.config.json'), JSON.stringify({ tokens: ['tokens.css'] }));
writeFileSync(join(dir, 'tokens.css'), '@theme { --color-primary: #1d4ed8; --spacing-3: 12px; }');

async function lint(css: string) {
  const file = join(dir, 'component.css');
  writeFileSync(file, css);
  const result = await stylelint.lint({
    files: file,
    config: {
      plugins: [join(import.meta.dirname, '..', 'dist', 'index.js')],
      rules: {
        'offsystem/no-raw-color': true,
        'offsystem/no-raw-length': true,
        'offsystem/no-unknown-token': true,
      },
    },
  });
  return result.results[0]?.warnings ?? [];
}

describe('@offsystem/stylelint-plugin', () => {
  it('reports raw colors with the nearest token', async () => {
    const warnings = await lint('.a { color: #1d4ed8; }');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.rule).toBe('offsystem/no-raw-color');
    expect(warnings[0]?.text).toContain('var(--color-primary)');
  });

  it('reports raw lengths and unknown tokens independently', async () => {
    const warnings = await lint('.a { padding: 14px; background: var(--color-primry); }');
    const rules = warnings.map((w) => w.rule).sort();
    expect(rules).toEqual(['offsystem/no-raw-length', 'offsystem/no-unknown-token']);
    expect(warnings.find((w) => w.rule === 'offsystem/no-unknown-token')?.text).toContain(
      'did you mean --color-primary?',
    );
  });

  it('stays silent for on-system css and local vars', async () => {
    const warnings = await lint(
      '.a { --local: 4px; color: var(--color-primary); gap: var(--local); padding: var(--spacing-3); }',
    );
    expect(warnings).toHaveLength(0);
  });
});
