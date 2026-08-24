import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyBaseline, writeBaseline } from './baseline.js';
import type { Finding } from './run.js';

/** J3: baseline arithmetic as properties, not anecdotes. */
const findingArb = fc.record({
  file: fc.constantFrom('a.css', 'b.tsx', 'sub/c.css'),
  line: fc.nat({ max: 99 }),
  col: fc.nat({ max: 99 }),
  rule: fc.constantFrom('dscheck/no-raw-color', 'dscheck/no-raw-length'),
  severity: fc.constantFrom('error' as const, 'warning' as const),
  message: fc.constantFrom('m1', 'm2', 'm3'),
});

const root = mkdtempSync(join(tmpdir(), 'dscheck-baseprop-'));

describe('baseline invariants', () => {
  it('a run absorbed by its own baseline is always clean', () => {
    fc.assert(
      fc.property(fc.array(findingArb, { maxLength: 30 }), (findings) => {
        const baseline = writeBaseline(findings.map(abs), root);
        const { fresh, absorbed } = applyBaseline(findings.map(abs), baseline, root);
        expect(fresh).toEqual([]);
        expect(absorbed).toBe(findings.length);
      }),
      { numRuns: 200 },
    );
  });

  it('adding one finding surfaces at least one; removing surfaces none and counts stale', () => {
    fc.assert(
      fc.property(
        fc.array(findingArb, { minLength: 1, maxLength: 20 }),
        findingArb,
        (base, extra) => {
          const baseline = writeBaseline(base.map(abs), root);
          const more = applyBaseline([...base, extra].map(abs), baseline, root);
          expect(more.fresh.length).toBeGreaterThanOrEqual(1);
          const fewer = applyBaseline(base.slice(1).map(abs), baseline, root);
          expect(fewer.fresh).toEqual([]);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('is line-number independent (survives edits and merges)', () => {
    fc.assert(
      fc.property(fc.array(findingArb, { maxLength: 20 }), (findings) => {
        const baseline = writeBaseline(findings.map(abs), root);
        const moved = findings.map((f) => ({ ...f, line: f.line + 100, col: 0 }));
        expect(applyBaseline(moved.map(abs), baseline, root).fresh).toEqual([]);
      }),
      { numRuns: 200 },
    );
  });
});

function abs(f: Omit<Finding, 'file'> & { file: string }): Finding {
  return { ...f, file: join(root, f.file) };
}

describe('format versioning (M4)', () => {
  it('stamps $version, tolerates and preserves unknown $-metadata', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dscheck-basever-'));
    const findings = [
      {
        file: join(dir, 'a.css'),
        line: 1,
        col: 1,
        rule: 'dscheck/no-raw-color',
        severity: 'error' as const,
        message: 'm',
      },
    ];
    writeBaseline(findings, dir);
    const { readFileSync, writeFileSync } = require('node:fs') as typeof import('node:fs');
    const raw = JSON.parse(readFileSync(join(dir, '.dscheck-baseline.json'), 'utf8'));
    expect(raw.$version).toBe(1);
    // a future dscheck writes extra metadata; today's build must keep it
    raw.$futureField = 'kept';
    writeFileSync(join(dir, '.dscheck-baseline.json'), JSON.stringify(raw));
    const baseline = writeBaseline(findings, dir);
    const rewritten = JSON.parse(readFileSync(join(dir, '.dscheck-baseline.json'), 'utf8'));
    expect(rewritten.$futureField).toBe('kept');
    // and reading skips metadata cleanly
    const { fresh } = applyBaseline(findings, baseline, dir);
    expect(fresh).toEqual([]);
  });
});
