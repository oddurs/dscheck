import { createRequire } from 'node:module';

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

/** Lint by driving the real hosts with our plugins — findings match editor/CI output exactly. */
export async function lintFiles(files: string[]): Promise<Finding[]> {
  const css = files.filter((f) => /\.(css|scss)$/.test(f));
  const jsx = files.filter((f) => /\.(jsx|tsx)$/.test(f));
  const findings = [
    ...(css.length > 0 ? await lintCss(css) : []),
    ...(jsx.length > 0 ? await lintJsx(jsx) : []),
  ];
  return findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.col - b.col);
}

async function lintCss(files: string[]): Promise<Finding[]> {
  const { default: stylelint } = await import('stylelint');
  const result = await stylelint.lint({
    files: files.map((f) => f.replaceAll('\\', '/')), // stylelint globs; windows backslashes would escape
    config: {
      plugins: [require.resolve('@dscheck/stylelint-plugin')],
      rules: {
        'dscheck/no-raw-color': true,
        'dscheck/no-unknown-token': true,
        'dscheck/no-raw-length': [true, { severity: 'warning' }],
        'dscheck/no-raw-font': [true, { severity: 'warning' }],
        'dscheck/no-raw-shadow': [true, { severity: 'warning' }],
      },
    },
  });
  return result.results.flatMap((r) =>
    r.warnings
      .filter((w) => w.rule?.startsWith('dscheck/'))
      .map((w) => toFinding(r.source ?? '', w.line, w.column, w.rule ?? '', w.severity, w.text)),
  );
}

async function lintJsx(files: string[]): Promise<Finding[]> {
  const { Linter } = await import('eslint');
  const { readFileSync } = await import('node:fs');
  const { default: plugin } = await import('@dscheck/eslint-plugin');
  const { default: tsParser } = await import('@typescript-eslint/parser');
  const linter = new Linter({ cwd: '/' });
  const findings: Finding[] = [];
  for (const file of files) {
    const messages = linter.verify(
      readFileSync(file, 'utf8'),
      {
        files: ['**/*.{jsx,tsx}'],
        plugins: { dscheck: plugin as never },
        languageOptions: {
          parser: tsParser as never,
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        rules: {
          'dscheck/no-raw-color': 'error',
          'dscheck/no-unknown-token': 'error',
          'dscheck/no-raw-length': 'warn',
          'dscheck/no-raw-font': 'warn',
          'dscheck/no-raw-shadow': 'warn',
        },
      },
      file,
    );
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
