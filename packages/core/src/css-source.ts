import { readFileSync } from 'node:fs';
import postcss, { type Declaration } from 'postcss';
import valueParser from 'postcss-value-parser';
import { parse as parseColor } from 'culori';
import { type Category, type Token, type ValueIndex, createIndex } from './types.js';

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

  for (const file of files) {
    const root = postcss.parse(readFileSync(file, 'utf8'), { from: file });
    root.walkDecls(/^--/, (decl: Declaration) => {
      const inTheme = isInTheme(decl);
      const inRoot = isInRoot(decl);
      if (!inTheme && !inRoot) return;
      // Last declaration wins, but a @theme declaration marks the name as
      // part of the design-system API even if :root re-declares the value.
      const prev = declared.get(decl.prop);
      declared.set(decl.prop, {
        raw: decl.value,
        source: file,
        fromTheme: inTheme || prev?.fromTheme === true,
      });
    });
  }

  const tokens: Token[] = [];
  for (const [name, { raw, source }] of declared) {
    const { value, unresolved } = resolveValue(raw, declared);
    const aliasOf = immediateAlias(raw);
    tokens.push({
      name,
      value,
      category: classify(name, value),
      source,
      ...(aliasOf ? { aliasOf } : {}),
      ...(unresolved ? { unresolved: true } : {}),
    });
  }
  return createIndex(tokens);
}

function isInTheme(decl: Declaration): boolean {
  for (let node = decl.parent; node; node = node.parent as typeof node) {
    if (node.type === 'atrule' && (node as postcss.AtRule).name === 'theme') return true;
  }
  return false;
}

function isInRoot(decl: Declaration): boolean {
  const parent = decl.parent;
  return (
    parent?.type === 'rule' &&
    /(^|,)\s*(:root|html)\s*(,|$)/.test((parent as postcss.Rule).selector)
  );
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

function classify(name: string, value: string): Category {
  for (const [pattern, category] of NAMESPACES) {
    if (pattern.test(name)) return category;
  }
  return classifyByValue(value);
}

function classifyByValue(value: string): Category {
  if (parseColor(value) !== undefined) return 'color';
  if (/^-?[\d.]+(px|rem|em|%|vh|vw|ch|svh|dvh)$/.test(value)) return 'length';
  if (/^[\d.]+m?s$/.test(value)) return 'duration';
  if (/^cubic-bezier\(|^linear\(|^(ease|ease-in|ease-out|ease-in-out)$/.test(value)) return 'easing';
  return 'other';
}
