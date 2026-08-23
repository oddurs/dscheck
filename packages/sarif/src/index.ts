import { createHash } from 'node:crypto';
import { relative } from 'node:path';

export interface SarifInput {
  file: string;
  line: number;
  col: number;
  rule: string;
  severity: 'error' | 'warning';
  message: string;
}

/**
 * Build a SARIF 2.1.0 log. `partialFingerprints` are stable across line moves
 * (file + rule + message + per-file occurrence ordinal), so GitHub code
 * scanning shows only new findings on PRs.
 */
export function toSarif(
  findings: SarifInput[],
  options: { root?: string; toolVersion?: string } = {},
) {
  const root = options.root ?? process.cwd();
  const rules = [...new Set(findings.map((f) => f.rule))].sort();
  const seen = new Map<string, number>();

  return {
    $schema:
      'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0' as const,
    runs: [
      {
        tool: {
          driver: {
            name: 'dscheck',
            informationUri: 'https://github.com/oddurs/dscheck',
            version: options.toolVersion ?? '0.0.0',
            rules: rules.map((id) => ({
              id,
              shortDescription: { text: id },
              helpUri: `https://github.com/oddurs/dscheck#${id.replace(/^dscheck\//, '')}`,
            })),
          },
        },
        results: findings.map((f) => {
          const uri = relative(root, f.file).replaceAll('\\', '/');
          const key = `${uri}:${f.rule}:${f.message}`;
          const ordinal = (seen.get(key) ?? 0) + 1;
          seen.set(key, ordinal);
          return {
            ruleId: f.rule,
            level: f.severity === 'error' ? ('error' as const) : ('warning' as const),
            message: { text: f.message },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri, uriBaseId: '%SRCROOT%' },
                  region: { startLine: f.line, startColumn: f.col },
                },
              },
            ],
            partialFingerprints: {
              dscheckFingerprint: createHash('sha256')
                .update(`${key}#${ordinal}`)
                .digest('hex')
                .slice(0, 32),
            },
          };
        }),
      },
    ],
  };
}
