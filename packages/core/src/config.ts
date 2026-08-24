import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import picomatch from 'picomatch';
import { globSync } from 'tinyglobby';
import { classifyToken, loadCssTokens } from './css-source.js';
import { loadDtcgTokens } from './dtcg-source.js';
import { defaultTolerance, type Tolerance } from './match.js';
import { loadTsTokens } from './ts-source.js';
import type { ValueIndex } from './types.js';
import { createIndex, type Token } from './types.js';

export interface DscheckConfig {
  /** Token source globs, relative to the config file (or discovery root). */
  tokens: string[];
  /** Files exempt from linting (content pages, generated code), relative globs. */
  ignore: string[];
  /** Custom-property name globs never reported as unknown (runtime-injected vars: --shiki-*, next/font). */
  allow: string[];
  /** Matching tolerances; omitted fields use defaults. */
  tolerance?: { colorExact?: number; colorClose?: number };
  /** CLI-side severity overrides: { "no-raw-length": "off" | "warn" | "error" }. */
  rules?: Record<string, 'off' | 'warn' | 'error'>;
  /** Path (relative to root) of a roles sidecar: { "name-glob": ["bg", "fg"] }. */
  rolesFile?: string;
  /** Selectors treated as the system root besides :root — for scoped systems (.excalidraw). */
  rootSelectors?: string[];
  /** Directory the config was found in. */
  root: string;
}

const CONFIG_NAME = 'dscheck.config.json';

/** Per-directory config resolution cache — hot path for editors and large runs. */
const configCache = new Map<string, DscheckConfig | undefined>();

/** Find dscheck.config.json walking up from `from`; falls back to zero-config discovery. */
export function findConfig(from: string): DscheckConfig | undefined {
  let dir = resolve(from);
  if (existsSync(dir) && !statSync(dir).isDirectory()) dir = dirname(dir);
  const cached = configCache.get(dir);
  if (cached !== undefined || configCache.has(dir)) return cached;
  const found = findConfigWalk(dir);
  configCache.set(dir, found);
  return found;
}

function findConfigWalk(start: string): DscheckConfig | undefined {
  // An explicit config anywhere up to the repo root beats zero-config
  // discovery at a package boundary — monorepos configure at the root.
  let firstBoundary: string | undefined;
  let dir = start;
  for (; ; dir = dirname(dir)) {
    const candidate = join(dir, CONFIG_NAME);
    if (existsSync(candidate)) {
      const parsed = JSON.parse(readFileSync(candidate, 'utf8')) as {
        tokens?: string[];
        ignore?: string[];
        allow?: string[];
        tolerance?: { colorExact?: number; colorClose?: number };
        rules?: Record<string, 'off' | 'warn' | 'error'>;
        roles?: string;
        rootSelectors?: string[];
      };
      return {
        tokens: parsed.tokens ?? [],
        ignore: parsed.ignore ?? [],
        allow: parsed.allow ?? [],
        ...(parsed.tolerance ? { tolerance: parsed.tolerance } : {}),
        ...(parsed.rules ? { rules: parsed.rules } : {}),
        ...(parsed.roles ? { rolesFile: parsed.roles } : {}),
        ...(parsed.rootSelectors ? { rootSelectors: parsed.rootSelectors } : {}),
        root: dir,
      };
    }
    if (!firstBoundary && existsSync(join(dir, 'package.json'))) firstBoundary = dir;
    if (existsSync(join(dir, '.git'))) {
      return discover(firstBoundary ?? dir);
    }
    if (dirname(dir) === dir) {
      return firstBoundary ? discover(firstBoundary) : undefined;
    }
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
  return tokens.length > 0 ? { tokens, ignore: [], allow: [], root } : undefined;
}

interface CacheEntry {
  key: string;
  index: ValueIndex;
}
const cache = new Map<string, CacheEntry>();

const fileListCache = new Map<string, string[]>();

/** Resolve the allowed set for a config, cached by token-file mtimes. */
export function loadIndex(config: DscheckConfig): ValueIndex {
  // Config order is meaning: the first source of a token wins the primary
  // value (light before dark). Sort only within each pattern's expansion.
  const listKey = `${config.root}|${config.tokens.join(',')}`;
  let files = fileListCache.get(listKey);
  if (!files || !files.every((f) => existsSync(f))) {
    files = [
      ...new Set(
        config.tokens.flatMap((pattern) =>
          globSync(pattern, { cwd: config.root, ignore: ['**/node_modules/**'] })
            .sort()
            .map((f) => join(config.root, f)),
        ),
      ),
    ];
    fileListCache.set(listKey, files);
  }
  const key = files.map((f) => `${f}:${statSync(f).mtimeMs}`).join('|');
  const cached = cache.get(config.root);
  if (cached?.key === key) return cached.index;

  const cssFiles = files.filter((f) => /\.(css|scss)$/.test(f));
  const jsonFiles = files.filter((f) => /\.json$/.test(f) && !/\$(themes|metadata)\.json$/.test(f));
  const tsFiles = files.filter((f) => /\.(ts|mts|js|mjs)$/.test(f));

  const cssIndex =
    cssFiles.length > 0
      ? loadCssTokens(cssFiles, { rootSelectors: config.rootSelectors ?? [] })
      : undefined;
  const extra = [
    ...(jsonFiles.length > 0 ? loadDtcgTokens(jsonFiles) : []),
    ...(tsFiles.length > 0 ? loadTsTokens(tsFiles).map(classifyToken) : []),
  ];

  // Merge: first source of a name wins the primary value; a different value
  // from another source becomes a mode value (light.json + dark.json pattern).
  const merged = new Map<string, Token>();
  for (const token of [...(cssIndex ? cssIndex.tokens.values() : []), ...extra]) {
    const existing = merged.get(token.name);
    if (!existing) {
      merged.set(token.name, { ...token });
    } else if (token.value !== existing.value) {
      existing.modeValues = [
        ...new Set([...(existing.modeValues ?? []), token.value, ...(token.modeValues ?? [])]),
      ];
    }
    if (token.roles && !merged.get(token.name)?.roles) {
      const target = merged.get(token.name);
      if (target) target.roles = token.roles;
    }
  }
  applyRolesSidecar(config, merged);

  const index = createIndex(merged.values());
  if (cssIndex?.diagnostics) index.diagnostics = cssIndex.diagnostics;
  index.knownNames = declaredNamesIn(config.root);
  cache.set(config.root, { key, index });
  return index;
}

const knownNamesCache = new Map<string, ReadonlySet<string>>();

/**
 * Name-only inventory of every custom property declared in the project's
 * stylesheets. Over-collection is safe: it only prevents "unknown token"
 * claims about vars that do exist somewhere; typo'd *usages* stay flagged.
 */
function declaredNamesIn(root: string): ReadonlySet<string> {
  const cached = knownNamesCache.get(root);
  if (cached) return cached;
  const names = new Set<string>();
  for (const file of globSync('**/*.{css,scss}', {
    cwd: root,
    ignore: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
  })) {
    try {
      const css = readFileSync(join(root, file), 'utf8');
      for (const match of css.matchAll(/(--[\w-]+)\s*:/g)) names.add(match[1] as string);
    } catch {
      // unreadable file: skip; the lint pass will surface it
    }
  }
  knownNamesCache.set(root, names);
  return names;
}

/** `roles` config: a JSON file of { "name-glob": ["bg", "fg", …] }. */
function applyRolesSidecar(config: DscheckConfig, tokens: Map<string, Token>): void {
  if (!config.rolesFile) return;
  const path = join(config.root, config.rolesFile);
  if (!existsSync(path)) return;
  const mapping = JSON.parse(readFileSync(path, 'utf8')) as Record<string, string[]>;
  const matchers = Object.entries(mapping).map(([glob, roles]) => ({
    match: picomatch(glob),
    roles,
  }));
  for (const token of tokens.values()) {
    for (const { match, roles } of matchers) {
      if (match(token.name)) token.roles = [...new Set([...(token.roles ?? []), ...roles])];
    }
  }
}

/** Resolved tolerance for a config, defaults filled. */
export function toleranceFor(config: DscheckConfig | undefined): Tolerance {
  return { ...defaultTolerance, ...config?.tolerance };
}

/** Predicate over config.allow globs, memoized per config. */
export function allowedNameMatcher(config: DscheckConfig): (name: string) => boolean {
  if (config.allow.length === 0) return () => false;
  const matcher = picomatch(config.allow);
  return (name) => matcher(name);
}

/** True when the config exempts this file from linting. */
export function isIgnored(filePath: string, config: DscheckConfig): boolean {
  if (config.ignore.length === 0) return false;
  const rel = relative(config.root, resolve(filePath)).replaceAll('\\', '/');
  return picomatch.isMatch(rel, config.ignore);
}

/** The resolved token file list for a config (config order, globs expanded). */
export function tokenFilesFor(config: DscheckConfig): string[] {
  return config.tokens.flatMap((pattern) =>
    globSync(pattern, { cwd: config.root, ignore: ['**/node_modules/**'] })
      .sort()
      .map((f) => join(config.root, f)),
  );
}

/** One-call convenience for adapters: config + index for the file being linted. */
export function indexFor(filePath: string): ValueIndex | undefined {
  const config = findConfig(filePath);
  if (!config || isIgnored(filePath, config)) return undefined;
  return loadIndex(config);
}
