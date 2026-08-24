#!/usr/bin/env node
import * as childProcess from 'node:child_process';
import * as fsModule from 'node:fs';
import { statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import * as coreModule from 'dscheck-core';
import pc from 'picocolors';
import { globSync } from 'tinyglobby';
import { lintFilesParallel } from './pool.js';
import type { Finding } from './run.js';

const HELP = `dscheck — the linter that knows your design system

Usage
  dscheck init                 Detect the token source and propose a config
  dscheck check [paths...]     Lint files (default: cwd) against the token set
  dscheck fix [paths...]       Apply every exact-match fix, report what remains
  dscheck baseline [paths...]  Record current findings as accepted debt
  dscheck report [paths...]    Debt overview: counts by rule and worst files, vs baseline
  dscheck tokens [query]       Print the allowed set (--json, --category, --doctor)
  dscheck roles --suggest      Propose a roles.json from token names (review, then commit)
  dscheck explain <rule>       What a rule flags, what it never flags, how to disable
  dscheck completions <shell>  Completion script for fish, zsh, or bash

Options
  -v, --version                       Print the version
  --only <rule>                       Only this rule (repeatable by comma)
  --severity <error|warning>          Only findings at this severity
  --max-warnings <n>                  Fail when warnings exceed n
  --quiet                             Findings only, machine-friendly lines
  --ascii                             ASCII marks instead of ✔ ⚠ ✖
  --format <pretty|json|agent|sarif>  Output format (default: pretty)
  --since <ref>                       Only lint files changed since a git ref
  --update                            (baseline) prune paid-down entries, never raise counts
  --category <name>                   (tokens) filter by category
  --json                              (tokens) JSON output
  --write                             (init) write dscheck.config.json
  --watch                             Re-lint files as they change
  --explain-skips                     Show what was deliberately not checked, and why
  --no-baseline                       Ignore .dscheck-baseline.json
  -h, --help                          Show help

Findings are also ordinary eslint/stylelint results — in CI, prefer mounting
eslint-plugin-dscheck and stylelint-dscheck in your existing setup.`;

const OPTIONS = {
  format: { type: 'string', default: 'pretty' },
  doctor: { type: 'boolean', default: false },
  suggest: { type: 'boolean', default: false },
  json: { type: 'boolean', default: false },
  category: { type: 'string' },
  since: { type: 'string' },
  update: { type: 'boolean', default: false },
  watch: { type: 'boolean', default: false },
  write: { type: 'boolean', default: false },
  'explain-skips': { type: 'boolean', default: false },
  'no-baseline': { type: 'boolean', default: false },
  help: { type: 'boolean', short: 'h' },
  version: { type: 'boolean', short: 'v' },
  quiet: { type: 'boolean', default: false },
  ascii: { type: 'boolean', default: false },
  only: { type: 'string' },
  severity: { type: 'string' },
  'max-warnings': { type: 'string' },
} as const;

let values: Record<string, string | boolean | undefined>;
let positionals: string[];
try {
  ({ values, positionals } = parseArgs({ allowPositionals: true, options: OPTIONS }) as {
    values: Record<string, string | boolean | undefined>;
    positionals: string[];
  });
} catch (error) {
  // W3: an unknown flag is a usage mistake, not a crash — never show a stack.
  const message = error instanceof Error ? error.message : String(error);
  const flag = /'([^']+)'/.exec(message)?.[1];
  const known = Object.keys(OPTIONS);
  const near = flag && nearest(flag.replace(/^--?/, ''), known);
  fail(
    `unknown option ${pc.bold(flag ?? '')}` +
      (near ? ` — did you mean ${pc.bold(`--${near}`)}?` : '') +
      `\n\nRun ${pc.bold('dscheck --help')} to see every option.`,
  );
}

// W4: config and parse failures are diagnostics, not crashes. Anything that
// escapes below is a bug in dscheck itself and says so, with a report link.
process.on('uncaughtException', reportFatal);
process.on('unhandledRejection', reportFatal);

function reportFatal(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  // Errors we raise deliberately read as guidance; everything else is ours.
  if (/^Invalid .*dscheck\.config\.json/.test(message)) {
    fail(`${pc.red('invalid configuration')}\n\n  ${message.split('\n').join('\n  ')}`);
  }
  if (/ENOENT|EACCES/.test(message)) {
    fail(`${pc.red('cannot read a file')}\n\n  ${message}`);
  }
  console.error(
    `${pc.red('dscheck crashed')} — this is a bug, and we want it:\n` +
      '  https://github.com/oddurs/dscheck/issues/new?template=bug.yml\n\n' +
      `  ${message}\n` +
      `  ${pc.dim('run with DSCHECK_DEBUG=1 for the full stack')}`,
  );
  if (process.env.DSCHECK_DEBUG && error instanceof Error) console.error(error.stack);
  process.exit(2);
}

const [command = 'check', ...paths] = positionals;

if (values.version) {
  const { readFileSync } = fsModule;
  const manifest = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  ) as { name: string; version: string };
  console.log(`${manifest.name} ${manifest.version}`);
  process.exit(0);
}

if (values.help || command === 'help') {
  console.log(HELP);
  process.exit(0);
}

if (command === 'init') {
  const { runInit } = await import('./init.js');
  process.exit(runInit(resolve('.'), values.write === true));
}

if (command === 'explain') {
  const rule = paths[0]?.replace(/^dscheck\//, '');
  const { explainRule, RULE_IDS } = await import('./explain.js');
  if (!rule) {
    console.log(`Usage: dscheck explain <rule>\n\nRules: ${RULE_IDS.join(', ')}`);
    process.exit(0);
  }
  const text = explainRule(rule);
  if (!text) {
    const near = nearest(rule, [...RULE_IDS]);
    fail(`unknown rule ${pc.bold(rule)}${near ? ` — did you mean ${pc.bold(near)}?` : ''}`);
  }
  console.log(text);
  process.exit(0);
}

if (command === 'completions') {
  const { completionScript } = await import('./explain.js');
  const shell = paths[0];
  if (!shell || !['fish', 'zsh', 'bash'].includes(shell)) {
    fail('Usage: dscheck completions <fish|zsh|bash>');
  }
  console.log(completionScript(shell as 'fish' | 'zsh' | 'bash'));
  process.exit(0);
}

if (command === 'roles') {
  const { indexFor } = await import('dscheck-core');
  const index = indexFor(resolve('.'));
  if (!index) fail('No design system found.');
  const HEURISTICS: Array<[RegExp, string[]]> = [
    [/foreground|-fg$|^--color-(ink|text)/, ['fg']],
    [/background|surface|-bg$|card|popover|canvas/, ['bg']],
    [/border|ring|input|outline|divider|line|stroke/, ['border']],
  ];
  const proposal: Record<string, string[]> = {};
  for (const token of index.tokens.values()) {
    if (token.category !== 'color') continue;
    for (const [pattern, roles] of HEURISTICS) {
      if (pattern.test(token.name)) {
        proposal[token.name] = roles;
        break;
      }
    }
  }
  if (!values.suggest) fail('Usage: dscheck roles --suggest > roles.json');
  console.log(JSON.stringify(proposal, null, 2));
  console.error(
    `\n# ${Object.keys(proposal).length} of ${index.byCategory('color').length} color tokens matched a heuristic.`,
  );
  console.error(
    '# Review, edit, save as roles.json, then set { "roles": "roles.json" } in dscheck.config.json.',
  );
  process.exit(0);
}

if (command === 'tokens') {
  const { indexFor } = await import('dscheck-core');
  const index = indexFor(resolve('.'));
  if (!index) fail('No design system found (no dscheck.config.json or @theme/:root css).');
  if (values.doctor) {
    const d = index.diagnostics;
    if (index.tokens.size === 0) {
      console.error(pc.red('✖ empty token set — sources matched no tokens (check `tokens` globs)'));
      process.exit(1);
    }
    if (
      !d ||
      (d.conflicts.length === 0 && d.unresolved.length === 0 && d.danglingAliases.length === 0)
    ) {
      console.log(
        pc.green('✔ token set healthy: no conflicts, unresolved chains, or dangling aliases'),
      );
      process.exit(0);
    }
    for (const c of d.conflicts)
      console.log(`${pc.red('conflict')}   ${c.name}: ${c.values.join(' ≠ ')}`);
    for (const name of d.unresolved)
      console.log(`${pc.yellow('unresolved')} ${name} (var() chain has no literal end)`);
    for (const name of d.danglingAliases)
      console.log(`${pc.red('dangling')}   ${name} → missing target`);
    process.exit(1);
  }
  let list = [...index.tokens.values()].sort((a, b) => a.name.localeCompare(b.name));
  if (values.category) list = list.filter((t) => t.category === values.category);
  const query = paths[0];
  if (query) list = list.filter((t) => t.name.includes(query) || t.value.includes(query));
  if (values.json) {
    console.log(JSON.stringify(list, null, 2));
  } else {
    for (const token of list) console.log(`${token.name}\t${token.category}\t${token.value}`);
  }
  process.exit(0);
}

const COMMANDS = [
  'check',
  'fix',
  'baseline',
  'report',
  'tokens',
  'roles',
  'init',
  'explain',
  'completions',
  'help',
];
if (!['check', 'fix', 'baseline', 'report'].includes(command)) {
  const near = nearest(command, COMMANDS);
  fail(
    `unknown command ${pc.bold(command)}` +
      (near ? ` — did you mean ${pc.bold(near)}?` : '') +
      `\n\nRun ${pc.bold('dscheck --help')} to see every command.`,
  );
}

let files = expand(paths.length > 0 ? paths : ['.']);
if (typeof values.since === 'string') files = onlyChangedSince(files, values.since);

// W1: a run that checked nothing must never read as a clean pass. Silence is
// only meaningful when it means "checked, and found nothing".
if (files.length === 0) {
  const where = paths.length > 0 ? paths.join(', ') : 'the current directory';
  fail(
    `${pc.yellow('nothing to check')} — no lintable files under ${where}\n\n` +
      '  dscheck reads .css, .scss, .jsx, .tsx, .vue, .svelte, .astro and .html\n' +
      '  Check the path, or pass one explicitly:  dscheck check src',
  );
}
if (!coreModule.indexFor(files[0] as string)) {
  fail(
    `${pc.yellow('no design system found')} — ${pc.bold('nothing was checked')}\n\n` +
      '  dscheck enforces the tokens your project already defines, so it needs a\n' +
      '  token source: a Tailwind @theme, a :root block, or DTCG JSON.\n\n' +
      `  Find it automatically:  ${pc.bold('dscheck init')}\n` +
      '  Or name it yourself:    { "tokens": ["path/to/tokens.css"] }  in dscheck.config.json',
  );
}
const fixing = command === 'fix';
const findings = fixing
  ? await (await import('./run.js')).lintFiles(files, { fix: true })
  : await lintFilesParallel(files);
const root = process.cwd();

// Y2 filters: narrow what is reported without changing what was checked.
const onlyRules =
  typeof values.only === 'string'
    ? new Set(values.only.split(',').map((r) => `dscheck/${r.replace(/^dscheck\//, '')}`))
    : undefined;
const filtered = findings.filter(
  (f) =>
    (!onlyRules || onlyRules.has(f.rule)) &&
    (typeof values.severity !== 'string' || f.severity === values.severity),
);

if (fixing) {
  await render(findings, values.format as string);
  console.log(
    pc.dim(
      '\nExact-match fixes applied. Remaining findings need judgment — apply suggestions by hand or via editor.',
    ),
  );
  process.exitCode = findings.some((f) => f.severity === 'error') ? 1 : 0;
} else {
  await runCheckOrBaselineOrReport();
  if (values['explain-skips'] && command === 'check') explainSkips(files);
  if (values.watch && command === 'check') watchAndRelint(paths.length > 0 ? paths : ['.']);
}

/**
 * Make silence visible: an inventory of what this run deliberately did not
 * check. Counts are per-construct occurrences, matched to the supported-
 * surfaces contract (dscheck.dev → reference → supported surfaces).
 */
function explainSkips(linted: string[]): void {
  const { findConfig, isIgnored } = coreSync();
  let ignoredFiles = 0;
  let interpolatedDecls = 0;
  let dynamicClassExprs = 0;
  let mathLiterals = 0;
  const allInputs = expand(paths.length > 0 ? paths : ['.']);
  for (const file of allInputs) {
    const config = findConfig(file);
    if (config && isIgnored(file, config)) {
      ignoredFiles++;
      continue;
    }
    if (!linted.includes(file)) continue;
    const source = fsModule.readFileSync(file, 'utf8');
    if (/\.(jsx|tsx)$/.test(file)) {
      for (const template of source.matchAll(/(?:styled[.(]|css`|keyframes`)[^`]*`([^`]*)`/g)) {
        interpolatedDecls += (template[1]?.match(/\$\{[^}]*\}/g) ?? []).length;
      }
      dynamicClassExprs += (source.match(/className=\{(?![`'"])/g) ?? []).length;
    }
    mathLiterals += (source.match(/\b(?:calc|clamp|min|max)\(/g) ?? []).length;
  }
  console.log(
    `\n${pc.bold('deliberately not checked')} ${pc.dim('(see docs: supported surfaces)')}`,
  );
  const row = (n: number, label: string) => console.log(`  ${String(n).padStart(5)}  ${label}`);
  row(ignoredFiles, 'files exempted by config `ignore` globs');
  row(interpolatedDecls, 'interpolated css-in-js expressions (dynamic — never guessed)');
  row(dynamicClassExprs, 'dynamic className expressions (only static strings inside are read)');
  row(mathLiterals, 'calc()/clamp()/min()/max() occurrences (fluid values are a design decision)');
}

function coreSync(): typeof import('dscheck-core') {
  return coreModule;
}

/** Minimal watch loop: re-lint just the file that changed, instantly. */
function watchAndRelint(roots: string[]): void {
  console.log(pc.dim('\nwatching for changes… (ctrl-c to stop)'));
  const seenAt = new Map<string, number>();
  for (const root of roots) {
    fsModule.watch(resolve(root), { recursive: true }, (_event, name) => {
      if (!name || !/\.(css|scss|jsx|tsx)$/.test(name)) return;
      const file = resolve(root, name);
      const now = Date.now();
      if ((seenAt.get(file) ?? 0) > now - 150) return; // debounce editor double-writes
      seenAt.set(file, now);
      void (async () => {
        const { lintFiles } = await import('./run.js');
        const findings = await lintFiles([file]);
        const time = new Date().toLocaleTimeString();
        if (findings.length === 0) {
          console.log(pc.dim(`${time} `) + pc.green('✔') + pc.dim(` ${name}`));
        } else {
          for (const f of findings)
            console.log(
              pc.dim(`${time} `) +
                (f.severity === 'error' ? pc.red('✖') : pc.yellow('⚠')) +
                ` ${name}:${f.line} ${f.message}`,
            );
        }
      })();
    });
  }
  process.exitCode = 0;
}

async function runCheckOrBaselineOrReport(): Promise<void> {
  if (command === 'baseline') {
    const { writeBaseline, readBaseline, BASELINE_FILE } = await import('./baseline.js');
    const existing = values.update ? (readBaseline(root) ?? {}) : undefined;
    const written = writeBaseline(findings, root);
    if (existing) {
      // prune-only: --update never raises a count above what was accepted
      for (const [file, rules] of Object.entries(written)) {
        for (const [rule, entry] of Object.entries(rules)) {
          const accepted = existing[file]?.[rule]?.count;
          if (accepted !== undefined && accepted < entry.count) entry.count = accepted;
        }
      }
      const { writeFileSync } = await import('node:fs');
      writeFileSync(`${root}/${BASELINE_FILE}`, `${JSON.stringify(written, null, 2)}\n`);
      console.log(`baseline updated (prune-only) in ${BASELINE_FILE}`);
    } else {
      console.log(`${findings.length} findings recorded in ${BASELINE_FILE}`);
    }
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
  let reportable = filtered;
  if (baseline) {
    const { fresh, absorbed, stale } = applyBaseline(filtered, baseline, root);
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
  const warnings = reportable.filter((f) => f.severity !== 'error').length;
  const maxWarnings =
    typeof values['max-warnings'] === 'string' ? Number(values['max-warnings']) : undefined;
  const overBudget = maxWarnings !== undefined && warnings > maxWarnings;
  if (overBudget) {
    console.error(
      pc.yellow(`\n${warnings} warnings exceeds the --max-warnings budget of ${maxWarnings}`),
    );
  }
  process.exitCode = reportable.some((f) => f.severity === 'error') || overBudget ? 1 : 0;
}

function expand(inputs: string[]): string[] {
  const out = new Set<string>();
  for (const input of inputs) {
    const abs = resolve(input);
    if (isDir(abs)) {
      for (const f of globSync('**/*.{css,scss,jsx,tsx,vue,svelte,astro}', {
        cwd: abs,
        ignore: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
      }))
        out.add(resolve(abs, f));
    } else if (fsModule.existsSync(abs)) {
      out.add(abs);
    }
  }
  return [...out].sort();
}

/** Intersect the file list with git-changed files since a ref. */
function onlyChangedSince(files: string[], ref: string): string[] {
  const { execSync } = childProcess;
  const changed = new Set(
    execSync(
      `git diff --name-only --diff-filter=ACMR ${ref} -- . && git ls-files --others --exclude-standard`,
      {
        encoding: 'utf8',
        shell: '/bin/bash',
      },
    )
      .split('\n')
      .filter(Boolean)
      .map((f) => resolve(f)),
  );
  return files.filter((f) => changed.has(f));
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
    const { toSarif } = await import('dscheck-sarif'); // deferred: keeps the hook path light
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
  const { renderOptions, renderFindings, renderSummary } = await import('./render.js');
  const options = renderOptions({
    quiet: values.quiet === true,
    ...(values.ascii === true ? { ascii: true } : {}),
  });
  if (!options.quiet) for (const line of renderFindings(all, options)) console.log(line);
  else for (const f of all) console.log(`${f.file}:${f.line}:${f.col} ${f.message}`);
  if (!options.quiet) for (const line of renderSummary(all, options)) console.log(line);
}

/** Closest candidate by edit distance, when it is close enough to suggest. */
function nearest(input: string, candidates: string[]): string | undefined {
  const distance = (a: string, b: string): number => {
    let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const current = [i];
      for (let j = 1; j <= b.length; j++) {
        current[j] = Math.min(
          (previous[j] as number) + 1,
          (current[j - 1] as number) + 1,
          (previous[j - 1] as number) + (a[i - 1] === b[j - 1] ? 0 : 1),
        );
      }
      previous = current;
    }
    return previous[b.length] as number;
  };
  const [best] = candidates
    .map((candidate) => ({ candidate, d: distance(input, candidate) }))
    .sort((a, b) => a.d - b.d);
  return best && best.d <= 3 ? best.candidate : undefined;
}

function fail(message: string): never {
  console.error(message);
  process.exit(2);
}
