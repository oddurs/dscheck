export type { Category, Token, ValueIndex } from './types.js';
export { createIndex } from './types.js';
export { loadCssTokens } from './css-source.js';
export type { Match, Tolerance } from './match.js';
export { defaultTolerance, nearestColor, nearestLength, nearestName, toPx } from './match.js';
export type { CheckContext, RuleId, Violation } from './check.js';
export { checkDeclaration, formatViolation } from './check.js';
export type { OffsystemConfig } from './config.js';
export { findConfig, indexFor, loadIndex } from './config.js';
