import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findConfig, loadIndex } from './config.js';
import { loadDtcgTokens } from './dtcg-source.js';
import { loadTsTokens } from './ts-source.js';

function file(name: string, content: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'dscheck-dtcg-'));
  const path = join(dir, name);
  writeFileSync(path, content);
  return path;
}

describe('loadDtcgTokens (B1)', () => {
  it('parses tokens with inherited $type, aliases, and composites', () => {
    const path = file(
      'tokens.json',
      JSON.stringify({
        color: {
          $type: 'color',
          primary: { $value: 'oklch(0.55 0.2 260)' },
          accent: { $value: '{color.primary}' },
          broken: { $value: '{color.missing}' },
        },
        spacing: { $type: 'dimension', '3': { $value: { value: 12, unit: 'px' } } },
        radius: { $type: 'dimension', md: { $value: '6px' } },
        font: { sans: { $type: 'fontFamily', $value: ['Inter', 'sans-serif'] } },
        shadow: {
          md: {
            $type: 'shadow',
            $value: { offsetX: '0px', offsetY: '4px', blur: '6px', color: 'rgb(0 0 0 / 0.1)' },
          },
        },
      }),
    );
    const tokens = new Map(loadDtcgTokens([path]).map((t) => [t.name, t]));
    expect(tokens.get('--color-primary')?.category).toBe('color');
    expect(tokens.get('--color-accent')?.value).toBe('oklch(0.55 0.2 260)');
    expect(tokens.get('--color-accent')?.aliasOf).toBe('--color-primary');
    expect(tokens.get('--color-broken')?.unresolved).toBe(true);
    expect(tokens.get('--spacing-3')?.value).toBe('12px');
    expect(tokens.get('--radius-md')?.category).toBe('radius');
    expect(tokens.get('--font-sans')?.value).toBe('Inter, sans-serif');
    expect(tokens.get('--shadow-md')?.value).toContain('0px 4px 6px');
  });

  it('accepts the Tokens Studio legacy dialect (B5)', () => {
    const path = file(
      'legacy.json',
      JSON.stringify({
        colors: { brand: { value: '#1d4ed8', type: 'color' } },
      }),
    );
    const [token] = loadDtcgTokens([path]);
    expect(token?.name).toBe('--colors-brand');
    expect(token?.category).toBe('color');
  });

  it('reads roles from $extensions.dscheck (B3)', () => {
    const path = file(
      'roles.json',
      JSON.stringify({
        color: {
          $type: 'color',
          surface: { $value: '#fff', $extensions: { dscheck: { roles: ['bg'] } } },
        },
      }),
    );
    expect(loadDtcgTokens([path])[0]?.roles).toEqual(['bg']);
  });
});

describe('loadTsTokens (B4)', () => {
  it('extracts a typed const token object', () => {
    const path = file(
      'theme.ts',
      `
      export const tokens = {
        color: { primary: '#1d4ed8' },
        spacing: { 3: '12px' },
      } as const;
    `,
    );
    const names = loadTsTokens([path]).map((t) => `${t.name}=${t.value}`);
    expect(names).toEqual(['--color-primary=#1d4ed8', '--spacing-3=12px']);
  });
});

describe('multi-source merge (B2)', () => {
  it('merges light/dark DTCG files into mode values, css + json combine', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dscheck-merge-'));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), '{}');
    writeFileSync(
      join(dir, 'dscheck.config.json'),
      '{"tokens":["light.json","dark.json","extra.css"]}',
    );
    writeFileSync(
      join(dir, 'light.json'),
      JSON.stringify({ color: { $type: 'color', surface: { $value: '#ffffff' } } }),
    );
    writeFileSync(
      join(dir, 'dark.json'),
      JSON.stringify({ color: { $type: 'color', surface: { $value: '#111113' } } }),
    );
    writeFileSync(join(dir, 'extra.css'), ':root { --spacing-3: 12px; }');
    const config = findConfig(dir);
    if (!config) throw new Error('no config');
    const index = loadIndex(config);
    const surface = index.tokens.get('--color-surface');
    expect(surface?.modeValues).toEqual(['#111113']);
    expect(index.tokens.has('--spacing-3')).toBe(true);
  });
});
