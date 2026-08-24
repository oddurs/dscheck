import { describe, expect, it } from 'vitest';
import { isExactMatch, renderFindings, renderSummary, wrap } from './render.js';
import type { Finding } from './run.js';

/**
 * X: the terminal output is a contract too. These goldens are reviewed like
 * code — a diff here means the CLI looks different to every user.
 */
const options = { width: 80, ascii: true, quiet: false, root: '/repo' };

const finding = (over: Partial<Finding> = {}): Finding => ({
  file: '/repo/src/Button.tsx',
  line: 12,
  col: 9,
  rule: 'dscheck/no-raw-color',
  severity: 'error',
  message: 'Raw color #1d4ed8 — use var(--color-primary) (ΔEOK 0.000)',
  ...over,
});

describe('findings list', () => {
  it('groups by file, aligns positions, names a repeated rule once', () => {
    const findings = [
      finding({
        line: 3,
        col: 5,
        rule: 'dscheck/no-raw-length',
        severity: 'warning',
        message: 'Raw length 14px in gap — use var(--spacing-3) (12px, Δ2px)',
      }),
      finding({
        line: 120,
        col: 11,
        rule: 'dscheck/no-raw-length',
        severity: 'warning',
        message: 'Raw length 13px in padding — use var(--spacing-3) (12px, Δ1px)',
      }),
      finding({
        line: 9,
        col: 2,
        rule: 'dscheck/no-raw-length',
        severity: 'warning',
        message: 'Raw length 15px in margin — use var(--spacing-4) (16px, Δ1px)',
      }),
    ];
    expect(renderFindings(findings, options).join('\n')).toMatchInlineSnapshot(`
      "
      src/Button.tsx
        !    3:5  Raw length 14px in gap — use var(--spacing-3) (12px, Δ2px)
        ! 120:11  Raw length 13px in padding — use var(--spacing-3) (12px, Δ1px)
        !    9:2  Raw length 15px in margin — use var(--spacing-4) (16px, Δ1px)
        3× no-raw-length"
    `);
  });

  it('wraps long messages under their own indent', () => {
    const long = finding({
      message:
        'Raw color rgba(0, 0, 0, 0.05) — no on-system token is close (nearest --color-black, ΔEOK 0.950) — add a token, or accept it via baseline/allow',
    });
    const lines = renderFindings([long], { ...options, width: 60 });
    expect(lines.length).toBeGreaterThan(3);
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(70);
  });
});

describe('summary', () => {
  it('names the next action for exact matches and judgment calls', () => {
    const findings = [
      finding(),
      finding({
        severity: 'warning',
        rule: 'dscheck/no-raw-length',
        message: 'Raw length 14px in gap — use var(--spacing-3) (12px, Δ2px)',
      }),
    ];
    expect(renderSummary(findings, options).join('\n')).toMatchInlineSnapshot(`
      "
      1 error, 1 warning
           1  no-raw-color
           1  no-raw-length

        1 is an exact match — dscheck fix applies it
        1 needs judgment — accept as debt with dscheck baseline"
    `);
  });

  it('says nothing was found, in ascii when asked', () => {
    expect(renderSummary([], options).join('\n')).toBe('\nok on-system: no findings');
    expect(renderSummary([], { ...options, ascii: false }).join('\n')).toContain('✔');
  });
});

describe('exact-match detection drives the advice', () => {
  it('treats identical values as fixable and deltas as judgment', () => {
    expect(isExactMatch(finding())).toBe(true);
    expect(
      isExactMatch(finding({ message: 'Raw box-shadow — use var(--shadow-md) (identical)' })),
    ).toBe(true);
    expect(
      isExactMatch(
        finding({ message: 'Raw length 14px in gap — use var(--spacing-3) (12px, Δ2px)' }),
      ),
    ).toBe(false);
    expect(isExactMatch(finding({ message: 'Unknown token --x — did you mean --y?' }))).toBe(false);
    expect(
      isExactMatch(
        finding({
          message: 'Raw color #abc — no on-system token is close (nearest --z, ΔEOK 0.9)',
        }),
      ),
    ).toBe(false);
  });
});

describe('wrap', () => {
  it('never splits mid-word and gives up gracefully on narrow widths', () => {
    expect(wrap('one two three four', 20, 2)).toEqual(['one two three four']);
    expect(wrap('a'.repeat(50), 40, 2)).toEqual(['a'.repeat(50)]);
  });
});
