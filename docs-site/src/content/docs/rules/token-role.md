---
title: token-role
description: The right token for the job — surface colors on surfaces, text colors on text.
---

Opt-in. Once tokens carry roles, a *valid* token used for the wrong job is flagged — the
mistake linting-by-membership can't see, and one agents make constantly because
`--color-surface` sounds plausible everywhere.

```text
⚠ --color-surface is bg, not fg, in color — nearest right-role token: var(--color-ink)
```

## Declaring roles

Either inline in DTCG (`$extensions: { "dscheck": { "roles": ["bg"] } }`) or as a sidecar
mapped by name globs:

```jsonc
// roles.json — referenced from dscheck.config.json as { "roles": "roles.json" }
{
  "--color-*-foreground": ["fg"],
  "--color-surface*": ["bg"],
  "--color-border*": ["border"]
}
```

Bootstrap with `dscheck roles --suggest > roles.json` — a name-based proposal you review
and commit. dscheck never guesses roles at lint time; unroled tokens are exempt from this
rule and rank neutrally in suggestions.

## Effects beyond the rule

With roles present, **every color suggestion becomes role-aware**: a `color:` violation
suggests fg-role tokens ahead of a perceptually-closer bg token (exact matches always win).

- **Default severity:** warning.
- **Roles understood:** `fg`, `bg`, `border` (properties map: `color`/`fill` → fg,
  `background*` → bg, `border-*-color`/`outline-color`/`stroke` → border).
