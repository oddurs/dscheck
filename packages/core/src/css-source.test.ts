import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCssTokens } from './css-source.js';

function fixture(css: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'dscheck-'));
  const file = join(dir, 'tokens.css');
  writeFileSync(file, css);
  return file;
}

describe('loadCssTokens', () => {
  it('collects @theme and :root custom properties', () => {
    const file = fixture(`
      @theme { --color-primary: #1d4ed8; --spacing-3: 0.75rem; }
      :root { --brand-hue: 240; }
    `);
    const index = loadCssTokens([file]);
    expect(index.tokens.get('--color-primary')?.category).toBe('color');
    expect(index.tokens.get('--spacing-3')?.category).toBe('length');
    expect(index.tokens.size).toBe(3);
  });

  it('resolves @theme inline var() aliases against :root values', () => {
    const file = fixture(`
      @theme inline { --color-primary: var(--primary); }
      :root { --primary: oklch(0.55 0.2 260); }
    `);
    const index = loadCssTokens([file]);
    const token = index.tokens.get('--color-primary');
    expect(token?.value).toBe('oklch(0.55 0.2 260)');
    expect(token?.aliasOf).toBe('--primary');
    expect(token?.category).toBe('color');
    expect(token?.unresolved).toBeUndefined();
  });

  it('follows multi-step chains and uses fallbacks for unknown vars', () => {
    const file = fixture(`
      :root {
        --a: var(--b);
        --b: var(--c);
        --c: 4px;
        --with-fallback: var(--missing, 8px);
        --dangling: var(--missing);
      }
    `);
    const index = loadCssTokens([file]);
    expect(index.tokens.get('--a')?.value).toBe('4px');
    expect(index.tokens.get('--with-fallback')?.value).toBe('8px');
    expect(index.tokens.get('--dangling')?.unresolved).toBe(true);
  });

  it('survives alias cycles', () => {
    const file = fixture(':root { --x: var(--y); --y: var(--x); }');
    const index = loadCssTokens([file]);
    expect(index.tokens.get('--x')?.unresolved).toBe(true);
  });

  it('classifies Tailwind namespaces including line-height suffixes', () => {
    const file = fixture(`
      @theme {
        --text-sm: 0.875rem;
        --text-sm--line-height: 1.25rem;
        --font-weight-bold: 700;
        --font-display: 'Inter', sans-serif;
        --radius-md: 6px;
        --shadow-md: 0 4px 6px rgb(0 0 0 / 0.1);
        --ease-out: cubic-bezier(0, 0, 0.2, 1);
      }
    `);
    const index = loadCssTokens([file]);
    const category = (name: string) => index.tokens.get(name)?.category;
    expect(category('--text-sm')).toBe('font-size');
    expect(category('--text-sm--line-height')).toBe('line-height');
    expect(category('--font-weight-bold')).toBe('font-weight');
    expect(category('--font-display')).toBe('font-family');
    expect(category('--radius-md')).toBe('radius');
    expect(category('--shadow-md')).toBe('shadow');
    expect(category('--ease-out')).toBe('easing');
  });

  it('ignores component-scoped custom properties', () => {
    const file = fixture('.button { --button-gap: 4px; } :root { --real: 1px; }');
    const index = loadCssTokens([file]);
    expect(index.tokens.has('--button-gap')).toBe(false);
    expect(index.tokens.has('--real')).toBe(true);
  });
});

describe('bare namespace names', () => {
  it('classifies --shadow without a suffix as shadow', () => {
    const file = fixture(':root { --shadow: 0 1px 2px rgb(0 0 0 / 0.2); }');
    expect(loadCssTokens([file]).tokens.get('--shadow')?.category).toBe('shadow');
  });
});

describe('tailwind default theme', () => {
  it('merges defaults when the source imports tailwindcss, repo tokens win', () => {
    const file = fixture(`
      @import 'tailwindcss';
      @theme { --color-red-500: #b91c1c; }
    `);
    const index = loadCssTokens([file]);
    expect(index.tokens.get('--color-gray-800')).toBeDefined(); // from defaults
    expect(index.tokens.get('--color-red-500')?.value).toBe('#b91c1c'); // repo override
    expect(index.tokens.get('--spacing')?.value).toBe('0.25rem');
  });

  it('does not merge defaults without the import', () => {
    const file = fixture('@theme { --color-primary: #1d4ed8; }');
    expect(loadCssTokens([file]).tokens.has('--color-gray-800')).toBe(false);
  });
});

describe('mode scopes (A1)', () => {
  it('recognises .dark and [data-theme] values as the same token', () => {
    const file = fixture(`
      :root { --background: oklch(0.97 0 0); }
      .dark { --background: oklch(0.15 0 0); }
      [data-theme='sepia'] { --background: oklch(0.9 0.03 80); }
    `);
    const index = loadCssTokens([file]);
    const token = index.tokens.get('--background');
    expect(token?.value).toBe('oklch(0.97 0 0)');
    expect(token?.modeValues).toHaveLength(2);
  });

  it('knows tokens defined only in a mode scope', () => {
    const file = fixture('.dark { --glow: oklch(0.8 0.1 200); }');
    expect(loadCssTokens([file]).tokens.has('--glow')).toBe(true);
  });

  it('media-wrapped :root counts; mixed component rules do not', () => {
    const file = fixture(`
      :root { --a: 1px; }
      @media (prefers-color-scheme: dark) { :root { --a: 2px; } }
      .button { --button-gap: 4px; padding: var(--a); }
    `);
    const index = loadCssTokens([file]);
    expect(index.tokens.get('--a')?.modeValues).toEqual(['2px']);
    expect(index.tokens.has('--button-gap')).toBe(false);
  });
});

describe('diagnostics (A6)', () => {
  it('reports conflicts, unresolved chains, and dangling aliases', () => {
    const file = fixture(`
      :root { --brand: #111; --brand: #222; --chain: var(--missing); --alias: var(--gone); }
    `);
    const d = loadCssTokens([file]).diagnostics;
    expect(d?.conflicts[0]?.name).toBe('--brand');
    expect(d?.unresolved).toContain('--chain');
    expect(d?.danglingAliases).toContain('--alias');
  });

  it('an alias and its target are not a conflict', () => {
    const file = fixture(`
      @theme inline { --color-a: var(--a); }
      :root { --a: #123456; }
    `);
    expect(loadCssTokens([file]).diagnostics?.conflicts).toHaveLength(0);
  });
});
