// G2: FP audit harness. Samples findings from the corpus (first/middle/last per
// repo × rule — deterministic), and maintains fixtures/audit.json where each
// sampled finding is classified by a human: "true" | "false" | "unreviewed".
// CI fails on any "false" (a confirmed FP must become a fixtures/fp case and a
// code fix before the audit passes again). Unreviewed entries are listed.
import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const AUDIT_FILE = 'fixtures/audit.json';
const corpus = JSON.parse(readFileSync('fixtures/corpus.json', 'utf8'));
const cli = join(process.cwd(), 'packages/cli/dist/cli.js');
const audit = existsSync(AUDIT_FILE) ? JSON.parse(readFileSync(AUDIT_FILE, 'utf8')) : {};

let falseCount = 0;
let unreviewed = 0;

for (const repo of corpus.repos) {
  const dir = mkdtempSync(join(tmpdir(), 'dscheck-audit-'));
  execSync(`git clone --quiet --filter=blob:none ${repo.url} ${dir}`, { stdio: 'inherit' });
  execSync(`git -C ${dir} checkout --quiet ${repo.sha}`);
  writeFileSync(join(dir, repo.configDir, 'dscheck.config.json'), JSON.stringify(repo.config));
  const out = execSync(
    `node ${cli} check ${repo.paths.map((p) => join(dir, p)).join(' ')} --format json || true`,
    { cwd: join(dir, repo.configDir), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, shell: '/bin/bash' },
  );
  const findings = JSON.parse(out);
  const byRule = new Map();
  for (const f of findings) (byRule.get(f.rule) ?? byRule.set(f.rule, []).get(f.rule)).push(f);
  for (const [rule, list] of byRule) {
    const sample = [list[0], list[Math.floor(list.length / 2)], list.at(-1)].filter(
      (f, i, a) => f && a.indexOf(f) === i,
    );
    for (const f of sample) {
      const rel = f.file.replace(`${dir}/`, '');
      const id = `${repo.name}::${rule}::${rel}::${f.message}`;
      if (!(id in audit)) audit[id] = 'unreviewed';
      if (audit[id] === 'false') falseCount++;
      if (audit[id] === 'unreviewed') unreviewed++;
    }
  }
}

writeFileSync(AUDIT_FILE, `${JSON.stringify(audit, null, 2)}\n`);
const total = Object.keys(audit).length;
const trueCount = Object.values(audit).filter((v) => v === 'true').length;
console.log(`audit: ${total} sampled findings — ${trueCount} true, ${falseCount} FALSE, ${unreviewed} unreviewed`);
if (unreviewed > 0) {
  console.log('unreviewed entries (classify in fixtures/audit.json):');
  for (const [id, v] of Object.entries(audit)) if (v === 'unreviewed') console.log(`  ${id}`);
}
process.exit(falseCount > 0 ? 1 : 0);
