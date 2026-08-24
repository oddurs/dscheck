// I3: fix at scale. Copies each corpus repo, runs `dscheck fix`, re-lints, and
// records the evidence: findings before → after, files changed, zero new
// findings, zero parse damage. The committed summary is the proof trail.
import { execSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const corpus = JSON.parse(readFileSync('fixtures/corpus.json', 'utf8'));
const cli = join(process.cwd(), 'packages/cli/dist/cli.js');
const summary = [];
let failed = false;

for (const repo of corpus.repos) {
  const src = mkdtempSync(join(tmpdir(), 'dscheck-fixrun-src-'));
  execSync(`git clone --quiet --filter=blob:none ${repo.url} ${src}`, { stdio: 'inherit' });
  execSync(`git -C ${src} checkout --quiet ${repo.sha}`);
  writeFileSync(join(src, repo.configDir, 'dscheck.config.json'), JSON.stringify(repo.config));

  const run = (cmd) =>
    execSync(`${cmd} || true`, {
      cwd: join(src, repo.configDir),
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      shell: '/bin/bash',
    });
  const paths = repo.paths.map((p) => join(src, p)).join(' ');
  const before = JSON.parse(run(`node ${cli} check ${paths} --format json`));
  run(`node ${cli} fix ${paths}`);
  const after = JSON.parse(run(`node ${cli} check ${paths} --format json`));
  const changed = execSync(`git -C ${src} diff --name-only | wc -l`, { encoding: 'utf8' }).trim();

  const key = (f) => `${f.rule}::${f.message}`;
  const beforeKeys = new Set(before.map(key));
  const newFindings = after.filter((f) => !beforeKeys.has(key(f)));
  const unparsed = after.filter((f) => f.rule === 'dscheck/unparsed').length;
  const ok = newFindings.length === 0 && unparsed === 0 && after.length <= before.length;
  if (!ok) failed = true;

  summary.push({
    repo: `${repo.name}@${repo.sha}`,
    before: before.length,
    after: after.length,
    fixed: before.length - after.length,
    filesChanged: Number(changed),
    newFindings: newFindings.length,
    parseDamage: unparsed,
  });
  console.log(
    `${ok ? '✔' : '✖'} ${repo.name}: ${before.length} → ${after.length} findings ` +
      `(${before.length - after.length} fixed across ${changed} files; new: ${newFindings.length}, damage: ${unparsed})`,
  );
}

writeFileSync('fixtures/fix-runs/latest.json', `${JSON.stringify(summary, null, 2)}\n`);
process.exit(failed ? 1 : 0);
