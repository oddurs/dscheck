import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createSyncFn } from 'synckit';

export interface ParsedClass {
  /** The class as written, variants stripped: `p-[13px]` for `md:p-[13px]`. */
  base: string;
  root: string;
  kind: 'named' | 'arbitrary' | 'static' | 'unknown';
  /** Arbitrary value content, when kind is arbitrary. */
  value?: string;
  /** True when Tailwind produces no CSS for this class (unknown utility). */
  inert: boolean;
}

type WorkerFn = (op: 'init' | 'parse', payload: unknown) => unknown;

const engines = new Map<string, ((classes: string[]) => ParsedClass[]) | null>();

/**
 * A Tailwind-engine-backed class parser for a project root, or undefined when
 * the project doesn't have Tailwind installed. Sync (via a synckit worker) so
 * eslint rules can call it; one engine per root, cached.
 */
export function engineFor(
  root: string,
  tokenFiles: string[],
): ((classes: string[]) => ParsedClass[]) | undefined {
  const cached = engines.get(root);
  if (cached !== undefined) return cached ?? undefined;
  try {
    // The *target* repo must have Tailwind — we bring the loader, not the theme.
    if (!hasTailwind(root)) throw new Error('tailwindcss not installed in target');
    const entry =
      tokenFiles.find(
        (f) => existsSync(f) && /@import\s+['"]tailwindcss/.test(readFileSync(f, 'utf8')),
      ) ?? tokenFiles[0];
    const css = entry
      ? /@import\s+['"]tailwindcss/.test(readFileSync(entry, 'utf8'))
        ? readFileSync(entry, 'utf8')
        : `@import 'tailwindcss';\n${readFileSync(entry, 'utf8')}`
      : `@import 'tailwindcss';`;
    const call = createSyncFn(new URL('./worker.js', import.meta.url)) as WorkerFn;
    call('init', { base: root, css });
    const parse = (classes: string[]) => call('parse', classes) as ParsedClass[];
    engines.set(root, parse);
    return parse;
  } catch (error) {
    if (process.env.DSCHECK_TW_DEBUG) console.error('[dscheck/tw]', error);
    engines.set(root, null);
    return undefined;
  }
}

/** Test seam: forget cached engines. */
export function resetEngines(): void {
  engines.clear();
}

export function workerPath(): string {
  return join(import.meta.dirname, 'worker.js');
}

function hasTailwind(root: string): boolean {
  for (let dir = root; ; dir = dirname(dir)) {
    if (existsSync(join(dir, 'node_modules', 'tailwindcss'))) return true;
    if (dirname(dir) === dir) return false;
  }
}
