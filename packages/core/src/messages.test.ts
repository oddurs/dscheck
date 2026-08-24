import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkDeclaration, formatViolation } from './check.js';
import { loadCssTokens } from './css-source.js';

/**
 * The message audit (N6): every finding names the value, the token, and the
 * distance, in ≤2 lines. Snapshot-locked so message drift is a reviewed change.
 */
const dir = mkdtempSync(join(tmpdir(), 'dscheck-msg-'));
const f = join(dir, 'tokens.css');
writeFileSync(
  f,
  `@theme {
    --color-primary: #1d4ed8;
    --spacing-3: 12px;
    --font-sans: 'Inter', sans-serif;
    --font-weight-medium: 500;
    --shadow-md: 0 4px 6px rgb(0 0 0 / 0.1);
  }`,
);
const ctx = { index: loadCssTokens([f]) };

const CASES: Array<[string, string]> = [
  ['color', '#1d4ed8'],
  ['color', '#1d4fd9'],
  ['padding', '14px'],
  ['gap', '12px'],
  ['color', 'var(--color-primry)'],
  ['color', 'var(--totally-made-up-token)'],
  ['font-family', 'Georgia, serif'],
  ['font-weight', '600'],
  ['box-shadow', '0 4px 6px rgba(0,0,0,0.1)'],
];

describe('finding messages', () => {
  it('are stable, specific, and ≤2 lines', () => {
    const rendered = CASES.flatMap(([prop, value]) =>
      checkDeclaration(prop, value, ctx).map((v) => `${prop}: ${value}\n  → ${formatViolation(v)}`),
    );
    for (const message of rendered) expect(message.split('\n').length).toBeLessThanOrEqual(2);
    expect(rendered).toMatchInlineSnapshot(`
      [
        "color: #1d4ed8
        → Raw color #1d4ed8 — use var(--color-primary) (ΔEOK 0.000)",
        "color: #1d4fd9
        → Raw color #1d4fd9 — use var(--color-primary) (ΔEOK 0.003)",
        "padding: 14px
        → Raw length 14px in padding — use var(--spacing-3) (12px, Δ2px)",
        "gap: 12px
        → Raw length 12px in gap — use var(--spacing-3) (12px)",
        "color: var(--color-primry)
        → Unknown token --color-primry — did you mean --color-primary?",
        "color: var(--totally-made-up-token)
        → Unknown token --totally-made-up-token — no similar token found",
        "font-family: Georgia, serif
        → Raw font stack in font-family — use var(--font-sans)",
        "font-weight: 600
        → Raw font-weight 600 — use var(--font-weight-medium)",
        "box-shadow: 0 4px 6px rgba(0,0,0,0.1)
        → Raw box-shadow — use var(--shadow-md) (identical)",
      ]
    `);
  });
});

describe('far color matches (dogfooding finding)', () => {
  it('does not present a distant token as a suggestion', () => {
    // the system has no translucent tokens; the nearest opaque one is far away
    const [v] = checkDeclaration('background', 'rgba(0, 0, 0, 0.05)', ctx);
    const message = formatViolation(v as never);
    expect(message).toContain('no on-system token is close');
    expect(message).not.toContain('use var(');
  });

  it('still suggests when something is genuinely close', () => {
    const [v] = checkDeclaration('color', '#1d4fd9', ctx);
    expect(formatViolation(v as never)).toContain('use var(--color-primary)');
  });
});
