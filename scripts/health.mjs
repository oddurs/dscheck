// O5: one screen of project health, no telemetry — run monthly (RUNBOOK ritual),
// commit the output to fixtures/health/.
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const sh = (cmd) => {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
};
const line = (label, value) => console.log(`${label.padEnd(26)} ${value}`);

console.log(`# dscheck health — ${sh('git log -1 --format=%cs') ?? 'unknown date'}\n`);

const downloads = sh('npm view dscheck --json 2>/dev/null')
  ? (sh("curl -sf https://api.npmjs.org/downloads/point/last-week/dscheck | jq -r '.downloads'") ??
    'n/a')
  : 'not published yet';
line('npm downloads (week)', downloads);
line('last release', sh('git tag --sort=-creatordate | head -1') || 'none yet');
line('last commit', `${sh('git log -1 --format=%cs')} (${sh('git log -1 --format=%h')})`);
line('tests', sh("pnpm test 2>&1 | grep -o 'Tests.*' | head -1") ?? 'run failed');

const audit = existsSync('fixtures/audit.json')
  ? Object.values(JSON.parse(readFileSync('fixtures/audit.json', 'utf8')))
  : [];
line(
  'audit',
  `${audit.length} sampled — ${audit.filter((v) => v === 'false').length} FALSE, ${audit.filter((v) => v === 'unreviewed').length} unreviewed`,
);
line('fp corpus', `${readdirSync('fixtures/fp').filter((d) => /^\d{3}-/.test(d)).length} cases`);

const corpus = JSON.parse(readFileSync('fixtures/corpus.json', 'utf8'));
const oldestPin = corpus.repos.map((r) => `${r.name}@${r.sha}`).join(', ');
line('corpus pins', oldestPin);
const perf = existsSync('fixtures/perf-history.jsonl')
  ? readFileSync('fixtures/perf-history.jsonl', 'utf8').trim().split('\n').length
  : 0;
line('perf history', `${perf} samples`);
line(
  'open FP issues',
  sh('gh issue list --label fp --json number --jq length 2>/dev/null') ??
    'n/a (private/pre-public)',
);
line(
  'tw-canary',
  sh("gh run list --workflow tw-canary -L 1 --json conclusion --jq '.[0].conclusion'") ??
    'never run',
);
line(
  'quarantined tests',
  sh("grep -rn 'it.skip' packages/*/src --include='*.test.ts' | wc -l | tr -d ' '") ?? '?',
);
