import pc from 'picocolors';
import type { Finding } from './run.js';

/**
 * The terminal surface. Three rules shape everything here:
 *   - severity is never conveyed by colour alone (glyph + word carry it)
 *   - output adapts to the terminal it is in, and to not being one
 *   - the summary ends with the single most useful next action
 */

export interface RenderOptions {
  /** Columns available; falls back to a sane width when not a TTY. */
  width: number;
  /** ASCII-only marks for terminals without the glyphs. */
  ascii: boolean;
  /** Findings only — no header, no summary. */
  quiet: boolean;
  /** Root for relative paths. */
  root: string;
}

export function renderOptions(overrides: Partial<RenderOptions> = {}): RenderOptions {
  const isTty = process.stdout.isTTY === true;
  return {
    width: Math.min(process.stdout.columns || 100, 120),
    // Windows consoles and CI logs mangle ✔/⚠/✖ often enough to offer a fallback.
    ascii: process.env.DSCHECK_ASCII === '1' || (!isTty && process.platform === 'win32'),
    quiet: false,
    root: process.cwd(),
    ...overrides,
  };
}

export function mark(severity: Finding['severity'], ascii: boolean): string {
  if (severity === 'error') return ascii ? pc.red('x') : pc.red('✖');
  return ascii ? pc.yellow('!') : pc.yellow('⚠');
}

/** Wrap `text` to `width`, indenting continuation lines by `indent`. */
export function wrap(text: string, width: number, indent: number): string[] {
  if (width <= indent + 20) return [text];
  const limit = width - indent;
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(' ')) {
    if (current && visibleLength(current) + 1 + visibleLength(word) > limit) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

const ANSI = /\[[0-9;]*m/g;
export function visibleLength(text: string): number {
  return text.replace(ANSI, '').length;
}

/**
 * The findings list: grouped by file, aligned on position, wrapped to width,
 * with the rule name trailing only when it isn't obvious from repetition.
 */
export function renderFindings(findings: Finding[], options: RenderOptions): string[] {
  const lines: string[] = [];
  const byFile = new Map<string, Finding[]>();
  for (const finding of findings) {
    const group = byFile.get(finding.file) ?? [];
    group.push(finding);
    byFile.set(finding.file, group);
  }

  for (const [file, group] of byFile) {
    const relative = file.startsWith(options.root) ? file.slice(options.root.length + 1) : file;
    lines.push('', pc.underline(relative || file));
    const positionWidth = Math.max(...group.map((f) => `${f.line}:${f.col}`.length));
    const singleRule = new Set(group.map((f) => f.rule)).size === 1;
    for (const finding of group) {
      const position = `${finding.line}:${finding.col}`.padStart(positionWidth);
      const prefix = `  ${mark(finding.severity, options.ascii)} ${pc.dim(position)}  `;
      const indent = visibleLength(prefix);
      const suffix = singleRule ? '' : `  ${pc.dim(finding.rule.replace('dscheck/', ''))}`;
      const [first, ...rest] = wrap(finding.message + suffix, options.width, indent);
      lines.push(prefix + first);
      for (const line of rest) lines.push(' '.repeat(indent) + line);
    }
    // When every finding in a file is the same rule, name it once instead of
    // repeating it on each line — but only when the repetition is worth it.
    if (singleRule && group.length >= 3 && group[0]) {
      lines.push(`  ${pc.dim(`${group.length}× ${group[0].rule.replace('dscheck/', '')}`)}`);
    }
  }
  return lines;
}

/**
 * The summary. Counts, then the one action that helps most — a report that
 * ends without telling you what to do next has wasted the reader's attention.
 */
export function renderSummary(findings: Finding[], options: RenderOptions): string[] {
  if (findings.length === 0) {
    return ['', `${options.ascii ? pc.green('ok') : pc.green('✔')} on-system: no findings`];
  }

  const errors = findings.filter((f) => f.severity === 'error').length;
  const warnings = findings.length - errors;
  const fixable = findings.filter(isExactMatch).length;

  const byRule = new Map<string, number>();
  for (const finding of findings) {
    const rule = finding.rule.replace('dscheck/', '');
    byRule.set(rule, (byRule.get(rule) ?? 0) + 1);
  }

  const lines = [
    '',
    pc.bold(
      `${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}`,
    ),
  ];
  for (const [rule, count] of [...byRule].sort((a, b) => b[1] - a[1])) {
    lines.push(`  ${pc.dim(`${String(count).padStart(4)}  ${rule}`)}`);
  }

  lines.push('');
  if (fixable > 0) {
    lines.push(
      `  ${fixable} ${fixable === 1 ? 'is an exact match' : 'are exact matches'} — ${pc.bold('dscheck fix')} applies ${fixable === 1 ? 'it' : 'them'}`,
    );
  }
  if (findings.length - fixable > 0) {
    lines.push(
      `  ${findings.length - fixable} need${findings.length - fixable === 1 ? 's' : ''} judgment — accept as debt with ${pc.bold('dscheck baseline')}`,
    );
  }
  return lines;
}

/**
 * A finding is fixable exactly when its suggestion is provably identical:
 * either the message says so, or it names a token without showing a delta.
 * Anything with a Δ needs a human — that is the whole autofix policy.
 */
export function isExactMatch(finding: Finding): boolean {
  const { message } = finding;
  if (/\(identical\)|ΔEOK 0\.000\)/.test(message)) return true;
  if (!/use var\(/.test(message)) return false;
  return !message.includes('Δ');
}

/**
 * Progress for long runs: a live count that erases itself. TTY only — piped
 * output and CI logs stay clean, because a progress line in a log is noise.
 */
export function progress(total: number): { tick: (n?: number) => void; done: () => void } {
  const active = process.stdout.isTTY === true && !process.env.CI && total >= 200;
  let seen = 0;
  let last = 0;
  return {
    tick(n = 1) {
      if (!active) return;
      seen += n;
      const now = Date.now();
      if (now - last < 80 && seen < total) return;
      last = now;
      process.stdout.write(`\r${pc.dim(`  linting ${seen}/${total}…`)}`);
    },
    done() {
      if (!active) return;
      process.stdout.write(`\r${' '.repeat(30)}\r`);
    },
  };
}
