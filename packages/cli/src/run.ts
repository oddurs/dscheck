import { createRequire } from 'node:module';
import { findConfig } from '@dscheck/core';

export interface Finding {
  file: string;
  line: number;
  col: number;
  rule: string;
  severity: 'error' | 'warning';
  message: string;
  /** The best replacement, when one exists — e.g. `var(--spacing-3)`. */
  suggestion?: string;
}

const require = createRequire(import.meta.url);

type Severity = 'off' | 'warn' | 'error';

const DEFAULT_SEVERITIES: Record<string, Severity> = {
  'no-raw-color': 'error',
  'no-unknown-token': 'error',
  'no-raw-length': 'warn',
  'no-raw-font': 'warn',
  'no-raw-shadow': 'warn',
  'token-role': 'warn',
  'no-unknown-class': 'error',
};

/** Class strings only exist in JSX — stylelint never sees this rule. */
const ESLINT_ONLY = new Set(['no-unknown-class']);

/** Effective severities: defaults overridden by dscheck.config.json `rules`. */
function severitiesFor(anchor: string | undefined): Record<string, Severity> {
  const config = anchor ? findConfig(anchor) : undefined;
  const overrides = Object.fromEntries(
    Object.entries(config?.rules ?? {}).map(([rule, s]) => [rule.replace(/^dscheck\//, ''), s]),
  );
  return { ...DEFAULT_SEVERITIES, ...overrides };
}

/** Lint by driving the real hosts with our plugins — findings match editor/CI output exactly. */
export async function lintFiles(
  files: string[],
  options: { fix?: boolean } = {},
): Promise<Finding[]> {
  const css = files.filter((f) => /\.(css|scss)$/.test(f));
  const jsx = files.filter((f) => /\.(jsx|tsx)$/.test(f));
  const fix = options.fix ?? false;
  const findings = [
    ...(css.length > 0 ? await lintCss(css, fix) : []),
    ...(jsx.length > 0 ? await lintJsx(jsx, fix) : []),
  ];
  return findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.col - b.col);
}

async function lintCss(files: string[], fix: boolean): Promise<Finding[]> {
  const plain = files.filter((f) => !f.endsWith('.scss'));
  const scssFiles = files.filter((f) => f.endsWith('.scss'));
  return [
    ...(plain.length > 0 ? await lintCssWith(plain, fix, undefined) : []),
    ...(scssFiles.length > 0 ? await lintCssWith(scssFiles, fix, 'postcss-scss') : []),
  ];
}

async function lintCssWith(
  files: string[],
  fix: boolean,
  customSyntax: string | undefined,
): Promise<Finding[]> {
  const { default: stylelint } = await import('stylelint');
  const severities = severitiesFor(files[0]);
  const rules = Object.fromEntries(
    Object.entries(severities)
      .filter(([rule, s]) => s !== 'off' && !ESLINT_ONLY.has(rule))
      .map(([rule, s]) => [
        `dscheck/${rule}`,
        s === 'error' ? true : [true, { severity: 'warning' }],
      ]),
  );
  const result = await stylelint.lint({
    files: files.map((f) => f.replaceAll('\\', '/')), // stylelint globs; windows backslashes would escape
    fix,
    config: {
      plugins: [require.resolve('@dscheck/stylelint-plugin')],
      rules,
      ...(customSyntax ? { customSyntax: require.resolve(customSyntax) } : {}),
    },
  });
  return result.results.flatMap((r) =>
    r.warnings
      // "didn't check" must never look like "passed": parse failures surface
      .filter((w) => w.rule?.startsWith('dscheck/') || w.rule === 'CssSyntaxError')
      .map((w) =>
        toFinding(
          r.source ?? '',
          w.line,
          w.column,
          w.rule === 'CssSyntaxError' ? 'dscheck/unparsed' : (w.rule ?? ''),
          w.rule === 'CssSyntaxError' ? 'warning' : w.severity,
          w.rule === 'CssSyntaxError'
            ? `File could not be parsed and was NOT checked: ${w.text}`
            : w.text,
        ),
      ),
  );
}

async function lintJsx(files: string[], fix: boolean): Promise<Finding[]> {
  const { Linter } = await import('eslint');
  const { readFileSync } = await import('node:fs');
  const { default: plugin } = await import('@dscheck/eslint-plugin');
  const { default: tsParser } = await import('@typescript-eslint/parser');
  const linter = new Linter({ cwd: '/' });
  const severities = severitiesFor(files[0]);
  const eslintRules = Object.fromEntries(
    Object.entries(severities)
      .filter(([, s]) => s !== 'off')
      .map(([rule, s]) => [`dscheck/${rule}`, s]),
  );
  const findings: Finding[] = [];
  const config = {
    files: ['**/*.{jsx,tsx}'],
    plugins: { dscheck: plugin as never },
    languageOptions: {
      parser: tsParser as never,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: eslintRules,
  } as never;
  const { writeFileSync } = await import('node:fs');
  for (const file of files) {
    let messages: ReturnType<InstanceType<typeof Linter>['verify']>;
    if (fix) {
      const source = readFileSync(file, 'utf8');
      const result = linter.verifyAndFix(source, config, file);
      if (result.fixed && result.output !== source) writeFileSync(file, result.output);
      messages = result.messages;
    } else {
      messages = linter.verify(readFileSync(file, 'utf8'), config, file);
    }
    for (const m of messages) {
      if (!m.ruleId?.startsWith('dscheck/')) continue;
      findings.push(
        toFinding(
          file,
          m.line,
          m.column,
          m.ruleId,
          m.severity === 2 ? 'error' : 'warning',
          m.message,
        ),
      );
    }
  }
  return findings;
}

function toFinding(
  file: string,
  line: number,
  col: number,
  rule: string,
  severity: string,
  text: string,
): Finding {
  // Messages read "… — use var(--x) (…)" or "… — did you mean --x?"; lift the fix.
  const suggestion =
    /use (var\(--[\w-]+\))/.exec(text)?.[1] ??
    /did you mean (--[\w-]+)\?/.exec(text)?.[1] ??
    undefined;
  return {
    file,
    line,
    col,
    rule,
    severity: severity === 'error' ? 'error' : 'warning',
    message: text.replace(/\s*\(dscheck\/[\w-]+\)\s*$/, ''),
    ...(suggestion ? { suggestion } : {}),
  };
}
