// Corpus CI: lint pinned real-world repos; any drift from expected counts is
// a rule regression (false positives) or a rule improvement — either way, a
// human looks before the number moves. Enforces the <5% FP budget in practice,
// and asserts the perf budget on real codebases.
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const corpus = JSON.parse(readFileSync('fixtures/corpus.json', 'utf8'));
const cli = join(process.cwd(), 'packages/cli/dist/cli.js');
let failed = false;

for (const repo of corpus.repos) {
  const dir = mkdtempSync(join(tmpdir(), 'dscheck-corpus-'));
  execSync(`git clone --quiet --filter=blob:none ${repo.url} ${dir}`, { stdio: 'inherit' });
  execSync(`git -C ${dir} checkout --quiet ${repo.sha}`);
  writeFileSync(join(dir, repo.configDir, 'dscheck.config.json'), JSON.stringify(repo.config));

  const started = Date.now();
  const out = execSync(
    `node ${cli} check ${repo.paths.map((p) => join(dir, p)).join(' ')} --format json || true`,
    {
      cwd: join(dir, repo.configDir),
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      shell: '/bin/bash',
    },
  );
  const elapsed = Date.now() - started;

  const findings = JSON.parse(out);
  const errors = findings.filter((f) => f.severity === 'error').length;
  const warnings = findings.length - errors;
  const files = Number(
    execSync(
      `git -C ${dir} ls-files -- ${repo.paths.map((p) => `'${p}/*.tsx' '${p}/*.jsx' '${p}/*.css' '${p}/*.scss'`).join(' ')} | wc -l`,
      { encoding: 'utf8', shell: '/bin/bash' },
    ),
  );
  const msPerFile = files > 0 ? elapsed / files : 0;

  const countsOk = errors === repo.expected.errors && warnings === repo.expected.warnings;
  const perfOk = msPerFile <= corpus.perfBudgetMsPerFile;
  if (!countsOk || !perfOk) failed = true;

  const byRule = {};
  for (const f of findings) byRule[f.rule] = (byRule[f.rule] ?? 0) + 1;
  console.log(
    `${countsOk && perfOk ? '✔' : '✖'} ${repo.name}@${repo.sha}: ${errors} errors, ${warnings} warnings ` +
      `(expected ${repo.expected.errors}/${repo.expected.warnings}) — ` +
      `${files} files in ${(elapsed / 1000).toFixed(1)}s (${msPerFile.toFixed(1)}ms/file, budget ${corpus.perfBudgetMsPerFile})`,
  );
  for (const [rule, n] of Object.entries(byRule).sort((a, b) => b[1] - a[1]))
    console.log(`    ${String(n).padStart(5)}  ${rule}`);
}
process.exit(failed ? 1 : 0);
