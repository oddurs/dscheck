---
title: Why dscheck
description: The never-guess doctrine, the false-positive contract, and what the tooling graveyard taught us.
sidebar: { order: 0 }
---

Every team with a design system has the same unspoken promise: UI uses a finite set of
values. Almost nothing enforces it. The linters that try either accept *any* `var()`
without knowing which tokens are real, or are hard-wired to one company's system.
Meanwhile coding agents now write a growing share of UI — and they fabricate plausible
values constantly: `#3b82f6` instead of `var(--color-primary)`, a `--color-primary-500`
that doesn't exist. dscheck exists to make the promise checkable.

## Three commitments

**Never guess.** dscheck reports what it can prove and stays silent otherwise.
Interpolated declarations, dynamic classnames, `calc()` internals — skipped, on purpose,
and every skip is documented and fixture-tested on the
[supported surfaces](/reference/supported-surfaces/) page. Silence that means "didn't
check" is never allowed to look like "checked and passed": files that fail to parse
surface as findings.

**Never lie.** A finding on a supported surface is always a real off-system value.
That claim is enforced, not aspired to: a pinned corpus of real repositories runs
nightly with human-audited samples, and every false positive ever found becomes a
permanent regression fixture. The [release scoreboard](https://github.com/oddurs/dscheck/blob/main/RELEASES.md)
tracks confirmed false positives per release — 1.0 is declared from that evidence.

**Never damage.** `fix` applies only provably-identical replacements. `14px` is never
rounded to `12px`; a near-miss becomes an editor suggestion a human accepts. Fix output
is property-tested to reparse, converge, and never surprise a diff.

## Why suggestions carry distances

`use var(--spacing-3) (12px, Δ2px)` is not decoration. For a human it turns a violation
into a one-keystroke decision. For an agent it closes the loop: the
[guardrail hook](/guides/agent-guardrail/) feeds findings back, and the agent applies
the named token instead of guessing again. Measured on an identical component task:
19 off-system values without the hook, 0 with it.

## Why there's no dscheck platform

The design-system tooling graveyard is real — hosted platforms in this space have died
repeatedly, taking their users' workflows with them. dscheck is the opposite bet: plugins
for the linters you already run, a CLI, one optional dotfile, no servers, no telemetry,
no accounts. Everything reproducible from the repository alone. Boring on purpose,
so it's still working in five years.
