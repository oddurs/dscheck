// R6/R3: the brand's writing rules, enforced like the visual ones.
//  - banned filler ("simply", "easily", …) and exclamation marks in prose
//  - "dscheck" is lowercase in prose (code identifiers exempt)
//  - every rule page follows the template, and its stated default severity
//    matches the code's DEFAULT_SEVERITIES — docs cannot drift from behavior
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const docs = join(root, 'docs-site/src/content/docs');
const problems = [];

// code's own defaults, parsed from source — the single source of truth
const runSource = readFileSync(join(root, 'packages/cli/src/run.ts'), 'utf8');
const defaultsBlock = /DEFAULT_SEVERITIES[^{]*\{([^}]*)\}/.exec(runSource)?.[1] ?? '';
const CODE_DEFAULTS = Object.fromEntries(
  [...defaultsBlock.matchAll(/'([\w-]+)':\s*'(\w+)'/g)].map((m) => [m[1], m[2]]),
);

const BANNED = /\b(simply|easily|effortlessly|obviously|of course|just do)\b/i;

function stripCode(text) {
  return text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
}

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(md|mdx)$/.test(entry.name)) checkFile(full);
  }
}

function checkFile(file) {
  const rel = relative(root, file);
  const raw = readFileSync(file, 'utf8');
  const prose = stripCode(raw);

  for (const [i, line] of prose.split('\n').entries()) {
    if (line.includes('prose-lint-ignore')) continue;
    const banned = BANNED.exec(line);
    if (banned) problems.push(`${rel}:${i + 1}: banned filler "${banned[1]}"`);
    if (/[a-z]!(\s|$)/.test(line) && !line.includes('![')) {
      problems.push(`${rel}:${i + 1}: exclamation mark in prose`);
    }
    if (/\b(Dscheck|DSCheck|DsCheck|DS-check)\b/.test(line)) {
      problems.push(`${rel}:${i + 1}: the name is lowercase "dscheck" in prose`);
    }
  }

  // rule pages follow the template and agree with the code
  if (rel.includes('/rules/')) {
    const ruleId = /([\w-]+)\.md$/.exec(rel)?.[1];
    if (!/\*\*Default severity:?\*\*/.test(raw)) {
      problems.push(`${rel}: rule page missing "**Default severity:**"`);
    }
    if (!/\*\*Not flagged:?\*\*|## |not flagged/i.test(raw)) {
      problems.push(`${rel}: rule page missing a not-flagged section`);
    }
    const stated = /\*\*Default severity:?\*\*\s*(\w+)/.exec(raw)?.[1]?.toLowerCase();
    const inCode = CODE_DEFAULTS[ruleId];
    if (stated && inCode) {
      const normalized = stated === 'warning' ? 'warn' : stated;
      if (normalized !== inCode) {
        problems.push(`${rel}: states default "${stated}" but code says "${inCode}"`);
      }
    }
  }
}

walk(docs);
checkFile(join(root, 'README.md'));
if (problems.length > 0) {
  for (const p of problems) console.error(`✖ ${p}`);
  process.exit(1);
}
console.log(
  `✔ prose honest: rules match code defaults (${Object.keys(CODE_DEFAULTS).length} rules), voice clean`,
);
