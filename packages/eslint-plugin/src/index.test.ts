import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import plugin from '../dist/index.js';

const dir = mkdtempSync(join(tmpdir(), 'dscheck-el-'));
writeFileSync(join(dir, 'package.json'), '{}');
writeFileSync(join(dir, 'dscheck.config.json'), JSON.stringify({ tokens: ['tokens.css'] }));
writeFileSync(
  join(dir, 'tokens.css'),
  '@theme { --color-primary: #1d4ed8; --spacing-3: 12px; --radius-md: 6px; }',
);

const linter = new Linter({ cwd: dir });
function lint(code: string) {
  return linter.verify(
    code,
    {
      files: ['**/*.tsx'],
      plugins: { dscheck: plugin as never },
      languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
      rules: {
        'dscheck/no-raw-color': 'error',
        'dscheck/no-raw-length': 'error',
        'dscheck/no-unknown-token': 'error',
      },
    },
    'component.tsx',
  );
}

describe('@dscheck/eslint-plugin', () => {
  it('flags raw colors and numeric px lengths in style objects', () => {
    const messages = lint('const a = <div style={{ color: "#1d4ed8", padding: 14 }} />;');
    expect(messages.map((m) => m.ruleId).sort()).toEqual([
      'dscheck/no-raw-color',
      'dscheck/no-raw-length',
    ]);
    expect(messages[0]?.message).toContain('var(--color-primary)');
    expect(messages.find((m) => m.ruleId === 'dscheck/no-raw-length')?.message).toContain(
      'var(--spacing-3)',
    );
  });

  it('flags fabricated tokens in style values', () => {
    const messages = lint('const a = <div style={{ color: "var(--color-primry)" }} />;');
    expect(messages[0]?.ruleId).toBe('dscheck/no-unknown-token');
    expect(messages[0]?.message).toContain('did you mean --color-primary?');
  });

  it('flags arbitrary Tailwind values with mapped roots', () => {
    const messages = lint(
      'const a = <div className="p-[13px] bg-[#1d4ed8] focus:rounded-[7px]" />;',
    );
    expect(messages.map((m) => m.ruleId).sort()).toEqual([
      'dscheck/no-raw-color',
      'dscheck/no-raw-length',
      'dscheck/no-raw-length',
    ]);
  });

  it('stays silent for on-system code, unitless numbers, and dynamic classes', () => {
    const messages = lint(`
      const a = <div
        style={{ color: 'var(--color-primary)', lineHeight: 1.5, padding: 0 }}
        className={clsx('p-4', cond && 'bg-primary')}
      />;`);
    expect(messages).toHaveLength(0);
  });
});

describe('referenced style objects', () => {
  it('checks const style maps referenced from style attributes', () => {
    const messages = lint(`
      const styles = { card: { background: '#1d4ed8', padding: '14px' }, safe: { color: 'var(--color-primary)' } };
      const a = <div style={styles.card} />;`);
    expect(messages.map((m) => m.ruleId).sort()).toEqual([
      'dscheck/no-raw-color',
      'dscheck/no-raw-length',
    ]);
  });

  it('ignores object variables never used as styles', () => {
    const messages = lint(`
      const chartConfig = { series: { color: '#1d4ed8' } };
      const a = <div style={{ padding: 'var(--spacing-3)' }} data-config={chartConfig} />;`);
    expect(messages).toHaveLength(0);
  });
});

describe('constant indirection', () => {
  it('resolves palette members and const literals used in styles', () => {
    const messages = lint(`
      const BRAND = '#1d4ed8';
      const palette = { cedar: '#1d4ed8' };
      const a = <div style={{ color: palette.cedar, borderColor: BRAND }} />;`);
    expect(messages).toHaveLength(2);
    expect(messages.every((m) => m.ruleId === 'dscheck/no-raw-color')).toBe(true);
  });
});

describe('class-form suggestions', () => {
  it('suggests the on-theme utility for exact arbitrary values', () => {
    const messages = lint('const a = <div className="p-[12px] rounded-[6px]" />;');
    expect(
      messages.find((m) => m.message.includes('p-[12px]') || m.message.includes('12px'))?.message,
    ).toContain('class: p-3');
    expect(messages.find((m) => m.message.includes('6px'))?.message).toContain('class: rounded-md');
  });
});
