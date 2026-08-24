import { readFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import type { Finding } from './run.js';

/**
 * Debt ratchet, host-convention compatible: the same per-file/per-rule count
 * shape ESLint (9.24+), stylelint (16.25+), and oxlint converged on. Counts
 * never reference lines, so the baseline survives edits and merges cleanly.
 */
export type Baseline = Record<string, Record<string, { count: number }>>;

export const BASELINE_FILE = '.dscheck-baseline.json';

const FORMAT_VERSION = 1;

export function writeBaseline(findings: Finding[], root: string): Baseline {
  // Preserve $-metadata (including fields from future versions) on rewrite.
  const previous = readRaw(root);
  const meta = Object.fromEntries(
    Object.entries(previous ?? {}).filter(([k]) => k.startsWith('$')),
  );
  const baseline: Baseline = { ...meta, $version: FORMAT_VERSION } as unknown as Baseline;
  for (const f of findings) {
    const file = relative(root, f.file).replaceAll('\\', '/');
    const rules = (baseline[file] ??= {});
    rules[f.rule] = { count: (rules[f.rule]?.count ?? 0) + 1 };
  }
  writeFileSync(`${root}/${BASELINE_FILE}`, `${JSON.stringify(baseline, null, 2)}\n`);
  return baseline;
}

export function readBaseline(root: string): Baseline | undefined {
  const raw = readRaw(root);
  if (!raw) return undefined;
  // Tolerant reader: $-keys are metadata; entries are per-file rule counts.
  return Object.fromEntries(Object.entries(raw).filter(([k]) => !k.startsWith('$'))) as Baseline;
}

function readRaw(root: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(readFileSync(`${root}/${BASELINE_FILE}`, 'utf8')) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

export interface BaselineResult {
  /** Findings beyond the baselined count — these fail the run. */
  fresh: Finding[];
  /** Number of findings absorbed by the baseline. */
  absorbed: number;
  /** Baselined findings that no longer occur (debt paid down; prune-worthy). */
  stale: number;
}

/**
 * When a file's count for a rule rises, every occurrence is reported — like
 * the hosts, we don't guess which one is new.
 */
export function applyBaseline(
  findings: Finding[],
  baseline: Baseline,
  root: string,
): BaselineResult {
  const byKey = new Map<string, Finding[]>();
  for (const f of findings) {
    const key = `${relative(root, f.file).replaceAll('\\', '/')}::${f.rule}`;
    (byKey.get(key) ?? byKey.set(key, []).get(key))?.push(f);
  }
  const fresh: Finding[] = [];
  let absorbed = 0;
  const seenKeys = new Set<string>();
  for (const [key, group] of byKey) {
    seenKeys.add(key);
    const [file, rule] = key.split('::') as [string, string];
    const allowed = baseline[file]?.[rule]?.count ?? 0;
    if (group.length <= allowed) absorbed += group.length;
    else fresh.push(...group); // count rose: report all of this file+rule
  }
  let stale = 0;
  for (const [file, rules] of Object.entries(baseline)) {
    if (file.startsWith('$')) continue;
    for (const rule of Object.keys(rules)) {
      if (!seenKeys.has(`${file}::${rule}`)) stale++;
    }
  }
  return { fresh, absorbed, stale };
}
