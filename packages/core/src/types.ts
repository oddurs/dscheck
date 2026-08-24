/** Token categories dscheck understands. Drives which rule inspects which value. */
export type Category =
  | 'color'
  | 'length'
  | 'radius'
  | 'font-size'
  | 'font-family'
  | 'font-weight'
  | 'line-height'
  | 'letter-spacing'
  | 'shadow'
  | 'duration'
  | 'easing'
  | 'other';

export interface Token {
  /** Custom property name, e.g. `--color-primary`. */
  name: string;
  /** Fully resolved literal value (var() chains followed). */
  value: string;
  category: Category;
  /** File the token was declared in. */
  source: string;
  /** Immediate alias target when the declared value was `var(--other)`. */
  aliasOf?: string;
  /** True when a var() chain could not be resolved to a literal. */
  unresolved?: boolean;
  /** Additional values from mode scopes (`.dark`, `[data-theme=…]`, prefers-color-scheme). */
  modeValues?: string[];
  /** Semantic roles (fg, bg, border, …) from roles config or $extensions. */
  roles?: string[];
}

export interface IndexDiagnostics {
  /** Same name declared with different primary values in root/theme scopes. */
  conflicts: Array<{ name: string; values: string[]; sources: string[] }>;
  /** Tokens whose var() chains never reached a literal. */
  unresolved: string[];
  /** Aliases pointing at names that do not exist. */
  danglingAliases: string[];
}

/** The allowed set: every token the design system defines, indexed for lookup. */
export interface ValueIndex {
  tokens: ReadonlyMap<string, Token>;
  byCategory(category: Category): Token[];
  diagnostics?: IndexDiagnostics;
}

export function createIndex(
  tokens: Iterable<Token>,
): ValueIndex & { diagnostics?: IndexDiagnostics } {
  const map = new Map<string, Token>();
  for (const t of tokens) map.set(t.name, t);
  const buckets = new Map<Category, Token[]>();
  for (const t of map.values()) {
    const bucket = buckets.get(t.category) ?? [];
    bucket.push(t);
    buckets.set(t.category, bucket);
  }
  return {
    tokens: map,
    byCategory: (category) => buckets.get(category) ?? [],
  };
}
