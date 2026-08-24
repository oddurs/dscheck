import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import pc from 'picocolors';
import { globSync } from 'tinyglobby';

export interface InitPlan {
  tokenFiles: string[];
  /** Non-`:root` selectors that hold the system (scoped systems like `.excalidraw`). */
  rootSelectors: string[];
  /** Custom-property names that look runtime-injected — proposed `allow` globs. */
  allow: string[];
  /** Linters already present, so we print the right integration snippet. */
  hosts: Array<'eslint' | 'stylelint'>;
  tokenCount: number;
}

/**
 * Detect what a project already has, so adoption is a decision rather than a
 * configuration exercise. Detection only — nothing is written until asked.
 */
export function planInit(root: string): InitPlan {
  // Monorepos are the common case, not the exception: look under packages/*
  // and apps/* too, and deep enough to reach a design-system package.
  const css = globSync(
    [
      '*.{css,scss}',
      '{app,src,styles,css,assets}/**/*.{css,scss}',
      '{packages,apps,libs}/*/{,src/,app/,css/,styles/}**/*.{css,scss}',
    ],
    {
      cwd: root,
      deep: 7,
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.next/**',
        '**/build/**',
        '**/tests/**',
        '**/__tests__/**',
        '**/fixtures/**',
      ],
    },
  );

  // A token source is a file that *defines* the system: @theme, or a :root
  // block with several custom properties (one stray --x isn't a system).
  const scored = css
    .map((file) => {
      const text = readFileSync(join(root, file), 'utf8');
      const theme = /@theme[\s{]/.test(text);
      const rootVars = (text.match(/^\s*--[\w-]+\s*:/gm) ?? []).length;
      return {
        file,
        score: (theme ? 1000 : 0) + rootVars,
        theme,
        rootVars,
        scopes: scopedSystemSelectors(text),
      };
    })
    .filter((c) => c.theme || c.rootVars >= 5)
    .sort((a, b) => b.score - a.score);

  const dtcg = globSync(['tokens.json', '*.tokens.json', '{tokens,design-tokens}/**/*.json'], {
    cwd: root,
    deep: 4,
    ignore: ['**/node_modules/**'],
  });

  // A component file can declare its own custom properties without being a
  // token source. Prefer files that look like the system: @theme, or a
  // system-ish name, or living in a css/styles directory. Fall back to the
  // top scorers only when nothing looks canonical.
  const canonical = scored.filter(
    (c) =>
      c.theme ||
      /(^|\/)(tokens?|theme|themes|variables?|globals?|root|base|design-tokens)[.\-_]/i.test(
        c.file,
      ) ||
      /(^|\/)(css|styles)\/[^/]*$/i.test(c.file),
  );
  const chosen = (canonical.length > 0 ? canonical : scored.slice(0, 2)).slice(0, 6);
  const tokenFiles = [...chosen.map((c) => c.file), ...dtcg];

  // Vendor/runtime-injected names the project references but never declares.
  const declared = new Set<string>();
  const used = new Set<string>();
  for (const file of css) {
    const text = readFileSync(join(root, file), 'utf8');
    for (const m of text.matchAll(/(--[\w-]+)\s*:/g)) declared.add(m[1] as string);
    for (const m of text.matchAll(/var\((--[\w-]+)/g)) used.add(m[1] as string);
  }
  const undeclaredPrefixes = new Set<string>();
  for (const name of used) {
    if (declared.has(name)) continue;
    const prefix = /^(--[a-z]+)-/.exec(name)?.[1];
    if (
      prefix &&
      !/^--(color|spacing|text|font|radius|shadow|ease|tracking|leading)$/.test(prefix)
    ) {
      undeclaredPrefixes.add(`${prefix}-*`);
    }
  }

  const pkg = existsSync(join(root, 'package.json'))
    ? JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    : {};
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const hosts: Array<'eslint' | 'stylelint'> = [];
  if (deps?.eslint || globSync('eslint.config.*', { cwd: root }).length > 0) hosts.push('eslint');
  if (deps?.stylelint || globSync('.stylelintrc*', { cwd: root }).length > 0)
    hosts.push('stylelint');

  const tokenCount = chosen.reduce((n, c) => n + c.rootVars, 0);
  const rootSelectors = [...new Set(chosen.flatMap((c) => c.scopes))];
  return { tokenFiles, rootSelectors, allow: [...undeclaredPrefixes].sort(), hosts, tokenCount };
}

/**
 * A scoped system: a selector that isn't `:root` but carries many custom
 * properties — Excalidraw's `.excalidraw`, a widget's `.my-lib`. Reported so
 * init can propose `rootSelectors` instead of silently finding nothing.
 */
function scopedSystemSelectors(text: string): string[] {
  const found: string[] = [];
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    const selector = /^\s*([.#][\w-]+)\s*(?:,[^{]*)?\{\s*$/.exec(line)?.[1];
    if (!selector) return;
    // `.dark` / `.light` / theme classes are MODE scopes — dscheck reads those
    // natively. Proposing them as roots would make a theme's values primary.
    if (/^\.(dark|light|theme-|mode-)/.test(selector)) return;
    // Count the custom properties declared directly in this block, stopping at
    // the first nested rule — SCSS nesting defeats a brace-matching regex.
    let vars = 0;
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j] as string;
      if (/\{\s*$/.test(next) || /^\s*\}/.test(next)) break;
      if (/^\s*--[\w-]+\s*:/.test(next)) vars++;
    }
    if (vars >= 5) found.push(selector);
  });
  return [...new Set(found)];
}

/** Render the plan and, when asked, write the config. */
export function runInit(root: string, write: boolean): number {
  const plan = planInit(root);

  if (plan.tokenFiles.length === 0) {
    console.error(pc.red('✖ no design system found'));
    console.error(
      '\n  dscheck needs a token source: a Tailwind `@theme` block, a `:root` with custom\n' +
        '  properties, or a DTCG JSON file. Point at one explicitly with:\n\n' +
        '    { "tokens": ["path/to/tokens.css"] }   in dscheck.config.json\n',
    );
    return 1;
  }

  const config = {
    $schema: 'https://oddurs.github.io/dscheck/config.schema.json',
    tokens: plan.tokenFiles,
    ...(plan.rootSelectors.length > 0 ? { rootSelectors: plan.rootSelectors } : {}),
    ...(plan.allow.length > 0 ? { allow: plan.allow } : {}),
  };

  console.log(pc.bold('\nfound'));
  for (const file of plan.tokenFiles) console.log(`  ${pc.green('✔')} ${file}`);
  if (plan.rootSelectors.length > 0) {
    console.log(
      `  ${pc.dim('scoped system detected, root selectors:')} ${plan.rootSelectors.join(', ')}`,
    );
  }
  if (plan.allow.length > 0) {
    console.log(`  ${pc.dim('runtime-injected names to allow:')} ${plan.allow.join(', ')}`);
  }

  const configPath = join(root, 'dscheck.config.json');
  if (write) {
    if (existsSync(configPath)) {
      console.error(
        pc.yellow(`\n! ${relative(root, configPath)} already exists — not overwriting`),
      );
      return 1;
    }
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
    console.log(`\n${pc.green('✔')} wrote dscheck.config.json`);
  } else {
    console.log(`\n${pc.bold('dscheck.config.json')} ${pc.dim('(run with --write to create)')}`);
    console.log(
      JSON.stringify(config, null, 2)
        .split('\n')
        .map((l) => `  ${l}`)
        .join('\n'),
    );
  }

  console.log(pc.bold('\nnext'));
  console.log('  1. see what it finds       dscheck check .');
  console.log('  2. accept existing debt    dscheck baseline .   ' + pc.dim('(commit the file)'));
  console.log(
    '  3. gate new drift in CI    dscheck check .      ' + pc.dim('(fails only on new findings)'),
  );

  if (plan.hosts.includes('eslint')) {
    console.log(pc.bold('\neslint — you already run it, so add:'));
    console.log(pc.dim("  import dscheck from 'eslint-plugin-dscheck';"));
    console.log(pc.dim('  export default [dscheck.configs.recommended];'));
  }
  if (plan.hosts.includes('stylelint')) {
    console.log(pc.bold('\nstylelint — you already run it, so add:'));
    console.log(pc.dim("  plugins: ['stylelint-dscheck'],"));
    console.log(
      pc.dim("  rules: { 'dscheck/no-raw-color': true, 'dscheck/no-unknown-token': true },"),
    );
  }
  console.log('');
  return 0;
}
