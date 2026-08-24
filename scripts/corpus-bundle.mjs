// M1: self-containment. Snapshots each corpus repo's *linted tree* (paths +
// token sources + config dir) into fixtures/corpus-bundles/<name>.tar.gz so
// upstream deletion or force-push degrades the nightly, never breaks it.
import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const corpus = JSON.parse(readFileSync('fixtures/corpus.json', 'utf8'));
mkdirSync('fixtures/corpus-bundles', { recursive: true });

for (const repo of corpus.repos) {
  const dir = mkdtempSync(join(tmpdir(), 'dscheck-bundle-'));
  execSync(`git clone --quiet --filter=blob:none ${repo.url} ${dir}`, { stdio: 'inherit' });
  execSync(`git -C ${dir} checkout --quiet ${repo.sha}`);
  const safe = repo.name.replaceAll('/', '__');
  // Only lintable text reaches the bundle — images/fonts are dead weight.
  const stage = mkdtempSync(join(tmpdir(), 'dscheck-stage-'));
  // '.' is always included for css/scss: the project-wide custom-property
  // name inventory (knownNames) reads every stylesheet in the repo.
  const roots = [
    ...new Set([...repo.paths, ...repo.config.tokens.map((t) => join(repo.configDir, t))]),
  ];
  const sweeps = [...roots.map((r) => ({ root: r, full: true })), { root: '.', full: false }];
  for (const { root, full } of sweeps) {
    const types = full
      ? `-name '*.css' -o -name '*.scss' -o -name '*.tsx' -o -name '*.jsx' -o -name '*.json'`
      : `-name '*.css' -o -name '*.scss'`;
    execSync(
      `cd '${dir}' && find '${root}' -type f \\( ${types} \\) -not -path '*/node_modules/*' | tar -cf - -T - | tar -xf - -C '${stage}'`,
      { shell: '/bin/bash', stdio: 'inherit' },
    );
  }
  execSync(`tar -czf fixtures/corpus-bundles/${safe}.tar.gz -C '${stage}' .`, {
    shell: '/bin/bash',
    stdio: 'inherit',
  });
  const size = statSync(`fixtures/corpus-bundles/${safe}.tar.gz`).size;
  console.log(`✔ ${safe}.tar.gz  ${(size / 1024 / 1024).toFixed(1)}MB`);
}
