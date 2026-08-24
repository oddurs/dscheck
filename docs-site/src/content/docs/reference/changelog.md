---
title: Changelog
description: What changed in each release, and whether it affects you.
---

Versioned per the [versioning policy](/reference/versioning/): more true findings is a
minor; a changed output shape or default is a major; message wording is a patch.

## 0.1.0

### dscheck-cli

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

### eslint-plugin-dscheck

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
  - dscheck-tw@0.1.0

### stylelint-dscheck

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

### dscheck-core

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

### dscheck-sarif

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

### dscheck-tw

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

