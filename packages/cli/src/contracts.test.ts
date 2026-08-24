import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * J2: everything a user's script can parse, asserted key-for-key. A failure
 * here is a breaking change (major), full stop.
 */
const demoProject = join(import.meta.dirname, '..', '..', '..', 'assets', 'demo', 'project');

/** CI enables colour; assertions are about words, not escapes. */
const plain = (text: string) => text.replace(/\u001B\[[0-9;]*m/g, '');
const cli = join(import.meta.dirname, '..', 'dist', 'cli.js');

function run(args: string[]): { stdout: string; code: number } {
  const dir = mkdtempSync(join(tmpdir(), 'dscheck-contract-'));
  cpSync(demoProject, dir, { recursive: true });
  try {
    return {
      stdout: execFileSync('node', [cli, ...args], { cwd: dir, encoding: 'utf8' }),
      code: 0,
    };
  } catch (error) {
    const e = error as { stdout?: string; status?: number };
    return { stdout: e.stdout ?? '', code: e.status ?? -1 };
  }
}

describe('output contracts', () => {
  it('json findings carry exactly the contract keys', () => {
    const { stdout, code } = run(['check', 'Button.tsx', '--format', 'json']);
    expect(code).toBe(1); // error-severity findings present
    const findings = JSON.parse(stdout) as Record<string, unknown>[];
    expect(findings.length).toBeGreaterThan(0);
    for (const f of findings) {
      const keys = Object.keys(f).sort();
      for (const required of ['file', 'line', 'col', 'rule', 'severity', 'message'])
        expect(keys).toContain(required);
      for (const key of keys)
        expect(['col', 'file', 'line', 'message', 'rule', 'severity', 'suggestion']).toContain(key);
      expect(['error', 'warning']).toContain(f.severity);
      expect(String(f.rule)).toMatch(/^dscheck\//);
    }
  });

  it('agent format is NDJSON with fix first', () => {
    const { stdout } = run(['check', 'Button.tsx', '--format', 'agent']);
    const lines = stdout.trim().split('\n');
    for (const line of lines) {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      expect(Object.keys(parsed)[0]).toBe('fix');
      for (const key of Object.keys(parsed))
        expect(['fix', 'rule', 'file', 'line', 'col', 'message']).toContain(key);
    }
  });

  it('sarif is 2.1.0 with fingerprints on every result', () => {
    const { stdout } = run(['check', 'Button.tsx', '--format', 'sarif']);
    const sarif = JSON.parse(stdout);
    expect(sarif.version).toBe('2.1.0');
    for (const result of sarif.runs[0].results) {
      expect(result.partialFingerprints.dscheckFingerprint).toMatch(/^[0-9a-f]{32}$/);
      expect(result.locations[0].physicalLocation.artifactLocation.uri).toBeTypeOf('string');
    }
  });

  it('exit codes: 1 on errors, 0 when baseline absorbs everything', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dscheck-exit-'));
    cpSync(demoProject, dir, { recursive: true });
    execFileSync('node', [cli, 'baseline', 'Button.tsx'], { cwd: dir });
    const out = execFileSync('node', [cli, 'check', 'Button.tsx'], { cwd: dir, encoding: 'utf8' });
    expect(out).toContain('baseline');
  });
});

/**
 * W5: the exit-code and failure-mode contract. Frozen per the versioning
 * policy — a change here is a major, not a refactor.
 */
describe('failure modes never look like success (W)', () => {
  function bare(args: string[], files: Record<string, string> = {}) {
    const dir = mkdtempSync(join(tmpdir(), 'dscheck-w-'));
    writeFileSync(join(dir, 'package.json'), '{}');
    for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
    try {
      return {
        out: plain(execFileSync('node', [cli, ...args], { cwd: dir, encoding: 'utf8' })),
        code: 0,
      };
    } catch (error) {
      const e = error as { stdout?: string; stderr?: string; status?: number };
      return { out: plain(`${e.stdout ?? ''}${e.stderr ?? ''}`), code: e.status ?? -1 };
    }
  }

  it('a project with no design system is not reported as clean', () => {
    const { out, code } = bare(['check', 'a.css'], { 'a.css': '.a { color: red; }' });
    expect(code).toBe(2);
    expect(out).toContain('no design system found');
    expect(out).toContain('nothing was checked');
    expect(out).not.toContain('no findings');
  });

  it('a path with nothing lintable is not reported as clean', () => {
    const { out, code } = bare(['check', 'nowhere']);
    expect(code).toBe(2);
    expect(out).toContain('nothing to check');
    expect(out).not.toContain('no findings');
  });

  it('an invalid config is a diagnostic, not a crash', () => {
    const { out, code } = bare(['check', 'a.css'], {
      'a.css': '.a { color: red; }',
      'tokens.css': '@theme { --color-a: #fff; }',
      'dscheck.config.json': '{"tokens":["tokens.css"],"ignroe":[]}',
    });
    expect(code).toBe(2);
    expect(out).toContain('invalid configuration');
    expect(out).toContain('did you mean "ignore"');
    expect(out).not.toContain('    at ');
  });

  it('unknown flags and commands suggest, never crash', () => {
    const flag = bare(['check', '--forrmat', 'json']);
    expect(flag.code).toBe(2);
    expect(flag.out).toContain('did you mean --format');
    expect(flag.out).not.toContain('    at ');
    const command = bare(['chek']);
    expect(command.code).toBe(2);
    expect(command.out).toContain('did you mean check');
    expect(command.out).not.toContain('    at ');
  });

  it('--version prints the package version', () => {
    const { out, code } = bare(['--version']);
    expect(code).toBe(0);
    expect(out.trim()).toMatch(/^dscheck-cli \d+\.\d+\.\d+$/);
  });
});

describe('explain matches the published rule pages (Y3)', () => {
  it('every rule explains itself, offline, from its docs page', async () => {
    const { RULE_IDS, explainRule } = await import('./explain.js');
    for (const rule of RULE_IDS) {
      const text = explainRule(rule);
      expect(text, rule).toBeDefined();
      // the contract every rule page states — and the terminal must repeat
      expect(text, rule).toContain(`dscheck/${rule}`);
      expect(text?.length ?? 0, rule).toBeGreaterThan(200);
    }
    expect(explainRule('no-such-rule')).toBeUndefined();
  });

  it('completion scripts cover every command for each shell', async () => {
    const { completionScript } = await import('./explain.js');
    for (const shell of ['fish', 'zsh', 'bash'] as const) {
      const script = completionScript(shell);
      for (const command of ['check', 'fix', 'baseline', 'explain']) {
        expect(script, `${shell}:${command}`).toContain(command);
      }
    }
  });
});
