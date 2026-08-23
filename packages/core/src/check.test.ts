import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkDeclaration, formatViolation } from './check.js';
import { loadCssTokens } from './css-source.js';

const dir = mkdtempSync(join(tmpdir(), 'offsystem-check-'));
const tokensFile = join(dir, 'tokens.css');
writeFileSync(
  tokensFile,
  `@theme {
    --color-primary: #1d4ed8;
    --color-surface: oklch(0.97 0.002 210);
    --spacing-3: 12px;
    --spacing-4: 16px;
    --radius-md: 6px;
    --text-sm: 14px;
  }`,
);
const index = loadCssTokens([tokensFile]);
const ctx = { index };

describe('no-raw-color', () => {
  it('flags an exact hex with an exact fixable match', () => {
    const [v] = checkDeclaration('color', '#1d4ed8', ctx);
    expect(v?.rule).toBe('no-raw-color');
    expect(v?.matches[0]?.token.name).toBe('--color-primary');
    expect(v?.matches[0]?.kind).toBe('exact');
  });
  it('flags near-miss colors as close, not exact', () => {
    const [v] = checkDeclaration('background', 'oklch(0.96 0.002 210)', ctx);
    expect(v?.matches[0]?.token.name).toBe('--color-surface');
    expect(v?.matches[0]?.kind).toBe('close');
  });
  it('flags named colors only in color properties', () => {
    expect(checkDeclaration('color', 'tomato', ctx)).toHaveLength(1);
    expect(checkDeclaration('font-family', 'tomato', ctx)).toHaveLength(0);
  });
  it('allows transparent/currentColor and var() usage', () => {
    expect(checkDeclaration('color', 'transparent', ctx)).toHaveLength(0);
    expect(checkDeclaration('color', 'var(--color-primary)', ctx)).toHaveLength(0);
  });
});

describe('no-raw-length', () => {
  it('flags raw padding with nearest steps', () => {
    const [v] = checkDeclaration('padding', '14px', ctx);
    expect(v?.rule).toBe('no-raw-length');
    expect(v?.matches.map((m) => m.token.name)).toEqual(['--spacing-3', '--spacing-4']);
    expect(v?.matches[0]?.kind).toBe('nearest');
  });
  it('marks exact scale hits as exact', () => {
    const [v] = checkDeclaration('gap', '1rem', ctx);
    expect(v?.matches[0]?.token.name).toBe('--spacing-4');
    expect(v?.matches[0]?.kind).toBe('exact');
  });
  it('uses the radius category for border-radius', () => {
    const [v] = checkDeclaration('border-radius', '8px', ctx);
    expect(v?.matches[0]?.token.name).toBe('--radius-md');
  });
  it('ignores unenforced properties and allowed values', () => {
    expect(checkDeclaration('width', '37px', ctx)).toHaveLength(0);
    expect(checkDeclaration('padding', '0', ctx)).toHaveLength(0);
  });
});

describe('no-unknown-token', () => {
  it('flags fabricated tokens with a typo suggestion', () => {
    const [v] = checkDeclaration('color', 'var(--color-primry)', ctx);
    expect(v?.rule).toBe('no-unknown-token');
    expect(v?.matches[0]?.token.name).toBe('--color-primary');
  });
  it('skips locally defined vars and token definitions', () => {
    const local = { index, localVars: new Set(['--button-gap']) };
    expect(checkDeclaration('gap', 'var(--button-gap)', local)).toHaveLength(0);
    expect(checkDeclaration('--my-token', '#123456', ctx)).toHaveLength(0);
  });
  it('does not double-report literals inside var() fallbacks', () => {
    const violations = checkDeclaration('color', 'var(--color-primary, #ff0000)', ctx);
    expect(violations).toHaveLength(0);
  });
});

describe('formatViolation', () => {
  it('names the token and the distance', () => {
    const [v] = checkDeclaration('padding', '14px', ctx);
    expect(formatViolation(v as never)).toBe(
      'Raw length 14px in padding — use var(--spacing-3) (12px, Δ2px)',
    );
  });
});

describe('alpha awareness', () => {
  it('does not treat a translucent color as an exact match for its opaque twin', () => {
    const [v] = checkDeclaration('background', 'rgba(29, 78, 216, 0.1)', ctx);
    expect(v?.matches[0]?.kind).not.toBe('exact');
  });
});

describe('math functions', () => {
  it('leaves clamp/calc literals alone but still validates vars inside', () => {
    expect(checkDeclaration('font-size', 'clamp(1rem, 2vw, 1.5rem)', ctx)).toHaveLength(0);
    expect(checkDeclaration('padding', 'calc(14px * 2)', ctx)).toHaveLength(0);
    const [v] = checkDeclaration('padding', 'calc(var(--spacing-3x) * 2)', ctx);
    expect(v?.rule).toBe('no-unknown-token');
  });
});
