import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkDeclaration, formatViolation } from './check.js';
import { findConfig, loadIndex } from './config.js';

const dir = mkdtempSync(join(tmpdir(), 'dscheck-roles-'));
writeFileSync(join(dir, 'package.json'), '{}');
writeFileSync(join(dir, 'dscheck.config.json'), '{"tokens":["tokens.css"],"roles":"roles.json"}');
writeFileSync(
  join(dir, 'tokens.css'),
  `@theme {
  --color-surface: oklch(0.97 0.002 260);
  --color-ink: oklch(0.2 0.02 260);
  --color-line: oklch(0.85 0.01 260);
}`,
);
writeFileSync(
  join(dir, 'roles.json'),
  JSON.stringify({
    '--color-surface': ['bg'],
    '--color-ink': ['fg'],
    '--color-line': ['border'],
  }),
);
const config = findConfig(dir);
if (!config) throw new Error('no config');
const ctx = { index: loadIndex(config) };

describe('token-role (C1)', () => {
  it('flags a surface token used as text color, suggesting a right-role token', () => {
    const [v] = checkDeclaration('color', 'var(--color-surface)', ctx);
    expect(v?.rule).toBe('token-role');
    expect(formatViolation(v as never)).toBe(
      '--color-surface is bg, not fg, in color — nearest right-role token: var(--color-ink)',
    );
  });

  it('accepts right-role and unroled usage', () => {
    expect(checkDeclaration('background', 'var(--color-surface)', ctx)).toHaveLength(0);
    expect(checkDeclaration('border-color', 'var(--color-line)', ctx)).toHaveLength(0);
  });
});

describe('role-aware suggestion ranking (C2)', () => {
  it('prefers right-role tokens for raw colors in role-typed properties', () => {
    // a mid gray: --color-line is perceptually closest, but color: wants fg
    const [v] = checkDeclaration('color', 'oklch(0.8 0.01 260)', ctx);
    expect(v?.rule).toBe('no-raw-color');
    expect(v?.matches[0]?.token.name).toBe('--color-ink');
  });
});
