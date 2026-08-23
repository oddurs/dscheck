import { differenceEuclidean, parse as parseColor } from 'culori';
import type { Category, Token, ValueIndex } from './types.js';

export interface Match {
  token: Token;
  /** ΔEOK for colors, px for lengths, edit distance for names. */
  distance: number;
  /** exact: safe to autofix. close: suggest confidently. nearest: informational. */
  kind: 'exact' | 'close' | 'nearest';
}

export interface Tolerance {
  /** ΔEOK at or below which a color match is `exact` (autofixable). */
  colorExact: number;
  /** ΔEOK at or below which a color match is `close`. */
  colorClose: number;
}

export const defaultTolerance: Tolerance = { colorExact: 0.005, colorClose: 0.03 };

const deltaEOKBase = differenceEuclidean('oklab');

/** ΔEOK plus an alpha term — a translucent value must not "match" its opaque twin. */
function deltaEOK(
  a: NonNullable<ReturnType<typeof parseColor>>,
  b: NonNullable<ReturnType<typeof parseColor>>,
): number {
  return deltaEOKBase(a, b) + Math.abs((a.alpha ?? 1) - (b.alpha ?? 1));
}

/** Nearest color tokens for a literal, best first. Empty when the literal doesn't parse. */
export function nearestColor(
  value: string,
  index: ValueIndex,
  tolerance: Tolerance = defaultTolerance,
  limit = 3,
): Match[] {
  const target = parseColor(value);
  if (!target) return [];
  const matches: Match[] = [];
  for (const token of index.byCategory('color')) {
    const candidate = parseColor(token.value);
    if (!candidate) continue;
    const distance = deltaEOK(target, candidate);
    const kind =
      distance <= tolerance.colorExact
        ? 'exact'
        : distance <= tolerance.colorClose
          ? 'close'
          : 'nearest';
    matches.push({ token, distance, kind });
  }
  return top(matches, limit);
}

const LENGTH_UNITS: Record<string, number> = { px: 1, rem: 16, em: 16 };

/** A CSS length literal in px, or undefined when not statically convertible. */
export function toPx(value: string): number | undefined {
  const match = /^(-?[\d.]+)(px|rem|em)$/.exec(value.trim());
  if (!match) return value.trim() === '0' ? 0 : undefined;
  const unit = LENGTH_UNITS[match[2] as string];
  return unit === undefined ? undefined : Number(match[1]) * unit;
}

/** Nearest length-ish tokens (length, radius, font-size…) for a literal, best first. */
export function nearestLength(
  value: string,
  index: ValueIndex,
  category: Category,
  limit = 3,
): Match[] {
  const target = toPx(value);
  if (target === undefined) return [];
  const matches: Match[] = [];
  for (const token of index.byCategory(category)) {
    const candidate = toPx(token.value);
    if (candidate === undefined) continue;
    const distance = Math.abs(candidate - target);
    matches.push({ token, distance, kind: distance === 0 ? 'exact' : 'nearest' });
  }
  return top(matches, limit);
}

/** Nearest token names by edit distance — for `var(--typo)` suggestions. */
export function nearestName(name: string, index: ValueIndex, limit = 3): Match[] {
  const matches: Match[] = [];
  for (const token of index.tokens.values()) {
    const distance = levenshtein(name, token.name);
    matches.push({ token, distance, kind: 'nearest' });
  }
  return top(matches, limit);
}

function top(matches: Match[], limit: number): Match[] {
  return matches.sort((a, b) => a.distance - b.distance).slice(0, limit);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const current = [i];
    for (let j = 1; j <= n; j++) {
      current[j] = Math.min(
        (prev[j] as number) + 1,
        (current[j - 1] as number) + 1,
        (prev[j - 1] as number) + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = current;
  }
  return prev[n] as number;
}
