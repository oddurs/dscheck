import { resolve } from 'node:path';
import { type CheckContext, type RuleId, formatViolation, indexFor } from '@offsystem/core';
import type { Rule } from 'eslint';
import { checkClassString, checkStyleEntry } from './jsx.js';

const RULES: RuleId[] = ['no-raw-color', 'no-raw-length', 'no-unknown-token'];

/** Attribute names treated as class strings. */
const CLASS_ATTRIBUTES = new Set(['className', 'class']);

function createRule(ruleId: RuleId): Rule.RuleModule {
  return {
    meta: {
      type: 'problem',
      docs: {
        description: `Enforce design-system tokens (${ruleId})`,
        url: `https://github.com/oddurs/offsystem#${ruleId}`,
      },
      schema: [],
      messages: { violation: '{{ text }}' },
    },
    create(context) {
      const filename = resolve(context.cwd, context.filename);
      const index = indexFor(filename);
      if (!index) return {};
      const ctx: CheckContext = { index };

      const report = (node: Parameters<typeof context.report>[0]['node'], text: string) =>
        context.report({ node: node as never, messageId: 'violation', data: { text } });

      return {
        // style={{ color: '#333', padding: 14 }}
        'JSXAttribute[name.name="style"] ObjectExpression > Property'(node: {
          key?: { type: string; name?: string; value?: unknown };
          value?: { type: string; value?: unknown };
        }) {
          const key =
            node.key?.type === 'Identifier'
              ? node.key.name
              : node.key?.type === 'Literal'
                ? String(node.key.value)
                : undefined;
          const value = node.value?.type === 'Literal' ? node.value.value : undefined;
          if (!key || (typeof value !== 'string' && typeof value !== 'number')) return;
          for (const violation of checkStyleEntry(key, value, ctx)) {
            if (violation.rule === ruleId) report(node as never, formatViolation(violation));
          }
        },

        // className="p-[13px] bg-[#3b82f6]" — string literals only, dynamic is skipped
        JSXAttribute(node: {
          name?: { name?: string };
          value?: { type: string; value?: unknown };
        }) {
          if (!node.name?.name || !CLASS_ATTRIBUTES.has(node.name.name)) return;
          if (node.value?.type !== 'Literal' || typeof node.value.value !== 'string') return;
          for (const violation of checkClassString(node.value.value, ctx)) {
            if (violation.rule === ruleId) report(node as never, formatViolation(violation));
          }
        },

        // style strings and vars in template css are out of MVP scope by design
      };
    },
  };
}

const plugin = {
  meta: { name: '@offsystem/eslint-plugin', version: '0.0.0' },
  rules: Object.fromEntries(RULES.map((id) => [id, createRule(id)])),
};

export default plugin;

/** Flat-config preset: `import offsystem from '@offsystem/eslint-plugin'` → `offsystem.configs.recommended`. */
export const configs = {
  recommended: {
    plugins: { offsystem: plugin },
    rules: {
      'offsystem/no-raw-color': 'error',
      'offsystem/no-unknown-token': 'error',
      'offsystem/no-raw-length': 'warn',
    },
  },
};
