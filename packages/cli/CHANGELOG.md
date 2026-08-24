# dscheck

## 0.2.0

### Minor Changes

- ecbade1: **A terminal surface worth reading.** Findings are grouped by file with aligned positions,
  wrapped to the terminal width, and a repeated rule is named once instead of on every line.
  The summary now counts by rule and ends with the single most useful next action — how many
  findings are exact matches (`dscheck fix` applies them) and how many need judgment
  (`dscheck baseline` accepts them).
  
  New: `dscheck explain <rule>` prints a rule's contract offline, from the same page the
  website serves, so the two can't drift. `dscheck completions <fish|zsh|bash>` generates a
  completion script. Filters `--only`, `--severity`, `--quiet`, and `--max-warnings` narrow
  what is reported without changing what is checked.
  
  Degrades honestly: no colour when piped or under `NO_COLOR`, progress only on a TTY outside
  CI, `--ascii` for terminals without ✔ ⚠ ✖, and severity is never carried by colour alone.

### Patch Changes

- 474e67a: **A run that checked nothing no longer reports as clean.** In 0.1.0, `dscheck check` in a
  project with no resolvable design system printed `✔ on-system: no findings` and exited 0 —
  indistinguishable from a genuinely clean run, so a typo in a `tokens` glob read as a
  guarantee. It now says nothing was checked, points at `dscheck init`, and exits 2. A path
  matching no lintable files is likewise distinct from clean.
  
  Also: `--version` works instead of throwing a Node stack trace; unknown flags and commands
  suggest the nearest match rather than crashing; invalid configs and unreadable files
  surface as diagnostics; and no code path can reach a user as an unhandled exception.

## 0.1.0

### Minor Changes

- First public release.
  
  dscheck reads the design-token source a project already has — Tailwind v4 `@theme`,
  DTCG JSON, `:root` custom properties, or TS token objects — and flags every off-system
  value in CSS, SCSS, JSX inline styles, style-object constants, Tailwind class strings,
  and CSS-in-JS, naming the nearest on-system token with its distance.
  
  Seven rules (`no-raw-color`, `no-raw-length`, `no-unknown-token`, `no-raw-font`,
  `no-raw-shadow`, `token-role`, `no-unknown-class`), exact-match-only autofix, editor
  suggestions for near misses, a debt baseline compatible with the hosts' suppression
  format, SARIF with stable fingerprints, and an agent format built for coding-agent
  guardrail loops.
  
  Pre-1.0: the release criteria are public in RELEASES.md — three consecutive releases
  with zero confirmed false positives on supported surfaces, plus stranger tests.

### Patch Changes

- Updated dependencies
  - dscheck-core@0.1.0
  - eslint-plugin-dscheck@0.1.0
  - stylelint-dscheck@0.1.0
  - dscheck-sarif@0.1.0
