/**
 * Y3: a rule's contract, in the terminal. The text is derived from the same
 * docs page the website serves, so the two cannot drift — a conformance test
 * asserts every rule has a page and every page an entry here.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pc from 'picocolors';

export const RULE_IDS = [
  'no-raw-color',
  'no-raw-length',
  'no-unknown-token',
  'no-raw-font',
  'no-raw-shadow',
  'token-role',
  'no-unknown-class',
] as const;

const DOCS_URL = 'https://oddurs.github.io/dscheck/rules';

/** Rule pages ship with the CLI so `explain` works offline. */
function rulePage(rule: string): string | undefined {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const candidate of [
    join(here, 'rules', `${rule}.md`),
    join(here, '..', '..', '..', 'docs-site', 'src', 'content', 'docs', 'rules', `${rule}.md`),
  ]) {
    if (existsSync(candidate)) return readFileSync(candidate, 'utf8');
  }
  return undefined;
}

export function explainRule(rule: string): string | undefined {
  if (!(RULE_IDS as readonly string[]).includes(rule)) return undefined;
  const page = rulePage(rule);
  const description = page ? /^description:\s*(.+)$/m.exec(page)?.[1]?.trim() : undefined;
  const body = page
    ? page
        .replace(/^---[\s\S]*?---\n/, '')
        .split('\n')
        .filter((line) => !line.startsWith('import '))
        .join('\n')
        .trim()
    : undefined;

  const lines = ['', `${pc.bold(`dscheck/${rule}`)}${description ? ` — ${description}` : ''}`, ''];
  if (body) {
    // Terminal-readable markdown: strip link syntax, keep the words.
    lines.push(
      body
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/^#+\s*/gm, '')
        .replace(/\*\*/g, '')
        .split('\n')
        .map((line) => (line ? `  ${line}` : ''))
        .join('\n'),
    );
  }
  lines.push('', `  ${pc.dim(`${DOCS_URL}/${rule}/`)}`, '');
  return lines.join('\n');
}

export function completionScript(shell: 'fish' | 'zsh' | 'bash'): string {
  const commands = [
    'init',
    'check',
    'fix',
    'baseline',
    'report',
    'tokens',
    'roles',
    'explain',
    'completions',
    'help',
  ];
  const flags = [
    '--format',
    '--only',
    '--severity',
    '--max-warnings',
    '--quiet',
    '--ascii',
    '--since',
    '--watch',
    '--explain-skips',
    '--no-baseline',
    '--update',
    '--write',
    '--json',
    '--category',
    '--doctor',
    '--suggest',
    '--help',
    '--version',
  ];
  if (shell === 'fish') {
    return [
      '# dscheck completions — add to ~/.config/fish/completions/dscheck.fish',
      'complete -c dscheck -f',
      ...commands.map((c) => `complete -c dscheck -n __fish_use_subcommand -a ${c}`),
      ...flags.map((f) => `complete -c dscheck -l ${f.replace(/^--/, '')}`),
      ...RULE_IDS.map(
        (r) => `complete -c dscheck -n '__fish_seen_subcommand_from explain' -a ${r}`,
      ),
    ].join('\n');
  }
  if (shell === 'zsh') {
    return [
      '# dscheck completions — add to a directory on $fpath as _dscheck',
      '#compdef dscheck',
      '_arguments -C \\',
      `  '1:command:(${commands.join(' ')})' \\`,
      `  '*:option:(${flags.join(' ')})'`,
    ].join('\n');
  }
  return [
    '# dscheck completions — source from ~/.bashrc',
    '_dscheck() {',
    '  local cur="${COMP_WORDS[COMP_CWORD]}"',
    `  local words="${commands.join(' ')} ${flags.join(' ')}"`,
    '  COMPREPLY=( $(compgen -W "$words" -- "$cur") )',
    '}',
    'complete -F _dscheck dscheck',
  ].join('\n');
}
