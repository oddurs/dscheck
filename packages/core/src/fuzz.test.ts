import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { checkDeclaration } from './check.js';
import { loadCssTokens } from './css-source.js';

const dir = mkdtempSync(join(tmpdir(), 'dscheck-fuzz-'));
const tokensFile = join(dir, 'tokens.css');
writeFileSync(
  tokensFile,
  '@theme { --color-primary: #1d4ed8; --spacing-3: 12px; --shadow-md: 0 1px 2px #0002; }',
);
const ctx = { index: loadCssTokens([tokensFile]) };

/** CSS-ish value fragments that stress the parser paths. */
const fragment = fc.oneof(
  fc.string(),
  fc.constantFrom(
    '#fff',
    '#12345',
    'rgb(',
    'var(',
    'var(--)',
    'var(--a, var(--b, #333))',
    'calc(1px + )',
    'clamp(,,)',
    'url(data:image/svg+xml;base64,PHN2Zz4=)',
    '/* comment */ #333',
    '"quoted #333"',
    '\\28 escaped',
    '🎨 14px',
    '--',
    '14PX',
    '14px 2rem -3em .5px 1e3px',
    'oklch(0.5 0.1 200 / 55%)',
    'linear-gradient(#111, #222)',
  ),
);
const value = fc.array(fragment, { minLength: 0, maxLength: 6 }).map((parts) => parts.join(' '));
const property = fc.oneof(
  fc.constantFrom(
    'color',
    'padding',
    'font-size',
    'box-shadow',
    'font-family',
    'font-weight',
    '--x',
  ),
  fc.string({ minLength: 0, maxLength: 24 }),
);

describe('fuzz: checkDeclaration never crashes and stays consistent', () => {
  it('handles arbitrary property/value pairs', () => {
    fc.assert(
      fc.property(property, value, (prop, val) => {
        const violations = checkDeclaration(prop, val, ctx);
        for (const v of violations) {
          expect(v.index).toBeGreaterThanOrEqual(0);
          expect(v.message.length).toBeGreaterThan(0);
          expect(v.matches.length).toBeLessThanOrEqual(3);
        }
      }),
      { numRuns: 5000 },
    );
  });

  it('is deterministic', () => {
    fc.assert(
      fc.property(property, value, (prop, val) => {
        expect(checkDeclaration(prop, val, ctx)).toEqual(checkDeclaration(prop, val, ctx));
      }),
      { numRuns: 1000 },
    );
  });
});

describe('fuzz: loadCssTokens never crashes on arbitrary css', () => {
  it('parses or rejects gracefully', () => {
    let n = 0;
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.string(),
            fc.constantFrom(
              '@theme {',
              '}',
              ':root { --a: var(--a); }',
              '@theme inline { --b: var(--missing); }',
              ':root { --c: ; }',
              '@media (min-width: 0) { :root { --d: 1px; } }',
            ),
          ),
          { maxLength: 8 },
        ),
        (parts) => {
          const file = join(dir, `fuzz-${n++}.css`);
          writeFileSync(file, parts.join('\n'));
          try {
            loadCssTokens([file]);
          } catch (error) {
            // postcss syntax errors are acceptable; anything else is a bug
            expect((error as { name?: string }).name).toBe('CssSyntaxError');
          }
        },
      ),
      { numRuns: 500 },
    );
  });
});
