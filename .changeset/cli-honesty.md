---
'dscheck-cli': patch
---

**A run that checked nothing no longer reports as clean.** In 0.1.0, `dscheck check` in a
project with no resolvable design system printed `✔ on-system: no findings` and exited 0 —
indistinguishable from a genuinely clean run, so a typo in a `tokens` glob read as a
guarantee. It now says nothing was checked, points at `dscheck init`, and exits 2. A path
matching no lintable files is likewise distinct from clean.

Also: `--version` works instead of throwing a Node stack trace; unknown flags and commands
suggest the nearest match rather than crashing; invalid configs and unreadable files
surface as diagnostics; and no code path can reach a user as an unhandled exception.
