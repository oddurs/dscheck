import { readFileSync } from 'node:fs';
import { parse } from 'acorn';
import type { Token } from './types.js';

/**
 * TS/JS token-object source: a default-exported (or `export const`) object of
 * nested literal values. Statically evaluated — literals only, never executed.
 *
 *   export default { color: { primary: '#1d4ed8' }, spacing: { 3: '12px' } }
 *   → --color-primary, --spacing-3
 */
export function loadTsTokens(files: string[]): Token[] {
  const tokens: Token[] = [];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const ast = parse(stripTypes(source), {
      ecmaVersion: 'latest',
      sourceType: 'module',
    }) as unknown as { body: AcornNode[] };
    for (const statement of ast.body) {
      const object = exportedObject(statement);
      if (object) walkObject(object, [], file, tokens);
    }
  }
  return tokens;
}

interface AcornNode {
  type: string;
  [key: string]: unknown;
}

/** Just enough TS-stripping for token files: `as const`, `satisfies X`, `: Type =`. */
function stripTypes(source: string): string {
  return source
    .replace(/\sas\s+const\b/g, '')
    .replace(/\ssatisfies\s+[\w.<>[\]{}, ]+/g, '')
    .replace(/(export\s+const\s+\w+)\s*:\s*[\w.<>[\]{}, |&'"]+=/g, '$1 =');
}

function exportedObject(statement: AcornNode): AcornNode | undefined {
  if (statement.type === 'ExportDefaultDeclaration') {
    const declaration = statement.declaration as AcornNode;
    return declaration.type === 'ObjectExpression' ? declaration : undefined;
  }
  if (statement.type === 'ExportNamedDeclaration') {
    const declaration = statement.declaration as AcornNode | null;
    if (declaration?.type !== 'VariableDeclaration') return undefined;
    for (const declarator of declaration.declarations as AcornNode[]) {
      const init = declarator.init as AcornNode | undefined;
      if (init?.type === 'ObjectExpression') return init;
    }
  }
  return undefined;
}

function walkObject(node: AcornNode, path: string[], source: string, out: Token[]): void {
  for (const property of (node.properties as AcornNode[]) ?? []) {
    if (property.type !== 'Property') continue;
    const key = property.key as AcornNode;
    const name =
      key.type === 'Identifier'
        ? (key.name as string)
        : key.type === 'Literal'
          ? String(key.value)
          : undefined;
    if (name === undefined) continue;
    const value = property.value as AcornNode;
    if (value.type === 'ObjectExpression') {
      walkObject(value, [...path, name], source, out);
    } else if (
      value.type === 'Literal' &&
      (typeof value.value === 'string' || typeof value.value === 'number')
    ) {
      const tokenName = `--${[...path, name].join('-')}`;
      const tokenValue = String(value.value);
      out.push({ name: tokenName, value: tokenValue, category: 'other', source });
    }
  }
}
