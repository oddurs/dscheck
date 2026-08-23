import { describe, expect, it } from 'vitest';
import { toSarif } from './index.js';

describe('toSarif', () => {
  const finding = {
    file: `${process.cwd()}/src/a.css`,
    line: 3,
    col: 5,
    rule: 'dscheck/no-raw-color',
    severity: 'error' as const,
    message: 'Raw color #333 — use var(--color-ink)',
  };

  it('produces a valid 2.1.0 shell with relative uris and fingerprints', () => {
    const sarif = toSarif([finding, { ...finding, line: 9 }]);
    expect(sarif.version).toBe('2.1.0');
    const results = sarif.runs[0]?.results ?? [];
    expect(results[0]?.locations[0]?.physicalLocation.artifactLocation.uri).toBe('src/a.css');
    // same content, different occurrence → different fingerprint (line-move stable, dupe distinct)
    expect(results[0]?.partialFingerprints.dscheckFingerprint).not.toBe(
      results[1]?.partialFingerprints.dscheckFingerprint,
    );
  });
});
