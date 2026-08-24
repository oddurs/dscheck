import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { loadCssTokens } from './css-source.js';
import { loadDtcgTokens } from './dtcg-source.js';

/**
 * H4: resolver invariants against a naive reference implementation.
 */
const dir = mkdtempSync(join(tmpdir(), 'dscheck-prop-'));
let n = 0;

/** Random var-reference graphs: values are literals or references, cycles allowed. */
const graph = fc.array(
  fc.oneof(
    fc.constantFrom('4px', '#123456', '1rem', 'oklch(0.5 0.1 200)'),
    fc.nat({ max: 7 }).map((i) => `var(--t${i})`),
  ),
  { minLength: 1, maxLength: 8 },
);

/** Reference resolver: plain recursive walk with a visited set. */
function referenceResolve(
  values: string[],
  i: number,
  seen: Set<number>,
): { value: string; unresolved: boolean } {
  const raw = values[i] as string;
  const ref = /^var\(--t(\d+)\)$/.exec(raw);
  if (!ref) return { value: raw, unresolved: false };
  const target = Number(ref[1]);
  if (target >= values.length || seen.has(target)) return { value: raw, unresolved: true };
  seen.add(target);
  return referenceResolve(values, target, seen);
}

describe('alias resolution matches the reference implementation', () => {
  it('same literal values and unresolved flags', () => {
    fc.assert(
      fc.property(graph, (values) => {
        const css = `:root { ${values.map((v, i) => `--t${i}: ${v};`).join(' ')} }`;
        const file = join(dir, `g${n++}.css`);
        writeFileSync(file, css);
        const index = loadCssTokens([file]);
        values.forEach((_, i) => {
          const token = index.tokens.get(`--t${i}`);
          const expected = referenceResolve(values, i, new Set([i]));
          expect(token?.unresolved ?? false).toBe(expected.unresolved);
          if (!expected.unresolved) expect(token?.value).toBe(expected.value);
        });
      }),
      { numRuns: 300 },
    );
  });
});

describe('multi-file DTCG precedence', () => {
  it('first file wins primary; later re-declarations become modes, order-stable', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.constantFrom('#111111', '#222222', '#333333', '#444444'), {
          minLength: 2,
          maxLength: 4,
        }),
        (colors) => {
          const files = colors.map((c, i) => {
            const f = join(dir, `m${n++}-${i}.json`);
            writeFileSync(f, JSON.stringify({ a: { $type: 'color', $value: c } }));
            return f;
          });
          const [token] = loadDtcgTokens(files);
          expect(token?.value).toBe(colors[0]);
          expect(token?.modeValues).toEqual(colors.slice(1));
        },
      ),
      { numRuns: 100 },
    );
  });
});
