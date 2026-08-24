# Security policy

## Supported versions

The latest published minor of every `@dscheck/*` package and the `dscheck` CLI.

## Reporting a vulnerability

Use GitHub's [private vulnerability reporting](https://github.com/oddurs/dscheck/security/advisories/new)
— it reaches the maintainers without disclosing the issue publicly. If that isn't
available to you, email oddurs@gmail.com with `dscheck security` in the subject.

Expect an acknowledgement within 72 hours and an assessment within a week. Please give
us 90 days before public disclosure, or less by agreement if a fix ships sooner.

## Threat model

dscheck is a local, offline developer tool with a deliberately small attack surface,
which shapes what counts as a vulnerability:

- **No network at runtime.** It never fetches, phones home, or transmits telemetry.
- **It reads your source and writes one file.** `.dscheck-baseline.json` is the only
  artifact, opt-in and safe to delete.
- **It never executes your code.** TypeScript token objects are *statically evaluated*
  (parsed with acorn, literals read from the AST) — never imported or run.
- **The one exception is deliberate**: when your project has Tailwind installed,
  `@dscheck/tw` loads Tailwind's own design system in a worker, which executes your
  Tailwind config and its plugins — the same code your build already runs. Engine
  failures are contained and degrade to the static path.

Reports we especially want: a path where dscheck executes project code outside that
exception, writes outside the baseline file, or where crafted input causes a crash that
takes down a CI job rather than producing a finding.
