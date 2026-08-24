import { runAsWorker } from 'synckit';

interface DesignSystem {
  parseCandidate(cls: string): Array<{
    kind: string;
    root?: string;
    value?: { kind: string; value: string } | null;
  }>;
  candidatesToCss(classes: string[]): Array<string | null>;
}

let ds: DesignSystem | undefined;

runAsWorker(async (op: 'init' | 'parse', payload: unknown) => {
  if (op === 'init') {
    const { base, css } = payload as { base: string; css: string };
    const { __unstable__loadDesignSystem } = await import('@tailwindcss/node');
    ds = (await __unstable__loadDesignSystem(css, { base })) as unknown as DesignSystem;
    return true;
  }
  if (!ds) throw new Error('engine not initialised');
  const classes = payload as string[];
  // A target repo's `@plugin` utility callback can throw during compilation —
  // Tailwind's internal catch doesn't cover that step. An exception here would
  // propagate synchronously through synckit and crash the host linter, so we
  // contain it: unknown inertness means the engine-only rules stay silent.
  let cssOut: Array<string | null>;
  try {
    cssOut = ds.candidatesToCss(classes);
  } catch {
    cssOut = classes.map(() => '');
  }
  return classes.map((cls, i) => {
    let parsed: ReturnType<DesignSystem['parseCandidate']>;
    try {
      parsed = ds?.parseCandidate(cls) ?? [];
    } catch {
      parsed = [];
    }
    const candidate = parsed[0];
    const inert = cssOut[i] == null;
    if (!candidate) return { base: cls, root: '', kind: 'unknown' as const, inert };
    const kind =
      candidate.kind === 'static'
        ? ('static' as const)
        : candidate.value?.kind === 'arbitrary'
          ? ('arbitrary' as const)
          : ('named' as const);
    return {
      base: cls,
      root: candidate.root ?? cls,
      kind,
      ...(candidate.value?.kind === 'arbitrary' ? { value: candidate.value.value } : {}),
      inert,
    };
  });
});
