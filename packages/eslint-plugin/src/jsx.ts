import { type CheckContext, checkDeclaration, nearestName, type Violation } from 'dscheck-core';

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
  /** Span of the fixable `root-[value]` segment within the class string. */
  fixStart?: number;
  fixEnd?: number;
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

export type EngineParse = (classes: string[]) =>
  | Array<{
      base: string;
      root: string;
      kind: 'named' | 'arbitrary' | 'static' | 'unknown';
      value?: string;
      inert: boolean;
    }>
  | undefined;

/**
 * Find off-system values inside Tailwind class strings. With a Tailwind engine
 * (target repo has tailwindcss installed) parsing is candidate-accurate and
 * fabricated utilities are caught; without one, a conservative regex handles
 * arbitrary values only. `text-[...]` is tried as font-size first, then color.
 */
export function checkClassString(
  value: string,
  ctx: CheckContext,
  engine?: EngineParse,
): ClassViolation[] {
  return engine ? checkWithEngine(value, ctx, engine) : checkWithRegex(value, ctx);
}

function checkWithRegex(value: string, ctx: CheckContext): ClassViolation[] {
  const violations: ClassViolation[] = [];
  for (const match of value.matchAll(ARBITRARY)) {
    const [, root, literal] = match as unknown as [string, string, string];
    const property = ROOT_PROPERTY.get(root);
    if (!property || literal.includes('var(')) continue;
    const offset = match.index + match[0].indexOf(`[${literal}]`) + 1;
    const segmentStart = match.index + match[0].indexOf(`${root}-[`);
    const segmentEnd = segmentStart + `${root}-[${literal}]`.length;
    pushClassViolations(violations, root, literal, property, offset, segmentStart, segmentEnd, ctx);
  }
  return violations;
}

function checkWithEngine(value: string, ctx: CheckContext, engine: EngineParse): ClassViolation[] {
  const violations: ClassViolation[] = [];
  const classTokens = [...value.matchAll(/\S+/g)].map((m) => ({ text: m[0], start: m.index }));
  if (classTokens.length === 0) return violations;
  const parsed = engine(classTokens.map((t) => t.text));
  // Engine unavailable mid-run (a target-repo plugin threw): degrade to the
  // static path rather than reporting nothing — silence would be a lie.
  if (!parsed) return checkWithRegex(value, ctx);
  classTokens.forEach((classToken, i) => {
    const info = parsed[i];
    if (!info) return;
    // A class Tailwind produces no CSS for is fabricated — the agent-typo case.
    if (info.inert && /^[\w:./-]+$/.test(classToken.text)) {
      const suggestion = suggestClass(classToken.text, ctx);
      violations.push({
        rule: 'no-unknown-class',
        value: classToken.text,
        property: '',
        matches: [],
        index: 0,
        message: `Unknown class ${classToken.text}`,
        ...(suggestion ? { suggestion } : {}),
        classIndex: classToken.start,
      });
      return;
    }
    if (info.kind !== 'arbitrary' || !info.value || info.value.includes('var(')) return;
    const property = ROOT_PROPERTY.get(info.root);
    if (!property) return;
    const segment = `${info.root}-[${info.value}]`;
    const segmentIndex = classToken.text.indexOf(segment);
    const segmentStart = classToken.start + Math.max(0, segmentIndex);
    const offset = segmentStart + info.root.length + 2;
    pushClassViolations(
      violations,
      info.root,
      info.value,
      property,
      offset,
      segmentStart,
      segmentStart + segment.length,
      ctx,
    );
  });
  return violations;
}

function pushClassViolations(
  out: ClassViolation[],
  root: string,
  literal: string,
  property: string,
  offset: number,
  segmentStart: number,
  segmentEnd: number,
  ctx: CheckContext,
): void {
  let found = checkDeclaration(property, literal, ctx);
  if (found.length === 0 && root === 'text') {
    found = checkDeclaration('color', literal, ctx);
  }
  for (const violation of found) {
    const best = violation.matches[0];
    const classFix = best?.kind === 'exact' ? utilityFor(root, best.token.name) : undefined;
    out.push({
      ...violation,
      classIndex: offset + violation.index,
      ...(classFix ? { classFix, fixStart: segmentStart, fixEnd: segmentEnd } : {}),
    });
  }
}

/** `bg-brnad` → `bg-brand`, via edit distance over the token namespace. */
function suggestClass(cls: string, ctx: CheckContext): string | undefined {
  const match = /^((?:[\w-]+:)*)([a-z][\w-]*?)-([\w-]+)$/.exec(cls);
  if (!match) return undefined;
  const [, variants, root, suffix] = match as unknown as [string, string, string, string];
  const namespace = ['bg', 'text', 'border', 'ring', 'outline', 'fill', 'stroke'].includes(root)
    ? 'color'
    : ['p', 'm', 'gap', 'px', 'py', 'mx', 'my'].includes(root)
      ? 'spacing'
      : root === 'rounded'
        ? 'radius'
        : undefined;
  if (!namespace) return undefined;
  const prefix = `--${namespace}-`;
  const [nearest] = nearestName(`${prefix}${suffix}`, ctx.index).filter(
    (m) => m.distance <= 2 && m.token.name.startsWith(prefix),
  );
  if (!nearest) return undefined;
  return `${variants}${root}-${nearest.token.name.slice(prefix.length)}`;
}
