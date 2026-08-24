import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lintFiles } from './run.js';

/** T6: <style> blocks in Vue SFCs, Svelte, Astro, and HTML. */
const dir = mkdtempSync(join(tmpdir(), 'dscheck-markup-'));
writeFileSync(join(dir, 'package.json'), '{}');
writeFileSync(join(dir, 'dscheck.config.json'), '{"tokens":["tokens.css"]}');
writeFileSync(join(dir, 'tokens.css'), '@theme { --color-primary: #1d4ed8; --spacing-3: 12px; }');

async function lint(name: string, source: string) {
  const file = join(dir, name);
  writeFileSync(file, source);
  return lintFiles([file]);
}

describe('markup style blocks', () => {
  it('checks a Vue SFC <style> block with accurate positions', async () => {
    const findings = await lint(
      'Card.vue',
      '<template><div /></template>\n<style scoped>\n.card { color: #1d4ed8; }\n</style>\n',
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(3);
    expect(findings[0]?.message).toContain('var(--color-primary)');
  });

  it('checks Svelte and Astro too', async () => {
    const svelte = await lint('C.svelte', '<div />\n<style>\n.c { padding: 14px; }\n</style>\n');
    expect(svelte[0]?.rule).toBe('dscheck/no-raw-length');
    const astro = await lint('C.astro', '<div />\n<style>\n.c { color: #1d4ed8; }\n</style>\n');
    expect(astro[0]?.rule).toBe('dscheck/no-raw-color');
  });

  it('checks inline style attributes too — var() resolves there', async () => {
    const findings = await lint(
      'Inline.vue',
      '<template><div style="color: #1d4ed8" /></template>\n<style>.a { color: var(--color-primary); }</style>\n',
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(1);
    expect(findings[0]?.message).toContain('var(--color-primary)');
  });

  it('says nothing about markup that has no styles', async () => {
    expect(await lint('Plain.vue', '<template><div class="a" /></template>\n')).toEqual([]);
  });
});
