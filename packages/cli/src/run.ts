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
      plugins: [require.resolve('@offsystem/stylelint-plugin')],
      rules: {
        'offsystem/no-raw-color': true,
        'offsystem/no-unknown-token': true,
        'offsystem/no-raw-length': [true, { severity: 'warning' }],
        'offsystem/no-raw-font': [true, { severity: 'warning' }],
        'offsystem/no-raw-shadow': [true, { severity: 'warning' }],
      },
    },
  });
  return result.results.flatMap((r) =>
    r.warnings
      .filter((w) => w.rule?.startsWith('offsystem/'))
      .map((w) => toFinding(r.source ?? '', w.line, w.column, w.rule ?? '', w.severity, w.text)),
  );
}

async function lintJsx(files: string[]): Promise<Finding[]> {
  const { Linter } = await import('eslint');
  const { readFileSync } = await import('node:fs');
  const { default: plugin } = await import('@offsystem/eslint-plugin');
  const { default: tsParser } = await import('@typescript-eslint/parser');
  const linter = new Linter({ cwd: '/' });
  const findings: Finding[] = [];
  for (const file of files) {
    const messages = linter.verify(
      readFileSync(file, 'utf8'),
      {
        files: ['**/*.{jsx,tsx}'],
        plugins: { offsystem: plugin as never },
        languageOptions: {
          parser: tsParser as never,
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        rules: {
          'offsystem/no-raw-color': 'error',
          'offsystem/no-unknown-token': 'error',
          'offsystem/no-raw-length': 'warn',
          'offsystem/no-raw-font': 'warn',
          'offsystem/no-raw-shadow': 'warn',
        },
      },
      file,
    );
    for (const m of messages) {
      if (!m.ruleId?.startsWith('offsystem/')) continue;
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
    message: text.replace(/\s*\(offsystem\/[\w-]+\)\s*$/, ''),
    ...(suggestion ? { suggestion } : {}),
  };
}
