import { type CheckContext, checkDeclaration, type Violation } from '@dscheck/core';

/** camelCase style-object key → CSS property. */
export function toCssProperty(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

/** Style-object props where React treats a bare number as px. */
const UNITLESS = new Set([
  'line-height',
  'font-weight',
  'opacity',
  'z-index',
  'flex',
  'flex-grow',
  'flex-shrink',
  'order',
  'zoom',
  'aspect-ratio',
  'scale',
]);

/** Check one `style={{ key: value }}` entry. */
export function checkStyleEntry(key: string, raw: string | number, ctx: CheckContext): Violation[] {
  const property = toCssProperty(key);
  const value =
    typeof raw === 'number' && !UNITLESS.has(property) && raw !== 0 ? `${raw}px` : String(raw);
  return checkDeclaration(property, value, ctx);
}

/** Tailwind roots we can safely map to a CSS property for arbitrary values. */
const ROOT_PROPERTY: ReadonlyMap<string, string> = new Map([
  ...['p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'ps', 'pe'].map((r) => [r, 'padding'] as const),
  ...['m', 'mx', 'my', 'mt', 'mr', 'mb', 'ml', 'ms', 'me'].map((r) => [r, 'margin'] as const),
  ['gap', 'gap'],
  ['gap-x', 'column-gap'],
  ['gap-y', 'row-gap'],
  ['inset', 'inset'],
  ['top', 'top'],
  ['right', 'right'],
  ['bottom', 'bottom'],
  ['left', 'left'],
  ['rounded', 'border-radius'],
  ['text', 'font-size'],
  ['bg', 'background-color'],
  ['border', 'border-color'],
  ['ring', 'outline-color'],
  ['outline', 'outline-color'],
  ['fill', 'fill'],
  ['stroke', 'stroke'],
  ['caret', 'caret-color'],
  ['accent', 'accent-color'],
  ['decoration', 'text-decoration-color'],
]);

export interface ClassViolation extends Violation {
  /** Offset of the arbitrary value within the class string. */
  classIndex: number;
  /** The on-theme utility class, when the match is exact — e.g. `p-3` for `p-[12px]`. */
  classFix?: string;
}

/** Utility class equivalent of a token, per Tailwind v4 namespace conventions. */
function utilityFor(root: string, tokenName: string): string | undefined {
  const suffix = /^--(?:color|spacing|text|font-weight|radius|shadow|leading|tracking)-(.+)$/.exec(
    tokenName,
  )?.[1];
  if (!suffix) return undefined;
  return `${root}-${suffix}`;
}

const ARBITRARY = /(?:^|[\s"'`])(?:[\w-]+:)*([a-z][\w.-]*)-\[([^\]]+)\]/g;

/**
 * Find off-system literals inside Tailwind arbitrary values in a class string.
 * Conservative by design: only roots we can map to a property are checked,
 * and `text-[...]` is tried as font-size first, then as color.
 */
export function checkClassString(value: string, ctx: CheckContext): ClassViolation[] {
  const violations: ClassViolation[] = [];
  for (const match of value.matchAll(ARBITRARY)) {
    const [, root, literal] = match as unknown as [string, string, string];
    const property = ROOT_PROPERTY.get(root);
    if (!property || literal.includes('var(')) continue;
    const offset = match.index + match[0].indexOf(`[${literal}]`) + 1;
    let found = checkDeclaration(property, literal, ctx);
    if (found.length === 0 && root === 'text') {
      found = checkDeclaration('color', literal, ctx);
    }
    for (const violation of found) {
      const best = violation.matches[0];
      const classFix = best?.kind === 'exact' ? utilityFor(root, best.token.name) : undefined;
      violations.push({
        ...violation,
        classIndex: offset + violation.index,
        ...(classFix ? { classFix } : {}),
      });
    }
  }
  return violations;
}
