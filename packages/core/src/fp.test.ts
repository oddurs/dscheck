import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';
import { checkDeclaration } from './check.js';
import { loadCssTokens } from './css-source.js';

/**
 * G5: the false-positive regression corpus. Each fixtures/fp/NNN-* directory is
 * a once-real FP that must stay silent forever. This suite only grows.
 */
const root = join(import.meta.dirname, '..', '..', '..', 'fixtures', 'fp');
const cases = readdirSync(root).filter((d) => /^\d{3}-/.test(d));

describe('fp regression corpus', () => {
  it('has the seeded cases', () => {
    expect(cases.length).toBeGreaterThanOrEqual(4);
  });

  for (const name of cases) {
    it(name, () => {
      const cssFile = join(root, name, 'case.css');
      const css = readFileSync(cssFile, 'utf8');
      const index = loadCssTokens([cssFile]);
      const allow = /config allow: (\S+)/.exec(css)?.[1];
      const ctx = {
        index,
        ...(allow ? { isAllowedName: (n: string) => n.startsWith(allow.replace('*', '')) } : {}),
      };
      const localVars = new Set<string>();
      postcss.parse(css).walkDecls(/^--/, (d) => {
        localVars.add(d.prop);
      });
      const findings: string[] = [];
      postcss.parse(css).walkDecls((decl) => {
        if (decl.prop.startsWith('--')) return;
        for (const v of checkDeclaration(decl.prop, decl.value, { ...ctx, localVars })) {
          // alpha case: a 'nearest' informational match is fine; 'exact'/'close' would be the FP
          if (name.includes('alpha') && v.matches[0]?.kind === 'nearest') continue;
          findings.push(v.message);
        }
      });
      expect(findings).toEqual([]);
    });
  }
});
