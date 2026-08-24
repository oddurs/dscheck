import {
  allowedNameMatcher,
  type CheckContext,
  checkDeclaration,
  findConfig,
  formatViolation,
  indexFor,
  type RuleId,
  toleranceFor,
  type Violation,
} from 'dscheck-core';
import type { Declaration, Root } from 'postcss';
import stylelint, { type PostcssResult, type Rule } from 'stylelint';

const NAMESPACE = 'dscheck';
const RULES: RuleId[] = [
  'no-raw-color',
  'no-raw-length',
  'no-unknown-token',
  'no-raw-font',
  'no-raw-shadow',
  'token-role',
];

/**
 * Three stylelint rules over one shared walk: each rule filters the shared
 * checker's findings to its own id, so severities stay independently
 * configurable while the token index is resolved once per file.
 */
function createRule(ruleId: RuleId): Rule {
  const ruleName = `${NAMESPACE}/${ruleId}`;
  const messages = stylelint.utils.ruleMessages(ruleName, {
    rejected: (text: string) => text,
  });

  const rule = ((enabled: unknown) => {
    return (root: Root, result: PostcssResult) => {
      if (!enabled) return;
      const file = root.source?.input.file;
      if (!file) return;
      const index = indexFor(file);
      if (!index) return; // no design system found — nothing to enforce

      const localVars = new Set<string>();
      root.walkDecls(/^--/, (decl: Declaration) => {
        localVars.add(decl.prop);
      });
      const config = findConfig(file);
      const ctx: CheckContext = {
        index,
        localVars,
        tolerance: toleranceFor(config),
        ...(config ? { isAllowedName: allowedNameMatcher(config) } : {}),
      };

      root.walkDecls((decl: Declaration) => {
        // Offsets are relative to the declaration value at report time: after
        // one fix mutates it, every later offset is stale. One fix per
        for (const violation of checkDeclaration(decl.prop, decl.value, ctx)) {
          if (violation.rule !== ruleId) continue;
          const best = violation.matches[0];
          stylelint.utils.report({
            message: messages.rejected(formatViolation(violation)),
            node: decl,
            index: declarationValueIndex(decl) + violation.index,
            endIndex: declarationValueIndex(decl) + violation.index + violation.value.length,
            result,
            ruleName,
            ...(best?.kind === 'exact'
              ? {
                  // Offsets captured at report time go stale once any fix has
                  // mutated the value — so each fix RECOMPUTES against the
                  // current value and applies the leftmost remaining exact
                  // match. k reported violations → k callbacks → k fixes,
                  // always at fresh offsets, idempotent by construction.
                  fix: () => {
                    const fresh = checkDeclaration(decl.prop, decl.value, ctx).find(
                      (v) => v.rule === ruleId && v.matches[0]?.kind === 'exact',
                    );
                    const freshBest = fresh?.matches[0];
                    if (!fresh || !freshBest) return;
                    decl.value =
                      decl.value.slice(0, fresh.index) +
                      `var(${freshBest.token.name})` +
                      decl.value.slice(fresh.index + fresh.value.length);
                  },
                }
              : {}),
          });
        }
      });
    };
  }) as unknown as Rule;

  rule.ruleName = ruleName;
  rule.messages = messages;
  rule.meta = {
    url: `https://github.com/oddurs/dscheck/blob/main/docs-site/src/content/docs/rules/${ruleId}.md`,
    fixable: true,
  };
  return rule;
}

function declarationValueIndex(decl: Declaration): number {
  const between = decl.raws.between ?? ': ';
  return decl.prop.length + between.length;
}

const rules = RULES.map((id) => stylelint.createPlugin(`${NAMESPACE}/${id}`, createRule(id)));

export default rules;

/** Everything on, error severity — the strict starting point. */
export const configs = {
  recommended: {
    plugins: ['stylelint-dscheck'],
    rules: {
      'dscheck/no-raw-color': true,
      'dscheck/no-unknown-token': true,
      'dscheck/no-raw-length': [true, { severity: 'warning' }],
      'dscheck/no-raw-font': [true, { severity: 'warning' }],
      'dscheck/no-raw-shadow': [true, { severity: 'warning' }],
      'dscheck/token-role': [true, { severity: 'warning' }],
    },
  },
};
