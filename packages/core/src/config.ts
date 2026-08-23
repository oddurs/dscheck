import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { globSync } from 'tinyglobby';
import { loadCssTokens } from './css-source.js';
import type { ValueIndex } from './types.js';

export interface OffsystemConfig {
  /** Token source globs, relative to the config file (or discovery root). */
  tokens: string[];
  /** Directory the config was found in. */
  root: string;
}

const CONFIG_NAME = 'offsystem.config.json';

/** Find offsystem.config.json walking up from `from`; falls back to zero-config discovery. */
export function findConfig(from: string): OffsystemConfig | undefined {
  let dir = resolve(from);
  if (existsSync(dir) && !statSync(dir).isDirectory()) dir = dirname(dir);
  for (; ; dir = dirname(dir)) {
    const candidate = join(dir, CONFIG_NAME);
    if (existsSync(candidate)) {
      const parsed = JSON.parse(readFileSync(candidate, 'utf8')) as { tokens?: string[] };
      return { tokens: parsed.tokens ?? [], root: dir };
    }
    if (existsSync(join(dir, 'package.json')) || existsSync(join(dir, '.git'))) {
      return discover(dir);
    }
    if (dirname(dir) === dir) return undefined;
  }
}

/** Zero-config: any css file in the usual places that declares @theme or :root tokens. */
function discover(root: string): OffsystemConfig | undefined {
  const candidates = globSync(['*.css', '{app,src,styles,css}/**/*.css'], {
    cwd: root,
    deep: 4,
    ignore: ['**/node_modules/**', '**/dist/**'],
  });
  const tokens = candidates.filter((file) => {
    const css = readFileSync(join(root, file), 'utf8');
    return /@theme[\s{]/.test(css) || /:root\s*{[^}]*--/.test(css);
  });
  return tokens.length > 0 ? { tokens, root } : undefined;
}

interface CacheEntry {
  key: string;
  index: ValueIndex;
}
const cache = new Map<string, CacheEntry>();

/** Resolve the allowed set for a config, cached by token-file mtimes. */
export function loadIndex(config: OffsystemConfig): ValueIndex {
  const files = globSync(config.tokens, {
    cwd: config.root,
    ignore: ['**/node_modules/**'],
  })
    .map((f) => join(config.root, f))
    .sort();
  const key = files.map((f) => `${f}:${statSync(f).mtimeMs}`).join('|');
  const cached = cache.get(config.root);
  if (cached?.key === key) return cached.index;
  const index = loadCssTokens(files);
  cache.set(config.root, { key, index });
  return index;
}

/** One-call convenience for adapters: config + index for the file being linted. */
export function indexFor(filePath: string): ValueIndex | undefined {
  const config = findConfig(filePath);
  return config && loadIndex(config);
}
