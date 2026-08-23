import { resolve } from 'node:path';
import {
  allowedNameMatcher,
  type CheckContext,
  findConfig,
  formatViolation,
  indexFor,
  type RuleId,
} from '@dscheck/core';
import type { Rule } from 'eslint';
import { checkClassString, checkStyleEntry } from './jsx.js';

const RULES: RuleId[] = [
  'no-raw-color',
  'no-raw-length',
  'no-unknown-token',
  'no-raw-font',
  'no-raw-shadow',
];

/** Attribute names treated as class strings. */
const CLASS_ATTRIBUTES = new Set(['className', 'class']);

interface Node {
  type: string;
  [key: string]: unknown;
}

function createRule(ruleId: RuleId): Rule.RuleModule {
  return {
    meta: {
      type: 'problem',
      docs: {
        description: `Enforce design-system tokens (${ruleId})`,
        url: `https://github.com/oddurs/dscheck#${ruleId}`,
      },
      fixable: 'code',
      schema: [],
      messages: { violation: '{{ text }}' },
    },
    create(context) {
      const filename = resolve(context.cwd, context.filename);
      const index = indexFor(filename);
      if (!index) return {};
      const config = findConfig(filename);
      const ctx: CheckContext = {
        index,
        ...(config ? { isAllowedName: allowedNameMatcher(config) } : {}),
      };

      /** Object variables that might be style maps or palettes, by name. */
      const objectVars = new Map<string, Node>();
      /** Const string/number variables, for `color: BRAND_BLUE` indirection. */
      const literalVars = new Map<string, string | number>();
      /** Variable names referenced from a style={} attribute. */
      const styleRefs = new Set<string>();
      /** Inline style objects, checked at Program:exit once all consts are known. */
      const inlineStyles: Node[] = [];

      const report = (node: Node, text: string) =>
        context.report({ node: node as never, messageId: 'violation', data: { text } });

      const checkEntry = (key: string, value: string | number, node: Node) => {
        for (const violation of checkStyleEntry(key, value, ctx)) {
          if (violation.rule !== ruleId) continue;
          const best = violation.matches[0];
          // Fix only literals the violation covers entirely — never partial rewrites.
          const wholeLiteral = node.type === 'Literal' && String(value).trim() === violation.value;
          if (best?.kind === 'exact' && wholeLiteral) {
            context.report({
              node: node as never,
              messageId: 'violation',
              data: { text: formatViolation(violation) },
              fix: (fixer) => fixer.replaceText(node as never, `'var(${best.token.name})'`),
            });
          } else {
            report(node, formatViolation(violation));
          }
        }
      };

      /** Check an ObjectExpression as CSS declarations; recurse one level for style maps. */
      const checkStyleObject = (obj: Node, depth = 0) => {
        for (const property of (obj.properties as Node[]) ?? []) {
          if (property.type !== 'Property') continue;
          const keyNode = property.key as Node;
          const key =
            keyNode.type === 'Identifier'
              ? (keyNode.name as string)
              : keyNode.type === 'Literal'
                ? String(keyNode.value)
                : undefined;
          const valueNode = property.value as Node;
          if (!key) continue;
          if (valueNode.type === 'ObjectExpression' && depth === 0) {
            checkStyleObject(valueNode, 1); // styles = { card: {...}, cta: {...} }
          } else {
            const resolved = resolveStatic(valueNode);
            if (resolved !== undefined) checkEntry(key, resolved, valueNode);
          }
        }
      };

      /** Fold a literal, const identifier, or palette member to its static value. */
      const resolveStatic = (node: Node, depth = 0): string | number | undefined => {
        if (depth > 2) return undefined;
        if (node.type === 'Literal') {
          const value = node.value;
          return typeof value === 'string' || typeof value === 'number' ? value : undefined;
        }
        if (node.type === 'Identifier') return literalVars.get(node.name as string);
        if (node.type === 'MemberExpression' && node.computed !== true) {
          const objName =
            (node.object as Node).type === 'Identifier'
              ? ((node.object as Node).name as string)
              : undefined;
          const propName =
            (node.property as Node).type === 'Identifier'
              ? ((node.property as Node).name as string)
              : undefined;
          const obj = objName ? objectVars.get(objName) : undefined;
          if (!obj || !propName) return undefined;
          for (const property of (obj.properties as Node[]) ?? []) {
            if (property.type !== 'Property') continue;
            const keyNode = property.key as Node;
            const key = keyNode.type === 'Identifier' ? keyNode.name : keyNode.value;
            if (key === propName) return resolveStatic(property.value as Node, depth + 1);
          }
        }
        return undefined;
      };

      /** The identifier a style={} expression is rooted in, if any. */
      const rootName = (expr: Node | undefined): string | undefined => {
        if (!expr) return undefined;
        if (expr.type === 'Identifier') return expr.name as string;
        if (expr.type === 'MemberExpression') return rootName(expr.object as Node);
        return undefined;
      };

      return {
        JSXAttribute(node: Node) {
          const name = (node.name as Node | undefined)?.name;
          const value = node.value as Node | undefined;

          if (name === 'style' && value?.type === 'JSXExpressionContainer') {
            const expr = value.expression as Node;
            if (expr.type === 'ObjectExpression') inlineStyles.push(expr);
            else {
              const ref = rootName(expr);
              if (ref) styleRefs.add(ref);
            }
            return;
          }

          // className="p-[13px] bg-[#3b82f6]" — string literals only, dynamic is skipped
          if (
            typeof name === 'string' &&
            CLASS_ATTRIBUTES.has(name) &&
            value?.type === 'Literal' &&
            typeof value.value === 'string'
          ) {
            for (const violation of checkClassString(value.value, ctx)) {
              if (violation.rule !== ruleId) continue;
              const text = violation.classFix
                ? `${formatViolation(violation)} — class: ${violation.classFix}`
                : formatViolation(violation);
              report(node, text);
            }
          }
        },

        // const styles = { card: { color: '#333' } } — candidate style maps
        VariableDeclarator(node: Node) {
          const id = node.id as Node;
          const init = node.init as Node | undefined;
          if (id.type !== 'Identifier' || !init) return;
          if (init.type === 'ObjectExpression') {
            objectVars.set(id.name as string, init);
          } else if (
            init.type === 'Literal' &&
            (typeof init.value === 'string' || typeof init.value === 'number')
          ) {
            literalVars.set(id.name as string, init.value);
          }
        },

        // Only objects actually referenced from a style={} attribute are checked.
        'Program:exit'() {
          for (const obj of inlineStyles) checkStyleObject(obj, 1);
          for (const ref of styleRefs) {
            const obj = objectVars.get(ref);
            if (obj) checkStyleObject(obj);
          }
        },
      };
    },
  };
}

const plugin = {
  meta: { name: '@dscheck/eslint-plugin', version: '0.0.0' },
  rules: Object.fromEntries(RULES.map((id) => [id, createRule(id)])),
};

export default plugin;

/** Flat-config preset: `import dscheck from '@dscheck/eslint-plugin'` → `dscheck.configs.recommended`. */
export const configs = {
  recommended: {
    plugins: { dscheck: plugin },
    rules: {
      'dscheck/no-raw-color': 'error',
      'dscheck/no-unknown-token': 'error',
      'dscheck/no-raw-length': 'warn',
      'dscheck/no-raw-font': 'warn',
      'dscheck/no-raw-shadow': 'warn',
    },
  },
};
