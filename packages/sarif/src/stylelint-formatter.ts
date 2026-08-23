import type { Formatter } from 'stylelint';
import { type SarifInput, toSarif } from './index.js';

/**
 * A standalone SARIF formatter for stylelint — any rules, not just offsystem.
 * Usage: stylelint <files> --custom-formatter @offsystem/sarif/stylelint-formatter
 */
const formatter: Formatter = (results) => {
  const findings: SarifInput[] = results.flatMap((result) =>
    result.warnings.map((warning) => ({
      file: result.source ?? '<unknown>',
      line: warning.line,
      col: warning.column,
      rule: warning.rule ?? 'unknown',
      severity: warning.severity === 'error' ? ('error' as const) : ('warning' as const),
      message: warning.text,
    })),
  );
  return JSON.stringify(toSarif(findings), null, 2);
};

export default formatter;
