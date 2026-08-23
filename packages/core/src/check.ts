import { parse as parseColor } from 'culori';
import valueParser from 'postcss-value-parser';
import {
  defaultTolerance,
  type Match,
  nearestColor,
  nearestLength,
  nearestName,
  type Tolerance,
} from './match.js';
import type { Category, ValueIndex } from './types.js';

export type RuleId =
  | 'no-raw-color'
  | 'no-raw-length'
  | 'no-unknown-token'
  | 'no-raw-font'
  | 'no-raw-shadow';

export interface Violation {
  rule: RuleId;
  /** The offending literal or var name. */
  value: string;
  property: string;
  matches: Match[];
  /** Character offset of `value` within the declaration's value string. */
  index: number;
  message: string;
}

export interface CheckContext {
  index: ValueIndex;
  /** Custom properties defined in the file being linted (component-local vars are fine). */
  localVars?: ReadonlySet<string>;
  tolerance?: Tolerance;
}

/** Values that are never violations, in any property. */
const ALWAYS_ALLOWED = new Set([
  '0',
  'auto',
  'none',
  'inherit',
  'initial',
  'unset',
  'revert',
  'revert-layer',
  'currentcolor',
  'transparent',
  '100%',
  '1px',
]);

const MATH_FUNCTIONS = new Set(['calc', 'clamp', 'min', 'max']);

/** Generic families and keywords that are always acceptable in font-family. */
const GENERIC_FAMILIES = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui',
  'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'math', 'emoji',
]);

const COLOR_FUNCTIONS = new Set([
  'rgb',
  'rgba',
  'hsl',
  'hsla',
  'oklch',
  'oklab',
  'lab',
  'lch',
  'hwb',
  'color',
]);

/** Properties whose bare keywords may be colors (`red`, `tan`…). Elsewhere only hex/functions count. */
const COLOR_PROPERTIES = new Set([
  'color',
  'background-color',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  'caret-color',
  'accent-color',
  'fill',
  'stroke',
  'stop-color',
  'column-rule-color',
]);

/** Property → length category to enforce. Deliberately conservative (N2). */
const LENGTH_PROPERTIES: ReadonlyMap<string, Category> = new Map([
  ...[
    'margin',
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left',
    'padding',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'gap',
    'row-gap',
    'column-gap',
    'inset',
    'top',
    'right',
    'bottom',
    'left',
    'margin-inline',
    'margin-block',
    'padding-inline',
    'padding-block',
  ].map((p) => [p, 'length'] as const),
  ...[
    'border-radius',
    'border-top-left-radius',
    'border-top-right-radius',
    'border-bottom-left-radius',
    'border-bottom-right-radius',
  ].map((p) => [p, 'radius'] as const),
  ['font-size', 'font-size'],
]);

/**
 * Check one CSS declaration against the allowed set.
 * Shared by the stylelint and eslint adapters — hosts map offsets to AST positions.
 */
export function checkDeclaration(property: string, value: string, ctx: CheckContext): Violation[] {
  const violations: Violation[] = [];
  const prop = property.toLowerCase();
  if (prop.startsWith('--')) return violations; // token definitions are not usages
  const tolerance = ctx.tolerance ?? defaultTolerance;
  const parsed = valueParser(value);

  // R5/R6 — whole-value checks for font-family, font-weight, line-height, box-shadow
  const whole = checkWholeValue(prop, value, ctx);
  if (whole) return [whole];

  parsed.walk((node) => {
    // Fluid/math expressions are deliberate: their components are not raw-value drift.
    if (node.type === 'function' && MATH_FUNCTIONS.has(node.value.toLowerCase())) {
      walkVarsOnly(node, violations, ctx);
      return false;
    }

    // R1 — unknown token references
    if (node.type === 'function' && node.value === 'var') {
      const name = node.nodes[0]?.value;
      if (name && !ctx.index.tokens.has(name) && !ctx.localVars?.has(name)) {
        violations.push({
          rule: 'no-unknown-token',
          value: name,
          property: prop,
          matches: nearestName(name, ctx.index).filter((m) => m.distance <= 3),
          index: node.sourceIndex,
          message: `Unknown token ${name}`,
        });
      }
      return false; // don't descend into fallback values
    }

    // R2 — raw colors: functions and hex anywhere; keywords only in color properties
    if (node.type === 'function' && COLOR_FUNCTIONS.has(node.value.toLowerCase())) {
      const literal = valueParser.stringify(node);
      pushColor(literal, node.sourceIndex);
      return false;
    }
    if (node.type === 'word') {
      const word = node.value;
      if (ALWAYS_ALLOWED.has(word.toLowerCase())) return;
      if (/^#[0-9a-f]{3,8}$/i.test(word)) {
        pushColor(word, node.sourceIndex);
        return;
      }
      if (COLOR_PROPERTIES.has(prop) && parseColor(word)) {
        pushColor(word, node.sourceIndex);
        return;
      }
      // R3 — raw lengths in enforced properties
      const category = LENGTH_PROPERTIES.get(prop);
      if (category && /^-?[\d.]+(px|rem|em)$/.test(word)) {
        const matches = nearestLength(word, ctx.index, category);
        if (matches.length === 0) return; // no tokens of this kind → nothing to enforce
        violations.push({
          rule: 'no-raw-length',
          value: word,
          property: prop,
          matches,
          index: node.sourceIndex,
          message: `Raw length ${word} in ${prop}`,
        });
      }
    }
    return;
  });

  function pushColor(literal: string, sourceIndex: number): void {
    const matches = nearestColor(literal, ctx.index, tolerance);
    if (matches.length === 0) return; // unparseable or no color tokens → not our business
    violations.push({
      rule: 'no-raw-color',
      value: literal,
      property: prop,
      matches,
      index: sourceIndex,
      message: `Raw color ${literal}`,
    });
  }

  return violations;
}

/** Inside math functions, still validate token references — just not the literals. */
function walkVarsOnly(
  fn: valueParser.FunctionNode,
  violations: Violation[],
  ctx: CheckContext,
): void {
  valueParser.walk(fn.nodes, (node) => {
    if (node.type !== 'function' || node.value !== 'var') return;
    const name = node.nodes[0]?.value;
    if (name && !ctx.index.tokens.has(name) && !ctx.localVars?.has(name)) {
      violations.push({
        rule: 'no-unknown-token',
        value: name,
        property: '',
        matches: nearestName(name, ctx.index).filter((m) => m.distance <= 3),
        index: node.sourceIndex,
        message: `Unknown token ${name}`,
      });
    }
  });
}

/** R5/R6: properties judged as a whole value rather than literal-by-literal. */
function checkWholeValue(prop: string, value: string, ctx: CheckContext): Violation | undefined {
  const trimmed = value.trim();
  if (trimmed.includes('var(') || ALWAYS_ALLOWED.has(trimmed.toLowerCase())) return undefined;

  if (prop === 'font-family') {
    const families = trimmed.split(',').map((f) => f.trim().replace(/^['"]|['"]$/g, ''));
    if (families.every((f) => GENERIC_FAMILIES.has(f.toLowerCase()))) return undefined;
    const tokens = ctx.index.byCategory('font-family');
    if (tokens.length === 0) return undefined;
    const exact = tokens.find((t) => normalizeFamily(t.value) === normalizeFamily(trimmed));
    return {
      rule: 'no-raw-font',
      value: trimmed,
      property: prop,
      matches: (exact ? [exact] : tokens.slice(0, 3)).map((token) => ({
        token,
        distance: exact ? 0 : 1,
        kind: exact ? ('exact' as const) : ('nearest' as const),
      })),
      index: 0,
      message: `Raw font stack in ${prop}`,
    };
  }

  if (prop === 'font-weight' && /^[1-9]00$/.test(trimmed)) {
    const tokens = ctx.index.byCategory('font-weight');
    if (tokens.length === 0) return undefined;
    const matches: Match[] = tokens
      .map((token) => ({
        token,
        distance: Math.abs(Number(token.value) - Number(trimmed)),
        kind: token.value === trimmed ? ('exact' as const) : ('nearest' as const),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
    return {
      rule: 'no-raw-font',
      value: trimmed,
      property: prop,
      matches,
      index: 0,
      message: `Raw font-weight ${trimmed}`,
    };
  }

  if (prop === 'box-shadow') {
    const tokens = ctx.index.byCategory('shadow');
    if (tokens.length === 0) return undefined;
    const target = shadowVector(trimmed);
    const matches: Match[] = tokens
      .map((token) => {
        const distance = vectorDistance(target, shadowVector(token.value));
        return {
          token,
          distance,
          kind: distance === 0 ? ('exact' as const) : ('nearest' as const),
        };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
    return {
      rule: 'no-raw-shadow',
      value: trimmed,
      property: prop,
      matches,
      index: 0,
      message: 'Raw box-shadow',
    };
  }

  return undefined;
}

function normalizeFamily(stack: string): string {
  return stack.toLowerCase().replaceAll(/['"\s]/g, '');
}

/** Numeric fingerprint of a shadow: every px number in order. */
function shadowVector(shadow: string): number[] {
  return [...shadow.matchAll(/(-?[\d.]+)px/g)].map((m) => Number(m[1]));
}

function vectorDistance(a: number[], b: number[]): number {
  const length = Math.max(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < length; i++) sum += Math.abs((a[i] ?? 0) - (b[i] ?? 0));
  return sum;
}

/** Human/agent-facing one-liner with the best suggestion attached. */
export function formatViolation(v: Violation): string {
  const best = v.matches[0];
  if (!best)
    return `${v.message} — no ${v.rule === 'no-unknown-token' ? 'similar token' : 'token'} found`;
  const hint =
    v.rule === 'no-raw-color'
      ? `use var(${best.token.name}) (ΔEOK ${best.distance.toFixed(3)})`
      : v.rule === 'no-raw-length'
        ? `use var(${best.token.name}) (${best.token.value}${best.distance === 0 ? '' : `, Δ${best.distance}px`})`
        : v.rule === 'no-unknown-token'
          ? `did you mean ${best.token.name}?`
          : `use var(${best.token.name})${best.kind === 'exact' ? ' (identical)' : ''}`;
  return `${v.message} — ${hint}`;
}
