import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import picomatch from 'picomatch';
import { globSync } from 'tinyglobby';
import { loadCssTokens } from './css-source.js';
import type { ValueIndex } from './types.js';

export interface DscheckConfig {
  /** Token source globs, relative to the config file (or discovery root). */
  tokens: string[];
  /** Files exempt from linting (content pages, generated code), relative globs. */
  ignore: string[];
  /** Directory the config was found in. */
  root: string;
}

const CONFIG_NAME = 'dscheck.config.json';

/** Per-directory config resolution cache — hot path for editors and large runs. */
const configCache = new Map<string, OffsystemConfig | undefined>();

/** Find dscheck.config.json walking up from `from`; falls back to zero-config discovery. */
export function findConfig(from: string): DscheckConfig | undefined {
  let dir = resolve(from);
  if (existsSync(dir) && !statSync(dir).isDirectory()) dir = dirname(dir);
  for (; ; dir = dirname(dir)) {
    const candidate = join(dir, CONFIG_NAME);
    if (existsSync(candidate)) {
      const parsed = JSON.parse(readFileSync(candidate, 'utf8')) as {
        tokens?: string[];
        ignore?: string[];
      };
      return { tokens: parsed.tokens ?? [], ignore: parsed.ignore ?? [], root: dir };
    }
    if (existsSync(join(dir, 'package.json')) || existsSync(join(dir, '.git'))) {
      return discover(dir);
    }
    if (dirname(dir) === dir) return undefined;
  }
}

/** Zero-config: any css file in the usual places that declares @theme or :root tokens. */
function discover(root: string): DscheckConfig | undefined {
  const candidates = globSync(['*.css', '{app,src,styles,css}/**/*.css'], {
    cwd: root,
    deep: 4,
    ignore: ['**/node_modules/**', '**/dist/**'],
  });
  const tokens = candidates.filter((file) => {
    const css = readFileSync(join(root, file), 'utf8');
    return /@theme[\s{]/.test(css) || /:root\s*{[^}]*--/.test(css);
  });
  return tokens.length > 0 ? { tokens, ignore: [], root } : undefined;
}

interface CacheEntry {
  key: string;
  index: ValueIndex;
}
const cache = new Map<string, CacheEntry>();

/** Resolve the allowed set for a config, cached by token-file mtimes. */
export function loadIndex(config: DscheckConfig): ValueIndex {
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

/** True when the config exempts this file from linting. */
export function isIgnored(filePath: string, config: DscheckConfig): boolean {
  if (config.ignore.length === 0) return false;
  const rel = relative(config.root, resolve(filePath)).replaceAll('\\', '/');
  return picomatch.isMatch(rel, config.ignore);
}

/** One-call convenience for adapters: config + index for the file being linted. */
export function indexFor(filePath: string): ValueIndex | undefined {
  const config = findConfig(filePath);
  if (!config || isIgnored(filePath, config)) return undefined;
  return loadIndex(config);
}
