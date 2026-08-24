import { readFileSync } from 'node:fs';

import postcss, { type Declaration } from 'postcss';
import valueParser from 'postcss-value-parser';
import { safeParseColor } from './match.js';
import { tailwindDefaultTheme } from './tailwind-theme.js';
import { type Category, createIndex, type Token, type ValueIndex } from './types.js';

/**
 * Static CSS token source: collects custom properties from `@theme` blocks
 * (Tailwind v4, including `@theme inline`) and `:root` rules, resolves
 * `var()` alias chains, and classifies each token into a category.
 *
 * This is the fallback-and-foundation loader — it needs no Tailwind install
 * and no network, and handles the common real-world shape where `@theme
 * inline` aliases point at `:root` values.
 */
export function loadCssTokens(files: string[]): ValueIndex {
  const declared = new Map<string, { raw: string; source: string; fromTheme: boolean }>();
  /** raw values declared in mode scopes (`.dark`, `[data-theme=…]`, media-wrapped :root). */
  const modeDeclared = new Map<string, Set<string>>();
  const modeCandidates: Array<{ name: string; raw: string; source: string; themed: boolean }> = [];
  const conflicts = new Map<string, { values: string[]; sources: string[] }>();
  let importsTailwind = false;

  for (const file of files) {
    const css = readFileSync(file, 'utf8');
    importsTailwind ||= /@import\s+['"]tailwindcss/.test(css);
    const root = postcss.parse(css, { from: file });
    root.walkDecls(/^--/, (decl: Declaration) => {
      const inTheme = isInTheme(decl);
      const inRoot = isInRoot(decl);
      if (inTheme || inRoot) {
        // Last declaration wins, but a @theme declaration marks the name as
        // part of the design-system API even if :root re-declares the value.
        const prev = declared.get(decl.prop);
        if (prev && prev.raw !== decl.value && stripVar(prev.raw) !== stripVar(decl.value)) {
          const entry = conflicts.get(decl.prop) ?? {
            values: [prev.raw],
            sources: [prev.source],
          };
          entry.values.push(decl.value);
          entry.sources.push(file);
          conflicts.set(decl.prop, entry);
        }
        declared.set(decl.prop, {
          raw: decl.value,
          source: file,
          fromTheme: inTheme || prev?.fromTheme === true,
        });
        return;
      }
      const scope = modeScopeKind(decl);
      if (scope !== 'none') {
        modeCandidates.push({
          name: decl.prop,
          raw: decl.value,
          source: file,
          themed: scope === 'themed',
        });
      }
    });
  }

  // Mode values attach only to names the system anchors in :root/@theme — a bare
  // `.button { --gap: 4px }` stays a component var. Explicit theme selectors
  // (.dark, [data-theme=…]) may introduce names on their own.
  for (const { name, raw, source, themed } of modeCandidates) {
    if (!declared.has(name)) {
      if (!themed) continue;
      declared.set(name, { raw, source, fromTheme: false });
      continue;
    }
    const values = modeDeclared.get(name) ?? new Set<string>();
    values.add(raw);
    modeDeclared.set(name, values);
  }

  // `@import "tailwindcss"` brings the whole default theme; repo tokens override it.
  if (importsTailwind) {
    for (const [name, raw] of Object.entries(tailwindDefaultTheme)) {
      if (!declared.has(name)) declared.set(name, { raw, source: 'tailwindcss', fromTheme: true });
    }
  }

  const tokens: Token[] = [];
  for (const [name, { raw, source }] of declared) {
    const { value, unresolved } = resolveValue(raw, declared);
    const aliasOf = immediateAlias(raw);
    const modeValues = [...(modeDeclared.get(name) ?? [])]
      .map((modeRaw) => resolveValue(modeRaw, declared).value)
      .filter((v) => v !== value);
    tokens.push({
      name,
      value,
      category: classify(name, value),
      source,
      ...(aliasOf ? { aliasOf } : {}),
      ...(unresolved ? { unresolved: true } : {}),
      ...(modeValues.length > 0 ? { modeValues } : {}),
    });
  }
  const index = createIndex(tokens);
  index.diagnostics = {
    conflicts: [...conflicts].map(([name, c]) => ({ name, ...c })),
    unresolved: tokens.filter((t) => t.unresolved).map((t) => t.name),
    danglingAliases: tokens.filter((t) => t.aliasOf && !declared.has(t.aliasOf)).map((t) => t.name),
  };
  return index;
}

/** `var(--x)` → `--x`, so an alias vs its target's value is not a conflict. */
function stripVar(raw: string): string {
  return raw.trim().replace(/^var\((--[\w-]+)\)$/, '$1');
}

/**
 * Mode scopes hold per-theme values for system tokens: `.dark { --bg: … }`,
 * `[data-theme='sepia'] { … }`, `:root` inside a media query, `:root.dark`.
 * 'themed' scopes (recognisably theme-flavoured selectors) may introduce new
 * token names; other bare custom-prop-only rules may only re-value known ones.
 */
function modeScopeKind(decl: Declaration): 'themed' | 'bare' | 'none' {
  const parent = decl.parent;
  if (parent?.type !== 'rule') return 'none';
  const selector = (parent as postcss.Rule).selector;
  if (/(:root|\bhtml\b)/.test(selector)) return 'themed'; // compound/media-nested root
  if (
    /^\s*(\.(dark|light|theme-[\w-]+)|\[data-(theme|mode|color-scheme)[^\]]*\])\s*$/.test(selector)
  ) {
    return 'themed';
  }
  const bareScope = /^\s*(\.[\w-]+|\[[^\]]+\])\s*$/.test(selector);
  if (!bareScope) return 'none';
  let allCustom = true;
  (parent as postcss.Rule).walkDecls((d) => {
    if (!d.prop.startsWith('--')) allCustom = false;
  });
  return allCustom ? 'bare' : 'none';
}

function isInTheme(decl: Declaration): boolean {
  for (let node = decl.parent; node; node = node.parent as typeof node) {
    if (node.type === 'atrule' && (node as postcss.AtRule).name === 'theme') return true;
  }
  return false;
}

function isInRoot(decl: Declaration): boolean {
  const parent = decl.parent;
  if (parent?.type !== 'rule') return false;
  if (!/(^|,)\s*(:root|html)\s*(,|$)/.test((parent as postcss.Rule).selector)) return false;
  // `:root` inside @media/@supports/@container holds *mode* values, not the primary.
  for (let node = parent.parent; node; node = node.parent as typeof node) {
    if (
      node.type === 'atrule' &&
      /^(media|supports|container)$/.test((node as postcss.AtRule).name)
    ) {
      return false;
    }
  }
  return true;
}

/** Follow `var(--x)` chains to a literal, using declared values; cap depth to break cycles. */
function resolveValue(
  raw: string,
  declared: ReadonlyMap<string, { raw: string }>,
  depth = 0,
): { value: string; unresolved: boolean } {
  if (depth > 16) return { value: raw, unresolved: true };
  let unresolved = false;
  const parsed = valueParser(raw);
  parsed.walk((node) => {
    if (node.type !== 'function' || node.value !== 'var') return;
    const target = node.nodes[0]?.value;
    const referenced = target ? declared.get(target) : undefined;
    if (referenced) {
      const inner = resolveValue(referenced.raw, declared, depth + 1);
      unresolved ||= inner.unresolved;
      replaceNode(node, inner.value);
    } else {
      // Unknown var: use its fallback if present, else leave unresolved.
      const fallback = node.nodes.slice(2); // [name, div(','), ...fallback]
      if (fallback.length > 0) {
        replaceNode(node, valueParser.stringify(fallback));
      } else {
        unresolved = true;
      }
    }
    return false;
  });
  return { value: parsed.toString().trim(), unresolved };
}

function replaceNode(node: valueParser.FunctionNode, replacement: string): void {
  const mutable = node as unknown as { type: string; value: string; nodes?: unknown[] };
  mutable.type = 'word';
  mutable.value = replacement;
  mutable.nodes = [];
}

function immediateAlias(raw: string): string | undefined {
  const match = /^var\((--[\w-]+)\)$/.exec(raw.trim());
  return match?.[1];
}

/** Tailwind v4 theme namespaces, most specific first. */
const NAMESPACES: ReadonlyArray<readonly [RegExp, Category]> = [
  [/^--color-/, 'color'],
  [/^--spacing(-|$)/, 'length'],
  [/^--radius(-|$)/, 'radius'],
  [/^--text-[\w-]+--line-height$/, 'line-height'],
  [/^--text-/, 'font-size'],
  [/^--font-weight-/, 'font-weight'],
  [/^--font-/, 'font-family'],
  [/^--leading-/, 'line-height'],
  [/^--tracking-/, 'letter-spacing'],
  [/^--(?:inset-)?shadow(-|$)|^--drop-shadow(-|$)/, 'shadow'],
  [/^--ease-/, 'easing'],
  [/^--animate-|^--duration-/, 'duration'],
];

/** Re-classify a token whose category is unknown (TS-object sources). */
export function classifyToken(token: Token): Token {
  return token.category === 'other'
    ? { ...token, category: classify(token.name, token.value) }
    : token;
}

function classify(name: string, value: string): Category {
  for (const [pattern, category] of NAMESPACES) {
    if (pattern.test(name)) return category;
  }
  return classifyByValue(value);
}

function classifyByValue(value: string): Category {
  if (safeParseColor(value) !== undefined) return 'color';
  if (/^-?[\d.]+(px|rem|em|%|vh|vw|ch|svh|dvh)$/.test(value)) return 'length';
  if (/^[\d.]+m?s$/.test(value)) return 'duration';
  if (/^cubic-bezier\(|^linear\(|^(ease|ease-in|ease-out|ease-in-out)$/.test(value))
    return 'easing';
  return 'other';
}
