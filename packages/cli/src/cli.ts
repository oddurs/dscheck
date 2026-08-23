#!/usr/bin/env node
import { statSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import pc from 'picocolors';
import { globSync } from 'tinyglobby';
import { type Finding, lintFiles } from './run.js';

const HELP = `dscheck — the linter that knows your design system

Usage
  dscheck check [paths...]     Lint files (default: cwd) against the token set
  dscheck baseline [paths...]  Record current findings as accepted debt
  dscheck report [paths...]    Debt overview: counts by rule and worst files, vs baseline
  dscheck tokens               Print the resolved allowed set

Options
  --format <pretty|json|agent|sarif>  Output format (default: pretty)
  --no-baseline                       Ignore .dscheck-baseline.json
  -h, --help                          Show help

Findings are also ordinary eslint/stylelint results — in CI, prefer mounting
@dscheck/eslint-plugin and @dscheck/stylelint-plugin in your existing setup.`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    format: { type: 'string', default: 'pretty' },
    'no-baseline': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h' },
  },
});

const [command = 'check', ...paths] = positionals;

if (values.help || command === 'help') {
  console.log(HELP);
  process.exit(0);
}

if (command === 'tokens') {
  const { indexFor } = await import('@dscheck/core');
  const index = indexFor(resolve('.'));
  if (!index) fail('No design system found (no dscheck.config.json or @theme/:root css).');
  for (const token of [...index.tokens.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`${token.name}\t${token.category}\t${token.value}`);
  }
  process.exit(0);
}

if (!['check', 'baseline', 'report'].includes(command))
  fail(`Unknown command: ${command}\n\n${HELP}`);

const files = expand(paths.length > 0 ? paths : ['.']);
const findings = await lintFiles(files);
const root = process.cwd();

if (command === 'baseline') {
  const { writeBaseline, BASELINE_FILE } = await import('./baseline.js');
  writeBaseline(findings, root);
  console.log(`${findings.length} findings recorded in ${BASELINE_FILE}`);
  process.exit(0);
}

if (command === 'report') {
  const { readBaseline } = await import('./baseline.js');
  const known = readBaseline(root);
  const baselined = known
    ? Object.values(known).reduce(
        (n, rules) => n + Object.values(rules).reduce((m, r) => m + r.count, 0),
        0,
      )
    : undefined;
  const byRule = new Map<string, number>();
  const byFile = new Map<string, number>();
  for (const f of findings) {
    byRule.set(f.rule, (byRule.get(f.rule) ?? 0) + 1);
    byFile.set(f.file, (byFile.get(f.file) ?? 0) + 1);
  }
  console.log(
    pc.bold(`off-system findings: ${findings.length}`) +
      (baselined !== undefined
        ? pc.dim(
            `  (baseline: ${baselined}, delta ${findings.length - baselined >= 0 ? '+' : ''}${findings.length - baselined})`,
          )
        : ''),
  );
  console.log(`\n${pc.bold('by rule')}`);
  for (const [rule, n] of [...byRule].sort((a, b) => b[1] - a[1]))
    console.log(`  ${String(n).padStart(5)}  ${rule}`);
  console.log(`\n${pc.bold('worst files')}`);
  for (const [file, n] of [...byFile].sort((a, b) => b[1] - a[1]).slice(0, 10))
    console.log(`  ${String(n).padStart(5)}  ${file}`);
  process.exit(0);
}

const { readBaseline, applyBaseline } = await import('./baseline.js');
const baseline = values['no-baseline'] ? undefined : readBaseline(root);
let reportable = findings;
if (baseline) {
  const { fresh, absorbed, stale } = applyBaseline(findings, baseline, root);
  reportable = fresh;
  if (values.format === 'pretty' && (absorbed > 0 || stale > 0)) {
    console.log(
      pc.dim(
        `baseline: ${absorbed} known finding${absorbed === 1 ? '' : 's'} absorbed` +
          (stale > 0
            ? `, ${stale} entr${stale === 1 ? 'y' : 'ies'} paid down (re-run \`dscheck baseline\` to prune)`
            : ''),
      ),
    );
  }
}
await render(reportable, values.format as string);
process.exitCode = reportable.some((f) => f.severity === 'error') ? 1 : 0;

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

async function render(all: Finding[], format: string): Promise<void> {
  if (format === 'sarif') {
    const { toSarif } = await import('@dscheck/sarif'); // deferred: keeps the hook path light
    console.log(JSON.stringify(toSarif(all), null, 2));
    return;
  }
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
