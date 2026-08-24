import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkDeclaration } from './check.js';
import { loadCssTokens } from './css-source.js';

/**
 * G1: every "deliberately skipped" row of the supported-surfaces page is
 * enforced here (core-level skips; adapter-level skips live in the adapter
 * suites). Changing any of these is a semver event, not a refactor.
 */
const dir = mkdtempSync(join(tmpdir(), 'dscheck-surfaces-'));
const tokensFile = join(dir, 'tokens.css');
writeFileSync(
  tokensFile,
  `@theme {
    --color-primary: #1d4ed8;
    --spacing-3: 12px;
    --text-sm: 14px;
    --shadow-md: 0 4px 6px rgb(0 0 0 / 0.1);
    --leading-normal: 1.5;
    --tracking-wide: 0.025em;
  }`,
);
const ctx = { index: loadCssTokens([tokensFile]) };

describe('deliberate skips (supported-surfaces contract)', () => {
  it('math-function literals', () => {
    expect(checkDeclaration('padding', 'calc(14px + 2px)', ctx)).toHaveLength(0);
    expect(checkDeclaration('font-size', 'clamp(13px, 2vw, 15px)', ctx)).toHaveLength(0);
  });

  it('width/height, letter-spacing, line-height, text-shadow', () => {
    expect(checkDeclaration('width', '37px', ctx)).toHaveLength(0);
    expect(checkDeclaration('height', '41px', ctx)).toHaveLength(0);
    expect(checkDeclaration('letter-spacing', '0.03em', ctx)).toHaveLength(0);
    expect(checkDeclaration('line-height', '1.4', ctx)).toHaveLength(0);
    expect(checkDeclaration('text-shadow', '0 1px 2px #000', ctx)).toHaveLength(1); // hex is still a color
    expect(
      checkDeclaration('text-shadow', '0 1px 2px var(--color-primary)', ctx).filter(
        (v) => v.rule === 'no-raw-shadow',
      ),
    ).toHaveLength(0);
  });

  it('named colors only where a color belongs', () => {
    // no font tokens in this system → font-family is not enforced at all,
    // and 'red' is never misread as a color outside color-bearing properties
    expect(checkDeclaration('font-family', 'red, serif', ctx)).toHaveLength(0);
    expect(checkDeclaration('grid-area', 'red', ctx)).toHaveLength(0);
    expect(checkDeclaration('color', 'red', ctx)).toHaveLength(1);
  });

  it('universal keywords and hairlines', () => {
    for (const value of ['0', 'auto', '100%', '1px', 'currentColor', 'transparent', 'inherit']) {
      expect(checkDeclaration('padding', value, ctx)).toHaveLength(0);
      expect(checkDeclaration('color', value, ctx)).toHaveLength(0);
    }
  });

  it('tailwind internals and local vars', () => {
    expect(checkDeclaration('box-shadow', 'var(--tw-ring-shadow)', ctx)).toHaveLength(0);
    const local = { ...ctx, localVars: new Set(['--component-gap']) };
    expect(checkDeclaration('gap', 'var(--component-gap)', local)).toHaveLength(0);
  });

  it('token definitions are not usages', () => {
    expect(checkDeclaration('--my-alias', '#123456', ctx)).toHaveLength(0);
  });
});
