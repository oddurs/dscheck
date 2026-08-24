import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { planInit } from './init.js';

function project(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'dscheck-init-'));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
}

describe('planInit', () => {
  it('finds a Tailwind @theme and the linters already in use', () => {
    const dir = project({
      'package.json': JSON.stringify({ devDependencies: { eslint: '^10', stylelint: '^17' } }),
      'app/globals.css': '@import "tailwindcss";\n@theme { --color-a: #fff; }',
    });
    const plan = planInit(dir);
    expect(plan.tokenFiles).toEqual(['app/globals.css']);
    expect(plan.hosts.sort()).toEqual(['eslint', 'stylelint']);
  });

  it('looks inside monorepo packages, not just the root app', () => {
    const dir = project({
      'package.json': '{}',
      'packages/ui/src/globals.css':
        ':root {\n--color-a: #fff;\n--color-b: #eee;\n--color-c: #ddd;\n--color-d: #ccc;\n--color-e: #bbb;\n}',
    });
    expect(planInit(dir).tokenFiles).toEqual(['packages/ui/src/globals.css']);
  });

  it('proposes rootSelectors for a scoped system, through scss nesting', () => {
    const dir = project({
      'package.json': '{}',
      'css/theme.scss': `@use "sass:color";
.excalidraw {
  --theme-filter: none;
  --color-primary: #6965db;
  --color-surface: #fff;
  --color-border: #ddd;
  --color-text: #111;
  .nested-thing {
    color: red;
  }
}`,
    });
    const plan = planInit(dir);
    expect(plan.rootSelectors).toEqual(['.excalidraw']);
    expect(plan.tokenFiles).toEqual(['css/theme.scss']);
  });

  it('never proposes theme-mode scopes as roots', () => {
    const dir = project({
      'package.json': '{}',
      'styles/tokens.css': `:root {
--color-a: #fff;
--color-b: #eee;
--color-c: #ddd;
--color-d: #ccc;
--color-e: #bbb;
}
.dark {
--color-a: #000;
--color-b: #111;
--color-c: #222;
--color-d: #333;
--color-e: #444;
}`,
    });
    expect(planInit(dir).rootSelectors).toEqual([]); // .dark is a mode, handled natively
  });

  it('ignores component files that merely declare local custom properties', () => {
    const dir = project({
      'package.json': '{}',
      'css/tokens.css': '@theme { --color-a: #fff; }',
      'components/Button.scss':
        '.button {\n--b-1: 1px;\n--b-2: 2px;\n--b-3: 3px;\n--b-4: 4px;\n--b-5: 5px;\n--b-6: 6px;\n}',
    });
    expect(planInit(dir).tokenFiles).toEqual(['css/tokens.css']);
  });

  it('proposes allow globs for referenced-but-undeclared vendor names', () => {
    const dir = project({
      'package.json': '{}',
      'app/globals.css':
        '@theme { --color-a: #fff; }\n.x { height: var(--radix-accordion-height); }',
    });
    expect(planInit(dir).allow).toContain('--radix-*');
  });

  it('reports nothing rather than guessing when there is no system', () => {
    const dir = project({ 'package.json': '{}', 'app/main.css': '.a { color: red; }' });
    expect(planInit(dir).tokenFiles).toEqual([]);
  });
});
