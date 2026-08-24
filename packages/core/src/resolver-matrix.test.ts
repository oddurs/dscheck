import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findConfig, loadIndex } from './config.js';

/**
 * H1: the resolver golden — one kitchen-sink project exercising every source
 * kind and scope in combination. The snapshot is the resolver's contract:
 * a diff here is a semver event, reviewed, never incidental.
 */
describe('resolver matrix golden', () => {
  it('resolves the kitchen-sink project to a stable index', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dscheck-matrix-'));
    mkdirSync(join(dir, 'brand'), { recursive: true });
    writeFileSync(join(dir, 'package.json'), '{}');
    writeFileSync(
      join(dir, 'dscheck.config.json'),
      JSON.stringify({
        tokens: ['app.css', 'scoped.scss', 'brand/light.json', 'brand/dark.json', 'theme.ts'],
        rootSelectors: ['.widget'],
        roles: 'roles.json',
      }),
    );
    writeFileSync(
      join(dir, 'app.css'),
      `@theme inline { --color-primary: var(--primary); }
       :root { --primary: oklch(0.55 0.2 260); --spacing-3: 12px; }
       .dark { --primary: oklch(0.7 0.18 260); }
       @media (prefers-color-scheme: dark) { :root { --spacing-3: 12px; } }
       [data-theme='sepia'] { --primary: oklch(0.6 0.1 80); }`,
    );
    writeFileSync(
      join(dir, 'scoped.scss'),
      `@use "sass:color";
       .widget { --widget-radius: 6px; --widget-accent: #{$accent}; }`,
    );
    writeFileSync(
      join(dir, 'brand/light.json'),
      JSON.stringify({
        brand: {
          $type: 'color',
          surface: { $value: '#ffffff', $extensions: { dscheck: { roles: ['bg'] } } },
          accent: { $value: '{brand.surface}' },
        },
        pad: { $type: 'dimension', lg: { $value: { value: 24, unit: 'px' } } },
      }),
    );
    writeFileSync(
      join(dir, 'brand/dark.json'),
      JSON.stringify({ brand: { $type: 'color', surface: { $value: '#111113' } } }),
    );
    writeFileSync(
      join(dir, 'theme.ts'),
      `export const tokens = { motion: { fast: '150ms' } } as const;`,
    );
    writeFileSync(join(dir, 'roles.json'), JSON.stringify({ '--color-primary': ['fg'] }));

    const config = findConfig(dir);
    if (!config) throw new Error('no config');
    const index = loadIndex(config);
    const stable = [...index.tokens.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((t) => ({
        name: t.name,
        value: t.value,
        category: t.category,
        ...(t.modeValues ? { modes: t.modeValues } : {}),
        ...(t.roles ? { roles: t.roles } : {}),
        ...(t.aliasOf ? { aliasOf: t.aliasOf } : {}),
        ...(t.unresolved ? { unresolved: true } : {}),
      }));
    expect(stable).toMatchInlineSnapshot(`
      [
        {
          "aliasOf": "--brand-surface",
          "category": "color",
          "name": "--brand-accent",
          "value": "#ffffff",
        },
        {
          "category": "color",
          "modes": [
            "#111113",
          ],
          "name": "--brand-surface",
          "roles": [
            "bg",
          ],
          "value": "#ffffff",
        },
        {
          "aliasOf": "--primary",
          "category": "color",
          "modes": [
            "oklch(0.7 0.18 260)",
            "oklch(0.6 0.1 80)",
          ],
          "name": "--color-primary",
          "roles": [
            "fg",
          ],
          "value": "oklch(0.55 0.2 260)",
        },
        {
          "category": "duration",
          "name": "--motion-fast",
          "value": "150ms",
        },
        {
          "category": "length",
          "name": "--pad-lg",
          "value": "24px",
        },
        {
          "category": "color",
          "modes": [
            "oklch(0.7 0.18 260)",
            "oklch(0.6 0.1 80)",
          ],
          "name": "--primary",
          "value": "oklch(0.55 0.2 260)",
        },
        {
          "category": "length",
          "name": "--spacing-3",
          "value": "12px",
        },
        {
          "category": "other",
          "name": "--widget-accent",
          "unresolved": true,
          "value": "#{$accent}",
        },
        {
          "category": "radius",
          "name": "--widget-radius",
          "value": "6px",
        },
      ]
    `);
  });
});
