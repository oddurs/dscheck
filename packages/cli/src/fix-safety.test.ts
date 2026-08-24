import { cpSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lintFiles } from './run.js';

/**
 * I1/I4: fix is provably harmless.
 *  - round-trip: fix → re-lint yields no findings that weren't there before
 *  - idempotent: a second fix changes nothing
 *  - a fix never leaves unparseable output (re-lint would surface dscheck/unparsed)
 */
const demoProject = join(import.meta.dirname, '..', '..', '..', 'assets', 'demo', 'project');

function copyProject(): string {
  const dir = mkdtempSync(join(tmpdir(), 'dscheck-fixsafe-'));
  cpSync(demoProject, dir, { recursive: true });
  return dir;
}

function snapshotFiles(dir: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isFile()) out.set(name, readFileSync(path, 'utf8'));
  }
  return out;
}

const key = (f: { rule: string; message: string }) => `${f.rule}::${f.message}`;

describe('fix safety (I1)', () => {
  it('round-trip: no new findings, strictly fewer, idempotent', async () => {
    const dir = copyProject();
    const target = join(dir, 'Button.tsx');
    const before = await lintFiles([target]);
    expect(before.length).toBeGreaterThan(0);

    const during = await lintFiles([target], { fix: true });
    const after = await lintFiles([target]);

    // nothing new appeared, and every remaining finding existed before
    const beforeKeys = new Set(before.map(key));
    for (const f of after) expect(beforeKeys.has(key(f))).toBe(true);
    expect(after.length).toBeLessThan(before.length);
    // no parse damage
    expect(after.some((f) => f.rule === 'dscheck/unparsed')).toBe(false);
    expect(during.some((f) => f.rule === 'dscheck/unparsed')).toBe(false);

    // idempotent: second fix changes no file
    const snapshot = snapshotFiles(dir);
    await lintFiles([target], { fix: true });
    expect(snapshotFiles(dir)).toEqual(snapshot);
  });

  it('css round-trip with the same guarantees', async () => {
    const dir = copyProject();
    const cssFile = join(dir, 'component.css');
    writeFileSync(
      cssFile,
      '.a { color: oklch(0.55 0.2 260); padding: 13px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }\n',
    );
    const before = await lintFiles([cssFile]);
    await lintFiles([cssFile], { fix: true });
    const after = await lintFiles([cssFile]);
    const beforeKeys = new Set(before.map(key));
    for (const f of after) expect(beforeKeys.has(key(f))).toBe(true);
    expect(after.length).toBeLessThan(before.length);
    expect(readFileSync(cssFile, 'utf8')).toContain('color: var(--color-primary)');
    expect(readFileSync(cssFile, 'utf8')).toContain('padding: 13px'); // Δ1px — untouched
  });
});

describe('suggestion honesty (I2)', () => {
  it('every emitted fix token exists in the allowed set', async () => {
    const dir = copyProject();
    const findings = await lintFiles([join(dir, 'Button.tsx')]);
    const { indexFor } = await import('@dscheck/core');
    const index = indexFor(join(dir, 'Button.tsx'));
    if (!index) throw new Error('no index');
    for (const f of findings) {
      const token = /var\((--[\w-]+)\)/.exec(f.suggestion ?? '')?.[1];
      if (token) expect(index.tokens.has(token)).toBe(true);
      // the value the message states for the suggested token is that token's real value
      const stated = /use var\((--[\w-]+)\) \(([^,)]+)/.exec(f.message);
      if (stated && f.rule === 'dscheck/no-raw-length') {
        expect(index.tokens.get(stated[1] as string)?.value).toBe(stated[2]);
      }
    }
  });
});
