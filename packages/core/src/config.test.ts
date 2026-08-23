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
