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
} from '@dscheck/core';
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
        for (const violation of checkDeclaration(decl.prop, decl.value, ctx)) {
          if (violation.rule !== ruleId) continue;
          const best = violation.matches[0];
          const fixable = best?.kind === 'exact';
          stylelint.utils.report({
            message: messages.rejected(formatViolation(violation)),
            node: decl,
            index: declarationValueIndex(decl) + violation.index,
            endIndex: declarationValueIndex(decl) + violation.index + violation.value.length,
            result,
            ruleName,
            ...(fixable && best
              ? {
                  fix: () => {
                    decl.value =
                      decl.value.slice(0, violation.index) +
                      `var(${best.token.name})` +
                      decl.value.slice(violation.index + violation.value.length);
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
    plugins: ['@dscheck/stylelint-plugin'],
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
