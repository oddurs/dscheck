#!/usr/bin/env node
import { statSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import pc from 'picocolors';
import { globSync } from 'tinyglobby';
import { type Finding, lintFiles } from './run.js';

const HELP = `offsystem — the linter that knows your design system

Usage
  offsystem check [paths...]   Lint files (default: cwd) against the token set
  offsystem tokens             Print the resolved allowed set

Options
  --format <pretty|json|agent>   Output format (default: pretty)
  -h, --help                     Show help

Findings are also ordinary eslint/stylelint results — in CI, prefer mounting
@offsystem/eslint-plugin and @offsystem/stylelint-plugin in your existing setup.`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    format: { type: 'string', default: 'pretty' },
    help: { type: 'boolean', short: 'h' },
  },
});

const [command = 'check', ...paths] = positionals;

if (values.help || command === 'help') {
  console.log(HELP);
  process.exit(0);
}

if (command === 'tokens') {
  const { indexFor } = await import('@offsystem/core');
  const index = indexFor(resolve('.'));
  if (!index) fail('No design system found (no offsystem.config.json or @theme/:root css).');
  for (const token of [...index.tokens.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`${token.name}\t${token.category}\t${token.value}`);
  }
  process.exit(0);
}

if (command !== 'check') fail(`Unknown command: ${command}\n\n${HELP}`);

const files = expand(paths.length > 0 ? paths : ['.']);
const findings = await lintFiles(files);
render(findings, values.format as string);
process.exit(findings.some((f) => f.severity === 'error') ? 1 : 0);

function expand(inputs: string[]): string[] {
  const out = new Set<string>();
  for (const input of inputs) {
    const abs = resolve(input);
    if (isDir(abs)) {
      for (const f of globSync('**/*.{css,scss,jsx,tsx}', {
        cwd: abs,
        ignore: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
      }))
        out.add(resolve(abs, f));
    } else {
      out.add(abs);
    }
  }
  return [...out].sort();
}

function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function render(all: Finding[], format: string): void {
  if (format === 'json') {
    console.log(JSON.stringify(all, null, 2));
    return;
  }
  if (format === 'agent') {
    // One finding per line; suggestion first so an agent can act on it directly.
    for (const f of all) {
      console.log(
        JSON.stringify({
          fix: f.suggestion,
          rule: f.rule,
          file: f.file,
          line: f.line,
          col: f.col,
          message: f.message,
        }),
      );
    }
    return;
  }
  let lastFile = '';
  for (const f of all) {
    if (f.file !== lastFile) {
      console.log(`\n${pc.underline(f.file)}`);
      lastFile = f.file;
    }
    const badge = f.severity === 'error' ? pc.red('✖') : pc.yellow('⚠');
    console.log(`  ${badge} ${pc.dim(`${f.line}:${f.col}`)}  ${f.message}  ${pc.dim(f.rule)}`);
  }
  const errors = all.filter((f) => f.severity === 'error').length;
  const warnings = all.length - errors;
  console.log(
    all.length === 0
      ? pc.green('\n✔ on-system: no findings')
      : `\n${pc.red(`${errors} errors`)}, ${pc.yellow(`${warnings} warnings`)}`,
  );
}

function fail(message: string): never {
  console.error(message);
  process.exit(2);
}
