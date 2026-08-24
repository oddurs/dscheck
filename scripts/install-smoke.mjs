// Proves delivery, not just behaviour.
//
//   default          pack the local tarballs and install them — pre-publish gate
//   --registry [ver] install the PUBLISHED packages from npm — post-publish watch
//
// Either way it asserts the documented first run yields real findings with a real
// token suggestion. Catches what unit tests can't: files/exports/deps wrong in the
// published shape, or a publish that shipped something broken.
import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const registryMode = process.argv.includes('--registry');
const registryVersion =
  process.argv[process.argv.indexOf('--registry') + 1]?.startsWith('-') ||
  !process.argv[process.argv.indexOf('--registry') + 1]
    ? 'latest'
    : process.argv[process.argv.indexOf('--registry') + 1];
const staging = mkdtempSync(join(tmpdir(), 'dscheck-tarballs-'));
const PACKAGES = ['core', 'tw', 'sarif', 'eslint-plugin', 'stylelint-plugin', 'cli'];

// Pack the real publishable artifact for each package, then unpack it: the
// extracted tree is exactly the published file set, so `files`, `exports`, and
// dependency declarations are all under test.
const unpacked = new Map();
for (const pkg of registryMode ? [] : PACKAGES) {
  execSync(`npm pack --pack-destination "${staging}"`, {
    cwd: join(root, 'packages', pkg),
    stdio: 'pipe',
  });
}
for (const tarball of registryMode ? [] : readdirSync(staging).filter((f) => f.endsWith('.tgz'))) {
  const dir = join(staging, tarball.replace(/\.tgz$/, ''));
  mkdirSync(dir, { recursive: true });
  execSync(`tar -xzf "${join(staging, tarball)}" -C "${dir}"`, { stdio: 'pipe' });
  const manifest = JSON.parse(readFileSync(join(dir, 'package', 'package.json'), 'utf8'));
  unpacked.set(manifest.name, join(dir, 'package'));
}
// Pre-release, workspace:* has no registry counterpart — point the internal
// deps at their sibling packed trees, which is what `changeset publish`
// resolves them to for real. Everything else installs from the registry.
for (const [name, dir] of unpacked) {
  const file = join(dir, 'package.json');
  const manifest = JSON.parse(readFileSync(file, 'utf8'));
  for (const field of ['dependencies', 'devDependencies']) {
    for (const [dep, range] of Object.entries(manifest[field] ?? {})) {
      if (String(range).startsWith('workspace:')) {
        manifest[field][dep] = `file:${unpacked.get(dep)}`;
      }
    }
  }
  delete manifest.devDependencies;
  writeFileSync(file, JSON.stringify(manifest, null, 2));
  console.log(`unpacked ${name}`);
}

const project = mkdtempSync(join(tmpdir(), 'dscheck-consumer-'));
writeFileSync(
  join(project, 'package.json'),
  JSON.stringify({ name: 'consumer', private: true, type: 'module' }),
);
writeFileSync(
  join(project, 'tokens.css'),
  '@theme { --color-primary: #1d4ed8; --spacing-3: 12px; }\n',
);
writeFileSync(join(project, 'dscheck.config.json'), JSON.stringify({ tokens: ['tokens.css'] }));
writeFileSync(
  join(project, 'component.css'),
  '.a { color: #1d4ed8; padding: 14px; background: var(--color-primry); }\n',
);

// Install every package explicitly: npm links directory deps rather than
// resolving them transitively, so each must be present in the consumer.
if (registryMode) {
  console.log(`installing dscheck-cli@${registryVersion} from the registry`);
  execSync(`npm install --no-audit --no-fund dscheck-cli@${registryVersion}`, {
    cwd: project,
    stdio: 'inherit',
  });
} else {
  // --install-links copies file: deps into node_modules instead of symlinking,
  // so module resolution happens from the consumer's tree — exactly how a
  // registry install behaves.
  execSync(
    `npm install --no-audit --no-fund --install-links ${[...unpacked.values()]
      .map((d) => `"${d}"`)
      .join(' ')}`,
    { cwd: project, stdio: 'inherit' },
  );
}

const cliBin = join(project, 'node_modules', '.bin', 'dscheck');
const out = execSync(`"${cliBin}" check component.css --format json || true`, {
  cwd: project,
  encoding: 'utf8',
  shell: process.platform === 'win32' ? undefined : '/bin/bash',
});
let findings;
try {
  findings = JSON.parse(out);
} catch {
  console.error('✖ installed CLI produced no parseable output:');
  console.error(out.slice(0, 2000));
  process.exit(1);
}
const rules = new Set(findings.map((f) => f.rule));
console.log(`first run: ${findings.length} findings — ${[...rules].join(', ')}`);

const expected = ['dscheck/no-raw-color', 'dscheck/no-raw-length', 'dscheck/no-unknown-token'];
const missing = expected.filter((r) => !rules.has(r));
if (missing.length > 0) {
  console.error(`✖ installed package did not report: ${missing.join(', ')}`);
  process.exit(1);
}
// the suggestion must name a real token — proves the resolver shipped intact
const suggestion = findings.find((f) => f.rule === 'dscheck/no-raw-color')?.suggestion;
if (suggestion !== 'var(--color-primary)') {
  console.error(`✖ expected var(--color-primary), got ${suggestion}`);
  process.exit(1);
}
console.log(
  registryMode
    ? `✔ registry smoke: dscheck-cli@${registryVersion} installs from npm and reports correctly`
    : '✔ install smoke: a fresh project gets correct findings from the packed tarballs',
);
