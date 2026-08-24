import { describe, expect, it } from 'vitest';
import * as core from './index.js';

/** J5: the public API surface is a contract — accidental changes fail here. */
describe('public API surface', () => {
  it('dscheck-core exports exactly the frozen set', () => {
    expect(Object.keys(core).sort()).toMatchInlineSnapshot(`
      [
        "allowedNameMatcher",
        "checkDeclaration",
        "createIndex",
        "defaultTolerance",
        "findConfig",
        "formatViolation",
        "indexFor",
        "isIgnored",
        "loadCssTokens",
        "loadIndex",
        "nearestColor",
        "nearestLength",
        "nearestName",
        "tailwindDefaultTheme",
        "toPx",
        "tokenFilesFor",
        "toleranceFor",
      ]
    `);
  });
});
