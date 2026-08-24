// Corpus CI: lint pinned real-world repos; any drift from expected counts is
// a rule regression (false positives) or a rule improvement — either way, a
// human looks before the number moves (re-pin protocol in RUNBOOK.md).
//
// Durability posture:
//  - upstream clone failures retry once, then fall back to a LOCAL cache
//    (fixtures/corpus-bundles, gitignored) when one has been built — external
//    deletion degrades the run rather than breaking it (M1). The cache is
//    never committed: the corpus repos carry their own licenses (one AGPL,
//    one with none at all), so redistributing their source from this MIT
//    repository would misrepresent them. Build it with corpus-bundle.mjs.
//  - availability problems exit 3, distinct from count regressions' 1 (M2)
//  - per-repo ms/file is checked against 2× the trailing median of
//    fixtures/perf-history.jsonl, inside the absolute budget (O1);
//    run with --record to append today's numbers
import { execSync } from 'node:child_process';
import {
  appendFileSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const corpus = JSON.parse(readFileSync('fixtures/corpus.json', 'utf8'));
const cli = join(process.cwd(), 'packages/cli/dist/cli.js');
const record = process.argv.includes('--record');
const offline = process.env.DSCHECK_CORPUS_OFFLINE === '1';
const history = existsSync('fixtures/perf-history.jsonl')
  ? readFileSync('fixtures/perf-history.jsonl', 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l))
  : [];

let regression = false;
let availabilityProblems = 0;

function materialize(repo) {
  const dir = mkdtempSync(join(tmpdir(), 'dscheck-corpus-'));
  if (!offline) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        execSync(`git clone --quiet --filter=blob:none ${repo.url} ${dir}`, { stdio: 'pipe' });
        execSync(`git -C ${dir} checkout --quiet ${repo.sha}`, { stdio: 'pipe' });
        return dir;
      } catch {
        // transient? retry once, then fall through to the bundle
      }
    }
  }
  const bundle = `fixtures/corpus-bundles/${repo.name.replaceAll('/', '__')}.tar.gz`;
  if (!existsSync(bundle)) return undefined;
  execSync(`tar -xzf '${bundle}' -C '${dir}'`, { shell: '/bin/bash' });
  console.error(`⚠ ${repo.name}: upstream unavailable — running from local cache`);
  availabilityProblems++;
  return dir;
}

function countLintable(root, paths) {
  let count = 0;
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules') walk(full);
      } else if (/\.(css|scss|tsx|jsx)$/.test(entry.name)) count++;
    }
  };
  for (const p of paths) if (existsSync(join(root, p))) walk(join(root, p));
  return count;
}

for (const repo of corpus.repos) {
  const dir = materialize(repo);
  if (!dir) {
    console.error(`✖ ${repo.name}: neither upstream nor bundle available`);
    availabilityProblems++;
    continue;
  }
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
  const files = countLintable(dir, repo.paths);
  // Amortize the ~0.5s node/host startup so tiny file sets aren't judged on it.
  const msPerFile = files > 0 ? Math.max(0, elapsed - 500) / files : 0;

  const countsOk = errors === repo.expected.errors && warnings === repo.expected.warnings;
  const budgetOk = msPerFile <= corpus.perfBudgetMsPerFile;
  const trailing = history
    .filter((h) => h.repo === repo.name)
    .slice(-7)
    .map((h) => h.msPerFile)
    .sort((a, b) => a - b);
  const median = trailing.length >= 3 ? trailing[Math.floor(trailing.length / 2)] : undefined;
  // Below ~2ms/file the measurement is dominated by machine noise (other work
  // on the box moves it several-fold), so the trend gate would cry wolf. The
  // absolute budget still applies everywhere; the trend only judges runs big
  // enough to mean something.
  const NOISE_FLOOR_MS = 2;
  const trendApplies = median !== undefined && median >= NOISE_FLOOR_MS && files >= 100;
  const trendOk = !trendApplies || msPerFile <= median * 2;
  if (!countsOk || !budgetOk || !trendOk) regression = true;

  const byRule = {};
  for (const f of findings) byRule[f.rule] = (byRule[f.rule] ?? 0) + 1;
  console.log(
    `${countsOk && budgetOk && trendOk ? '✔' : '✖'} ${repo.name}@${repo.sha}: ${errors} errors, ${warnings} warnings ` +
      `(expected ${repo.expected.errors}/${repo.expected.warnings}) — ` +
      `${files} files, ${msPerFile.toFixed(1)}ms/file (budget ${corpus.perfBudgetMsPerFile}` +
      `${median !== undefined ? `, trailing median ${median.toFixed(1)}` : ''})`,
  );
  for (const [rule, n] of Object.entries(byRule).sort((a, b) => b[1] - a[1]))
    console.log(`    ${String(n).padStart(5)}  ${rule}`);
  if (record) {
    appendFileSync(
      'fixtures/perf-history.jsonl',
      `${JSON.stringify({ repo: repo.name, msPerFile: Number(msPerFile.toFixed(2)), files })}\n`,
    );
  }
}

if (regression) process.exit(1);
if (availabilityProblems > 0) process.exit(3);
