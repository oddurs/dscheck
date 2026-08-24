import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findConfig, indexFor, isIgnored, loadIndex } from './config.js';

function project(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'dscheck-cfg-'));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
}

describe('findConfig', () => {
  it('walks up from a nested file to the config', () => {
    const dir = project({
      'package.json': '{}',
      'dscheck.config.json': '{"tokens":["tokens.css"],"ignore":["gen/**"]}',
      'tokens.css': '@theme { --color-a: #fff; }',
      'src/deep/component.css': '.a{}',
    });
    const config = findConfig(join(dir, 'src/deep/component.css'));
    expect(config?.root).toBe(dir);
    expect(config?.tokens).toEqual(['tokens.css']);
    expect(config?.ignore).toEqual(['gen/**']);
  });

  it('zero-config: discovers @theme css at the package boundary', () => {
    const dir = project({
      'package.json': '{}',
      'app/globals.css': '@theme { --color-a: #fff; }',
      'app/plain.css': '.a { color: red; }',
    });
    const config = findConfig(join(dir, 'app'));
    expect(config?.tokens).toEqual(['app/globals.css']);
  });

  it('returns undefined when there is nothing to find', () => {
    const dir = project({ 'package.json': '{}', 'a.css': '.a{}' });
    expect(findConfig(dir)).toBeUndefined();
  });
});

describe('isIgnored / indexFor', () => {
  const dir = project({
    'package.json': '{}',
    'dscheck.config.json': '{"tokens":["tokens.css"],"ignore":["content/**"]}',
    'tokens.css': '@theme { --color-a: #fff; }',
    'content/post.css': '.a{}',
    'src/a.css': '.a{}',
  });

  it('exempts ignored files entirely', () => {
    const config = findConfig(join(dir, 'src/a.css'));
    expect(config && isIgnored(join(dir, 'content/post.css'), config)).toBe(true);
    expect(config && isIgnored(join(dir, 'src/a.css'), config)).toBe(false);
    expect(indexFor(join(dir, 'content/post.css'))).toBeUndefined();
    expect(indexFor(join(dir, 'src/a.css'))?.tokens.has('--color-a')).toBe(true);
  });

  it('caches by mtime and reloads on token change', () => {
    const config = findConfig(join(dir, 'src/a.css'));
    if (!config) throw new Error('no config');
    const first = loadIndex(config);
    expect(loadIndex(config)).toBe(first); // cached
    writeFileSync(join(dir, 'tokens.css'), '@theme { --color-b: #000; }');
    const future = Date.now() / 1000 + 5;
    utimesSync(join(dir, 'tokens.css'), future, future);
    const second = loadIndex(config);
    expect(second).not.toBe(first);
    expect(second.tokens.has('--color-b')).toBe(true);
  });
});

describe('allow globs', () => {
  it('exempts runtime-injected names from unknown-token', async () => {
    const { checkDeclaration } = await import('./check.js');
    const { allowedNameMatcher, findConfig, loadIndex } = await import('./config.js');
    const dir = project({
      'package.json': '{}',
      'dscheck.config.json': '{"tokens":["t.css"],"allow":["--shiki-*","--font-geist-sans"]}',
      't.css': '@theme { --color-a: #fff; }',
    });
    const config = findConfig(dir);
    if (!config) throw new Error('no config');
    const ctx = { index: loadIndex(config), isAllowedName: allowedNameMatcher(config) };
    expect(checkDeclaration('color', 'var(--shiki-light)', ctx)).toHaveLength(0);
    expect(checkDeclaration('font-family', 'var(--font-geist-sans)', ctx)).toHaveLength(0);
    expect(checkDeclaration('color', 'var(--nope)', ctx)).toHaveLength(1);
  });
});

describe('tolerance & rules config (A4)', () => {
  it('plumbs tolerance from config into matching', async () => {
    const { checkDeclaration } = await import('./check.js');
    const { findConfig, loadIndex, toleranceFor } = await import('./config.js');
    const dir = project({
      'package.json': '{}',
      'dscheck.config.json': '{"tokens":["t.css"],"tolerance":{"colorClose":0.5}}',
      't.css': '@theme { --color-primary: #1d4ed8; }',
    });
    const config = findConfig(dir);
    if (!config) throw new Error('no config');
    const ctx = { index: loadIndex(config), tolerance: toleranceFor(config) };
    // far-off red is "close" under a huge tolerance — proves the value flows through
    const [v] = checkDeclaration('color', '#ff0000', ctx);
    expect(v?.matches[0]?.kind).toBe('close');
  });
});

describe('monorepo config precedence (root-to-1.0)', () => {
  it('explicit root config beats package-boundary discovery', () => {
    const dir = project({
      '.git/HEAD': 'ref: refs/heads/main',
      'dscheck.config.json': '{"tokens":["tokens.css"]}',
      'tokens.css': '@theme { --color-a: #fff; }',
      'packages/widget/package.json': '{}',
      'packages/widget/src/a.css': '.a{}',
    });
    const config = findConfig(join(dir, 'packages/widget/src/a.css'));
    expect(config?.root).toBe(dir);
    expect(config?.tokens).toEqual(['tokens.css']);
  });

  it('nearer explicit config still wins over a farther one', () => {
    const dir = project({
      '.git/HEAD': 'ref: refs/heads/main',
      'dscheck.config.json': '{"tokens":["root.css"]}',
      'root.css': ':root { --a: 1px; }',
      'packages/app/dscheck.config.json': '{"tokens":["theme.css"]}',
      'packages/app/theme.css': '@theme { --color-b: #000; }',
      'packages/app/src/x.css': '.a{}',
    });
    const config = findConfig(join(dir, 'packages/app/src/x.css'));
    expect(config?.tokens).toEqual(['theme.css']);
  });
});

describe('cross-file component vars (contract #1)', () => {
  it('a var declared in another project file is never "unknown"', async () => {
    const { checkDeclaration } = await import('./check.js');
    const dir = project({
      'package.json': '{}',
      'dscheck.config.json': '{"tokens":["tokens.css"]}',
      'tokens.css': '@theme { --color-a: #fff; }',
      'components/button.css': '.button { --button-color: red; }',
    });
    const config = findConfig(dir);
    if (!config) throw new Error('no config');
    const ctx = { index: loadIndex(config) };
    expect(checkDeclaration('color', 'var(--button-color)', ctx)).toHaveLength(0);
    expect(checkDeclaration('color', 'var(--butotn-color)', ctx)).toHaveLength(1); // typo still caught
  });
});

describe('config validation (J1)', () => {
  it('fails fast on unknown keys with a did-you-mean', () => {
    const dir = project({
      'package.json': '{}',
      'dscheck.config.json': '{"tokens":["t.css"],"ignroe":["x/**"]}',
      't.css': '@theme { --color-a: #fff; }',
    });
    expect(() => findConfig(dir)).toThrowError(/unknown key "ignroe" — did you mean "ignore"\?/);
  });

  it('fails fast on wrong types', () => {
    const dir = project({
      'package.json': '{}',
      'dscheck.config.json': '{"tokens":"t.css"}',
      't.css': '@theme { --color-a: #fff; }',
    });
    expect(() => findConfig(dir)).toThrowError(/"tokens" must be an array/);
  });
});

describe('config forward-compat (M3)', () => {
  it('x-* keys are reserved extension space', () => {
    const dir = project({
      'package.json': '{}',
      'dscheck.config.json': '{"tokens":["t.css"],"x-team-notes":"anything"}',
      't.css': '@theme { --color-a: #fff; }',
    });
    expect(findConfig(dir)?.tokens).toEqual(['t.css']);
  });

  it('a newer $schema downgrades unknown keys to a warning', () => {
    const dir = project({
      'package.json': '{}',
      'dscheck.config.json':
        '{"$schema":"https://oddurs.github.io/dscheck/config.schema.v9.json","tokens":["t.css"],"futureKey":true}',
      't.css': '@theme { --color-a: #fff; }',
    });
    expect(() => findConfig(dir)).not.toThrow();
    expect(findConfig(dir)?.tokens).toEqual(['t.css']);
  });
});
