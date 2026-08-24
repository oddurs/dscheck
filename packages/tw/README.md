# dscheck-tw

Tailwind engine bridge for [dscheck](https://dscheck.dev). Loads the *target repository's*
own Tailwind installation to parse class candidates exactly as Tailwind does — variants,
modifiers, arbitrary values, and whether a utility produces any CSS at all.

Engine failures are contained: callers degrade to dscheck's static parser rather than
reporting anything approximate.

MIT licensed.

Changelog: https://dscheck.dev/reference/changelog/
