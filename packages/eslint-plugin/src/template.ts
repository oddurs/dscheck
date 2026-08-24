import { type CheckContext, checkDeclaration, type Violation } from '@dscheck/core';

export interface TemplateViolation extends Violation {
  /** Absolute source offset where the offending value starts. */
  sourceIndex: number;
  /** Absolute source span of the whole declaration value (for exact-fix). */
  valueStart: number;
  valueEnd: number;
}

interface Quasi {
  /** Static text of this chunk. */
  text: string;
  /** Absolute source offset where the text begins. */
  sourceStart: number;
}

const DECLARATION = /([a-zA-Z-]{2,})\s*:\s*([^;{}]+)/g;
const PLACEHOLDER = ' expr ';

/**
 * Check the static CSS inside a tagged template (styled.div`…`, css`…`).
 * Interpolations become placeholders; any declaration touched by one is
 * skipped entirely — dscheck never guesses at dynamic values. Declarations
 * whose value sits inside a single static chunk map back to exact source
 * positions, so findings and fixes are editor-accurate.
 */
export function checkTemplate(quasis: Quasi[], ctx: CheckContext): TemplateViolation[] {
  const combined = quasis.map((q) => q.text).join(PLACEHOLDER);

  // Component-local custom properties defined inside this template are fine.
  const localVars = new Set<string>(ctx.localVars ?? []);
  for (const match of combined.matchAll(/(--[\w-]+)\s*:/g)) {
    localVars.add(match[1] as string);
  }
  const templateCtx: CheckContext = { ...ctx, localVars };

  const violations: TemplateViolation[] = [];
  for (const match of combined.matchAll(DECLARATION)) {
    const [, property, value] = match as unknown as [string, string, string];
    if (value.includes(PLACEHOLDER) || property.startsWith('--')) continue;
    const valueOffset = match.index + match[0].indexOf(value, property.length);
    const source = toSource(quasis, valueOffset, value.length);
    if (!source) continue; // spans chunks — never guess
    for (const violation of checkDeclaration(property.toLowerCase(), value.trim(), templateCtx)) {
      violations.push({
        ...violation,
        sourceIndex: source.start + violation.index,
        valueStart: source.start,
        valueEnd: source.start + value.length,
      });
    }
  }
  return violations;
}

/** Map a combined-text span back to one quasi's absolute source range. */
function toSource(quasis: Quasi[], offset: number, length: number): { start: number } | undefined {
  let cursor = 0;
  for (const quasi of quasis) {
    const end = cursor + quasi.text.length;
    if (offset >= cursor && offset + length <= end) {
      return { start: quasi.sourceStart + (offset - cursor) };
    }
    cursor = end + PLACEHOLDER.length;
  }
  return undefined;
}
