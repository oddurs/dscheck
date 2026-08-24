import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Linter } from 'eslint';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import plugin from '../dist/index.js';

/** I4: whatever fix does, the output must reparse — no damaged files, ever. */
const dir = mkdtempSync(join(tmpdir(), 'dscheck-fixfuzz-'));
writeFileSync(join(dir, 'package.json'), '{}');
writeFileSync(join(dir, 'dscheck.config.json'), '{"tokens":["tokens.css"]}');
writeFileSync(join(dir, 'tokens.css'), '@theme { --color-primary: #1d4ed8; --spacing-3: 12px; }');
const linter = new Linter({ cwd: dir });
const cfg = {
  files: ['**/*.tsx'],
  plugins: { dscheck: plugin as never },
  languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
  rules: { 'dscheck/no-raw-color': 'error', 'dscheck/no-raw-length': 'error' },
} as const;

describe('fuzz: fix path never damages code (I4)', () => {
  it('verifyAndFix output always reparses', () => {
    const valueArb = fc.constantFrom(
      '#1d4ed8',
      '#ff0000',
      'rgb(0 0 0)',
      '13px',
      '12px',
      'var(--x)',
    );
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.constantFrom('color', 'padding', 'gap', 'background'), valueArb), {
          maxLength: 4,
        }),
        fc.constantFrom('p-[12px]', 'bg-[#1d4ed8]', 'p-4', 'x'),
        (entries, cls) => {
          const style = entries.map(([k, v]) => `${k}: '${v}'`).join(', ');
          const code = `const a = <div className="${cls}" style={{ ${style} }} />;`;
          const result = linter.verifyAndFix(code, cfg as never, 'f.tsx');
          const recheck = linter.verify(result.output, cfg as never, 'f.tsx');
          expect(recheck.filter((m) => m.fatal)).toEqual([]);
        },
      ),
      { numRuns: 300 },
    );
  });

  it('template fixes reparse too', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('#1d4ed8', '12px', '13px', 'red'),
        fc.constantFrom('color', 'padding', 'background'),
        (value, property) => {
          const code = 'const A = styled.div`' + property + ': ' + value + ';`;';
          const result = linter.verifyAndFix(code, cfg as never, 'f.tsx');
          const recheck = linter.verify(result.output, cfg as never, 'f.tsx');
          expect(recheck.filter((m) => m.fatal)).toEqual([]);
        },
      ),
      { numRuns: 200 },
    );
  });
});
