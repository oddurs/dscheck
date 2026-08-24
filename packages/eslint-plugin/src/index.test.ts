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

describe('class factories & dynamic class expressions (A2/A3)', () => {
  it('scans clsx/cva/cn arguments and template statics', () => {
    const messages = lint(`
      const button = cva('rounded-[7px] font-bold', { variants: { pad: { big: 'p-[13px]' } } });
      const a = <div className={clsx('bg-[#1d4ed8]', cond && 'p-[13px]', \`m-[13px] \${x}\`)} />;`);
    const texts = messages.map((m) => m.message).join('\n');
    expect(texts).toContain('7px');
    expect(texts).toContain('#1d4ed8');
    expect(messages.filter((m) => m.message.includes('13px'))).toHaveLength(3);
  });

  it('does not double-report className={clsx(…)} strings', () => {
    const messages = lint(`const a = <div className={clsx('p-[13px]')} />;`);
    expect(messages).toHaveLength(1);
  });

  it('still skips genuinely dynamic values', () => {
    const messages = lint('const a = <div className={clsx(dynamic, `${x}-[13px]`)} />;');
    expect(messages).toHaveLength(0);
  });
});

describe('tailwind engine path (D2–D4)', () => {
  const twDir = mkdtempSync(join(tmpdir(), 'dscheck-eltw-'));
  writeFileSync(join(twDir, 'package.json'), '{}');
  const { symlinkSync, mkdirSync } = require('node:fs') as typeof import('node:fs');
  const { createRequire } = require('node:module') as typeof import('node:module');
  const twRequire = createRequire(join(import.meta.dirname, '..', '..', 'tw', 'package.json'));
  const tailwindDir = join(twRequire.resolve('tailwindcss/package.json'), '..');
  mkdirSync(join(twDir, 'node_modules'), { recursive: true });
  symlinkSync(tailwindDir, join(twDir, 'node_modules', 'tailwindcss'));
  writeFileSync(join(twDir, 'dscheck.config.json'), JSON.stringify({ tokens: ['app.css'] }));
  writeFileSync(
    join(twDir, 'app.css'),
    `@import 'tailwindcss';\n@theme { --color-brand: #1d4ed8; --spacing-3: 12px; }`,
  );
  const twLinter = new Linter({ cwd: twDir });
  const twLint = (code: string, fix = false) => {
    const cfg = {
      files: ['**/*.tsx'],
      plugins: { dscheck: plugin as never },
      languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
      rules: {
        'dscheck/no-raw-color': 'error',
        'dscheck/no-raw-length': 'error',
        'dscheck/no-unknown-class': 'error',
      },
    } as const;
    return fix
      ? twLinter.verifyAndFix(code, cfg as never, 'component.tsx')
      : { messages: twLinter.verify(code, cfg as never, 'component.tsx'), output: code };
  };

  it('parses variant-wrapped arbitrary values via the engine', () => {
    const { messages } = twLint('const a = <div className="md:hover:p-[13px]" />;');
    expect(messages[0]?.message).toContain('13px');
  });

  it('flags fabricated utilities with a did-you-mean', () => {
    const { messages } = twLint('const a = <div className="bg-brnad" />;');
    expect(messages[0]?.ruleId).toBe('dscheck/no-unknown-class');
    expect(messages[0]?.message).toContain('did you mean bg-brand?');
  });

  it('autofixes exact arbitrary values to the canonical utility', () => {
    const { output } = twLint('const a = <div className="md:p-[12px] bg-[#eee]" />;', true);
    expect(output).toContain('md:p-3');
    expect(output).toContain('bg-[#eee]'); // non-exact stays
  });
});

describe('css-in-js (E1–E3)', () => {
  it('checks styled-components templates with accurate positions and fixes', () => {
    const code = `const Button = styled.button\`
      color: #1d4ed8;
      padding: \${(p) => p.pad}px;
      gap: 14px;
      --local: 4px;
      margin: var(--local);
    \`;`;
    const messages = lint(code);
    const colorMsg = messages.find((m) => m.message.includes('#1d4ed8'));
    expect(colorMsg?.line).toBe(2);
    expect(colorMsg?.message).toContain('var(--color-primary)');
    // interpolated padding skipped; local var accepted
    expect(messages.some((m) => m.message.includes('p.pad'))).toBe(false);
    expect(messages.filter((m) => m.message.includes('14px'))).toHaveLength(1);
  });

  it('autofixes exact template values', () => {
    const linterFix = new Linter({ cwd: dir });
    const result = linterFix.verifyAndFix(
      'const A = styled.div`color: #1d4ed8; padding: 14px;`;',
      {
        files: ['**/*.tsx'],
        plugins: { dscheck: plugin as never },
        languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
        rules: { 'dscheck/no-raw-color': 'error', 'dscheck/no-raw-length': 'error' },
      },
      'component.tsx',
    );
    expect(result.output).toContain('color: var(--color-primary);');
    expect(result.output).toContain('padding: 14px;'); // Δ2px — never auto-rounded
  });

  it('checks emotion css`` tags, css() objects, and sx props with pseudo nesting', () => {
    const messages = lint(`
      const a = css\`background: #1d4ed8;\`;
      const b = css({ '&:hover': { color: '#1d4ed8' } });
      const c = <div sx={{ padding: '14px' }} />;`);
    expect(messages.filter((m) => m.message.includes('#1d4ed8'))).toHaveLength(2);
    expect(messages.some((m) => m.message.includes('14px'))).toBe(true);
  });
});
