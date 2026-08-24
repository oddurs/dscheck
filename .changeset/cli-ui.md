---
'dscheck-cli': minor
---

**A terminal surface worth reading.** Findings are grouped by file with aligned positions,
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
