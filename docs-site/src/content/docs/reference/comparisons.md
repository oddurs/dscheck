---
title: Comparisons
description: Honest positioning against the tools next door — including when they're the better choice.
---

Every tool here is good at what it set out to do. The honest comparison is about what
each one *knows*.

## stylelint-declaration-strict-value

The incumbent, and deservedly popular: it forces listed properties to use *a* variable.
What it doesn't have is your token set — any `var(--anything)` passes, including a
fabricated `var(--color-primry)`, and CSS-in-JS is explicitly out of scope.

**Choose it when** you want a zero-config "no raw values in CSS" nudge and don't need
membership checking, suggestions, or non-CSS surfaces.
**Choose dscheck when** the question is "is this value *in my system*?" — membership,
nearest-token suggestions, unknown-token detection, and one allowed-set across CSS,
JSX, Tailwind classes, and CSS-in-JS.

## Tailwind's own linting (IntelliSense, canonical classes)

Tailwind ships excellent class-level tooling: canonical-class suggestions in the editor
and increasingly in core. For a Tailwind-only codebase where every style is a utility
class, that may be all you need.

**Choose it when** styles live exclusively in class strings.
**Choose dscheck when** values leak outside classes — inline `style={{}}`, style-object
constants, CSS files, styled-components — or when you want the class checks *and* the
rest under one config, one baseline, one CI gate. (dscheck's class parsing runs through
Tailwind's own engine when it's installed; it wraps, never reimplements.)

## Terrazzo (and DTCG token toolchains)

Terrazzo lints and transforms the **token file** — naming, aliases, formats. dscheck
lints the **code that uses the tokens**. They're complementary layers, not competitors:
a healthy setup can use Terrazzo to keep `tokens.json` well-formed and dscheck to keep
the codebase on-system.

**Choose it when** the problem is inside your token source.
**Choose dscheck when** the problem is between your token source and your code.

## Org-specific plugins (Atlassian's, Primer's, Carbon's…)

These are the existence proof for the whole category — deep, polished rule sets with
migration maps, hard-wired to one company's tokens. If you work at one of these
companies, use theirs.

**Choose dscheck when** you want that class of enforcement for *your* system without
building a plugin: point it at the token source you already have.

## What nothing else does (yet)

One allowed-set enforced across every surface at once; distance-based suggestions
(ΔEOK for color, scale steps for lengths) instead of exact-match-only; fabricated-token
and fabricated-class detection; a baseline debt ratchet compatible with your hosts'
suppression format; and the agent loop — findings shaped so a coding agent can apply
the fix without a human in between.
