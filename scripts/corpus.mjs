// Corpus CI: lint pinned real-world repos; any drift from expected counts is
// a rule regression (false positives) or a rule improvement — either way, a
// human looks before the number moves. Enforces the <5% FP budget in practice.
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const corpus = JSON.parse(readFileSync('fixtures/corpus.json', 'utf8'));
const cli = join(process.cwd(), 'packages/cli/dist/cli.js');
let failed = false;

for (const repo of corpus.repos) {
  const dir = mkdtempSync(join(tmpdir(), 'offsystem-corpus-'));
  execSync(`git clone --quiet --filter=blob:none ${repo.url} ${dir}`, { stdio: 'inherit' });
  execSync(`git -C ${dir} checkout --quiet ${repo.sha}`);
  writeFileSync(join(dir, 'offsystem.config.json'), JSON.stringify(repo.config));
  const out = execSync(
    `node ${cli} check ${repo.paths.map((p) => join(dir, p)).join(' ')} --format json || true`,
    { cwd: dir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, shell: '/bin/bash' },
  );
  const findings = JSON.parse(out);
  const errors = findings.filter((f) => f.severity === 'error').length;
  const warnings = findings.length - errors;
  const ok = errors === repo.expected.errors && warnings === repo.expected.warnings;
  console.log(
    `${ok ? '✔' : '✖'} ${repo.name}@${repo.sha}: ${errors} errors, ${warnings} warnings ` +
      `(expected ${repo.expected.errors}/${repo.expected.warnings})`,
  );
  if (!ok) failed = true;
}
process.exit(failed ? 1 : 0);
