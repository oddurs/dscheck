import { readFileSync } from 'node:fs';
import type { Category, Token } from './types.js';

/**
 * DTCG (Design Tokens Community Group, 2025.10) JSON source.
 * Accepts the spec's `$value`/`$type` keys and Tokens Studio's legacy
 * `value`/`type` dialect. `{group.token}` aliases resolve with cycle
 * detection; `$type` inherits down groups; `$extensions.dscheck.roles`
 * (or Tokens Studio-style extensions) attach roles.
 */
export function loadDtcgTokens(files: string[]): Token[] {
  const raw = new Map<string, RawToken>();
  for (const file of files) {
    const json = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    collect(json, [], undefined, [], file, raw);
  }

  const tokens: Token[] = [];
  for (const [path, entry] of raw) {
    const { value, unresolved } = resolveRef(entry, raw, new Set([path]));
    const name = `--${path.replaceAll('.', '-')}`;
    const aliasOf =
      typeof entry.value === 'string' && REF.test(entry.value.trim())
        ? `--${entry.value.trim().slice(1, -1).replaceAll('.', '-')}`
        : undefined;
    const modeValues = (entry.modeRaws ?? [])
      .map(
        (modeRaw) =>
          resolveRef({ ...entry, value: modeRaw, modeRaws: [] }, raw, new Set([path])).value,
      )
      .filter((v) => v !== value);
    tokens.push({
      name,
      value,
      category: categoryFor(entry.type, name, value),
      source: entry.source,
      ...(aliasOf ? { aliasOf } : {}),
      ...(unresolved ? { unresolved: true } : {}),
      ...(entry.roles && entry.roles.length > 0 ? { roles: entry.roles } : {}),
      ...(modeValues.length > 0 ? { modeValues } : {}),
    });
  }
  return tokens;
}

interface RawToken {
  value: unknown;
  type: string | undefined;
  roles: string[] | undefined;
  source: string;
  /** Values from later files re-declaring this path (light.json + dark.json). */
  modeRaws?: unknown[];
}

const REF = /^\{[\w.-]+\}$/;
const META_KEYS = new Set([
  '$schema',
  '$metadata',
  '$themes',
  '$description',
  '$extensions',
  '$type',
  '$value',
]);

function collect(
  node: Record<string, unknown>,
  path: string[],
  inheritedType: string | undefined,
  inheritedRoles: string[],
  source: string,
  out: Map<string, RawToken>,
): void {
  const type = (node.$type ?? node.type) as string | undefined;
  const roles = rolesOf(node) ?? inheritedRoles;
  const value = node.$value ?? (isLegacyToken(node) ? node.value : undefined);

  if (value !== undefined) {
    const key = path.join('.');
    const existing = out.get(key);
    if (existing) {
      // A later file re-declaring a token holds a mode value (dark theme).
      if (JSON.stringify(existing.value) !== JSON.stringify(value)) {
        existing.modeRaws = [...(existing.modeRaws ?? []), value];
      }
      return;
    }
    out.set(key, {
      value,
      type: type ?? inheritedType,
      roles: roles.length > 0 ? roles : undefined,
      source,
    });
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (META_KEYS.has(key) || key.startsWith('$')) continue;
    if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
      collect(
        child as Record<string, unknown>,
        [...path, key],
        type ?? inheritedType,
        roles,
        source,
        out,
      );
    }
  }
}

/** Tokens Studio legacy dialect: `{ value, type }` without `$`. */
function isLegacyToken(node: Record<string, unknown>): boolean {
  return 'value' in node && ('type' in node || typeof node.value !== 'object');
}

function rolesOf(node: Record<string, unknown>): string[] | undefined {
  const ext = node.$extensions as { dscheck?: { roles?: string[] } } | undefined;
  return ext?.dscheck?.roles;
}

function resolveRef(
  entry: RawToken,
  raw: ReadonlyMap<string, RawToken>,
  seen: Set<string>,
): { value: string; unresolved: boolean } {
  const value = entry.value;
  if (typeof value === 'string' && REF.test(value.trim())) {
    const target = value.trim().slice(1, -1);
    const referenced = raw.get(target);
    if (!referenced || seen.has(target)) return { value: value.trim(), unresolved: true };
    seen.add(target);
    return resolveRef(referenced, raw, seen);
  }
  return { value: serialize(value, entry.type), unresolved: false };
}

/** Composite and structured $values → their CSS text. */
function serialize(value: unknown, type: string | undefined): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    if (type === 'fontFamily') return value.join(', ');
    if (type === 'cubicBezier') return `cubic-bezier(${value.join(', ')})`;
    if (type === 'shadow') return value.map((s) => serialize(s, 'shadow')).join(', ');
    return value.map((v) => serialize(v, type)).join(' ');
  }
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if ('value' in obj && 'unit' in obj) return `${obj.value}${obj.unit}`; // dimension/duration
    if (type === 'shadow' || 'offsetX' in obj) {
      const part = (v: unknown) => serialize(v, undefined);
      const inset = obj.inset ? 'inset ' : '';
      return `${inset}${part(obj.offsetX)} ${part(obj.offsetY)} ${part(obj.blur ?? '0')} ${part(obj.spread ?? '0')} ${part(obj.color ?? '')}`.trim();
    }
    if (type === 'typography') {
      // composite typography is informational; keep a stable serialization
      return Object.entries(obj)
        .map(([k, v]) => `${k}:${serialize(v, undefined)}`)
        .join('; ');
    }
  }
  return String(value);
}

const TYPE_CATEGORY: Record<string, Category> = {
  color: 'color',
  dimension: 'length',
  fontFamily: 'font-family',
  fontWeight: 'font-weight',
  duration: 'duration',
  cubicBezier: 'easing',
  shadow: 'shadow',
  number: 'other',
  typography: 'other',
};

function categoryFor(type: string | undefined, name: string, value: string): Category {
  // Name namespaces are more specific than $type (dimension → radius/font-size…).
  if (/^--radius/.test(name)) return 'radius';
  if (/^--(text|font-size)/.test(name)) return 'font-size';
  if (/^--(leading|line-height)/.test(name)) return 'line-height';
  if (/^--(tracking|letter-spacing)/.test(name)) return 'letter-spacing';
  if (type && TYPE_CATEGORY[type]) return TYPE_CATEGORY[type] as Category;
  // Fall back to value-shape classification via the css loader's rules.
  if (/^-?[\d.]+(px|rem|em)$/.test(value)) return 'length';
  if (/^#|^oklch|^rgb|^hsl/.test(value)) return 'color';
  return 'other';
}
