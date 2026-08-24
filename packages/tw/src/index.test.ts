import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { engineFor, resetEngines } from '../dist/index.js';

const require = createRequire(import.meta.url);

function projectWithTailwind(): string {
  const dir = mkdtempSync(join(tmpdir(), 'dscheck-tw-'));
  // Link the workspace's tailwindcss into the fixture so resolution succeeds.
  const twPath = dirname(require.resolve('tailwindcss/package.json'));
  mkdirSync(join(dir, 'node_modules'), { recursive: true });
  symlinkSync(twPath, join(dir, 'node_modules', 'tailwindcss'));
  writeFileSync(join(dir, 'package.json'), '{}');
  writeFileSync(
    join(dir, 'app.css'),
    `@import 'tailwindcss';\n@theme { --color-brand: #1d4ed8; --spacing-huge: 100px; }`,
  );
  return dir;
}

describe('@dscheck/tw engine', () => {
  it('parses named, arbitrary, variant-wrapped, and unknown classes', () => {
    resetEngines();
    const dir = projectWithTailwind();
    const parse = engineFor(dir, [join(dir, 'app.css')]);
    expect(parse).toBeDefined();
    const [named, arb, variant, unknown, custom] =
      parse?.(['p-3', 'bg-[#3b82f6]', 'md:hover:p-[13px]', 'bg-nonsense', 'bg-brand']) ?? [];
    expect(named).toMatchObject({ root: 'p', kind: 'named', inert: false });
    expect(arb).toMatchObject({ root: 'bg', kind: 'arbitrary', value: '#3b82f6', inert: false });
    expect(variant).toMatchObject({ root: 'p', kind: 'arbitrary', value: '13px', inert: false });
    expect(unknown?.inert).toBe(true);
    expect(custom).toMatchObject({ kind: 'named', inert: false }); // theme-defined utility works
  });

  it('returns undefined for a project without tailwind', () => {
    resetEngines();
    const dir = mkdtempSync(join(tmpdir(), 'dscheck-notw-'));
    writeFileSync(join(dir, 'package.json'), '{}');
    expect(engineFor(dir, [])).toBeUndefined();
  });
});
