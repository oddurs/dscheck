---
title: Adopting dscheck
description: What your first run will report, what to do about it, and how to get green in CI the same day.
sidebar: { order: 1 }
---

Your first run will report a lot. That's expected — you're measuring drift that has been
accumulating, not failing a test you were meant to pass. Here's the path from that first
number to a green build, usually within an hour.

## 1. Let it find your system

```bash
npx dscheck-cli init
```

It looks for the token source you already have — a Tailwind `@theme`, a `:root` block,
DTCG JSON, including inside monorepo packages — and proposes a config. On unfamiliar
codebases it also detects **scoped systems** (a design system living under `.my-app`
rather than `:root`) and **runtime-injected variables** (`--radix-*`, syntax-highlighter
vars) that belong in `allow`. Nothing is written until you add `--write`.

Then see the damage:

```bash
npx dscheck-cli check .
```

## 2. Read the number correctly

- **Errors** are values that are almost certainly wrong: a raw color when the identical
  token exists, or a `var(--typo)` that resolves to nothing.
- **Warnings** are judgment calls — a `14px` where your scale says `12px`. Someone
  decided that once; dscheck is asking whether they meant to.

If the number is *zero*, be suspicious: run `dscheck tokens` to confirm a system was
actually found, and `dscheck check --explain-skips` to see what wasn't checked.

## 3. Take the free wins

```bash
npx dscheck-cli fix .
```

Only provably-identical replacements are applied — a value that already equals a token
becomes that token. `14px` is never rounded to `12px`. On a real marketing site this
removed 60% of findings mechanically (162 → 64).

## 4. Accept the rest as debt

```bash
npx dscheck-cli baseline .   # commit .dscheck-baseline.json
```

Now CI fails only on *new* drift. This is the step that makes adoption a one-day job
instead of a cleanup project: the debt is recorded, visible, and can only shrink
(`baseline --update` prunes what you've paid down but never raises a count).

## 5. Put it in the linters you already run

Findings become ordinary editor squiggles and CI failures — see
[ESLint](/guides/eslint/), [stylelint](/guides/stylelint/), and [CI](/guides/ci/).
If agents write UI in this repo, add the [guardrail hook](/guides/agent-guardrail/) too;
that's the difference between catching drift and preventing it.

## What to do when a finding is wrong

Report it. False positives are the highest-priority bug class here — every confirmed one
becomes a permanent regression fixture and a line on the
[release scoreboard](https://github.com/oddurs/dscheck/blob/main/RELEASES.md). Until it's
fixed, `ignore` (files) and `allow` (names) in the config keep you moving without
disabling a rule wholesale.
