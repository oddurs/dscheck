// Q3/Q4: docs that cannot rot. Every fenced example in the docs is checked
// against reality — config JSON against the published schema, `dscheck …`
// invocations against the real CLI, rule references against the registry —
// and every page must carry a real description. A doctored example fails CI.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const docs = join(root, 'docs-site/src/content/docs');
const schema = JSON.parse(readFileSync(join(root, 'docs-site/public/config.schema.json'), 'utf8'));
const CONFIG_KEYS = new Set(Object.keys(schema.properties));
const TOLERANCE_KEYS = new Set(Object.keys(schema.properties.tolerance.properties));

const help = execFileSync('node', [join(root, 'packages/cli/dist/cli.js'), '--help'], {
  encoding: 'utf8',
});
const COMMANDS = new Set([...help.matchAll(/^\s{2}dscheck (\w[\w-]*)/gm)].map((m) => m[1]));
const FLAGS = new Set([...help.matchAll(/(--[\w-]+)/g)].map((m) => m[1]));
const RULES = new Set([
  'no-raw-color',
  'no-raw-length',
  'no-unknown-token',
  'no-raw-font',
  'no-raw-shadow',
  'token-role',
  'no-unknown-class',
  'unparsed',
]);

const problems = [];
let checkedBlocks = 0;

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(md|mdx)$/.test(entry.name)) checkFile(full);
  }
}

function checkFile(file) {
  const rel = relative(root, file);
  const text = readFileSync(file, 'utf8');

  // Q4: every page describes itself
  const description = /^description:\s*(.+)$/m.exec(text)?.[1]?.trim();
  if (!description || description.replace(/['"]/g, '').length < 15) {
    problems.push(`${rel}: missing or too-short frontmatter description`);
  }

  for (const match of text.matchAll(/```(\w+)[^\n]*\n([\s\S]*?)```/g)) {
    const [, lang, body] = match;
    // dscheck config examples must satisfy the published schema's keys
    if (/^jsonc?$/.test(lang) && /"tokens"\s*:/.test(body)) {
      checkedBlocks++;
      const stripped = body.replace(/\/\/[^\n]*/g, '').replace(/,\s*([}\]])/g, '$1');
      try {
        const parsed = JSON.parse(stripped);
        for (const key of Object.keys(parsed)) {
          if (key.startsWith('x-')) continue;
          if (!CONFIG_KEYS.has(key))
            problems.push(`${rel}: config example uses unknown key "${key}"`);
        }
        for (const key of Object.keys(parsed.tolerance ?? {})) {
          if (!TOLERANCE_KEYS.has(key)) problems.push(`${rel}: tolerance example key "${key}"`);
        }
      } catch (error) {
        problems.push(`${rel}: config example does not parse (${error.message})`);
      }
    }
    // every `dscheck <cmd> --flag` must exist
    for (const cmd of body.matchAll(
      /(?:^|[$>]\s*|npx )dscheck\s+(\w[\w-]*)((?:\s+--?[\w-]+)*)/gm,
    )) {
      checkedBlocks++;
      if (!COMMANDS.has(cmd[1])) problems.push(`${rel}: unknown command "dscheck ${cmd[1]}"`);
      for (const flag of cmd[2].matchAll(/--[\w-]+/g)) {
        if (!FLAGS.has(flag[0]))
          problems.push(`${rel}: unknown flag "${flag[0]}" on dscheck ${cmd[1]}`);
      }
    }
    // every rule reference is a real rule
    // rule references only — not package names (@dscheck/core) or repo paths
    // (oddurs/dscheck/action)
    for (const rule of body.matchAll(/(?<![@/\w])dscheck\/([\w-]+)/g)) {
      checkedBlocks++;
      if (!RULES.has(rule[1])) problems.push(`${rel}: unknown rule "dscheck/${rule[1]}"`);
    }
  }
}

walk(docs);
if (problems.length > 0) {
  for (const p of problems) console.error(`✖ ${p}`);
  process.exit(1);
}
console.log(`✔ docs snippets honest: ${checkedBlocks} checks across the site, 0 problems`);
