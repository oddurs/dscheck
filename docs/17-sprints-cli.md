# dscheck — CLI sprints

*Status: plan v1, 2026-08-24, written after probing the shipped 0.1.0 binary. The CLI is
the surface most users meet first and the one least examined so far — the plugins got the
rigor, the terminal got the leftovers. Three sprints: honesty, craft, ergonomics.*

## What probing 0.1.0 found

| probe | result |
|---|---|
| `dscheck check` in a project **with no design system** | prints `✔ on-system: no findings`, exits 0 — **identical to a genuinely clean run** |
| `dscheck --version` | raw Node stack trace (`ERR_PARSE_ARGS_UNKNOWN_OPTION`) |
| `dscheck check --bogus` | raw Node stack trace |
| `dscheck chek` | "Unknown command" + full help, no did-you-mean |
| 3,200-file run | ~3 seconds of complete silence, then output |

The first one is not a polish item. **It is a violation of the project's central
promise**: silence that means "nothing was checked" is rendering as approval. Everything
else in this plan is craft; W1 is a correctness bug in the shipped binary.

---

## Sprint W — Honesty and failure modes

**Goal: the CLI never implies a guarantee it didn't provide, and never shows a stack trace.**

| # | ticket | verify |
|---|---|---|
| W1 | **No system, no green check.** When no token source resolves, say so and exit non-zero (`2`, a usage problem): *"no design system found — nothing was checked"*, with the `init` hint. Same for a path that matched no lintable files | fixtures: no-config project, empty glob, path typo — each distinguishable from clean, exit codes asserted |
| W2 | `--version` / `-v` prints the version; `--help` on every command | contract test over both |
| W3 | Unknown flags and commands produce a one-line error plus did-you-mean, never a stack trace; `parseArgs` failures are caught | probe each, assert no `at ` frames in output |
| W4 | **Config and parse errors as diagnostics**: invalid `dscheck.config.json`, unreadable token file, unparseable CSS → a framed message naming the file and the fix, exit `2` | fixtures per case |
| W5 | Exit-code contract test: `0` clean · `1` findings · `2` usage/config/no-system, asserted for every command | added to `contracts.test.ts`, frozen per the versioning policy |

**Exit:** no output path can be mistaken for a guarantee; no crash reaches a user.

## Sprint X — Terminal craft

**Goal: output that reads well at 80 columns and at 200, in colour and without, on any terminal.**

| # | ticket | verify |
|---|---|---|
| X1 | **Readable findings**: align columns, wrap long messages to terminal width, keep the suggestion on the same visual line as its finding, collapse repeated rule names | golden snapshots at 80/120/200 columns |
| X2 | **A summary that tells you what to do next**: counts by rule, then the single most useful action — *"N of these are exact matches: `dscheck fix`"* or *"record as debt: `dscheck baseline`"* | snapshot per scenario (all-fixable, mixed, none) |
| X3 | **Progress on long runs**, TTY-only: a live count while linting, erased on completion; nothing emitted when piped or in CI | 3,200-file run shows progress; `| cat` shows none |
| X4 | **Degrade gracefully**: `NO_COLOR`, `FORCE_COLOR`, non-TTY, and a `--ascii` fallback for terminals without ✔/⚠/✖; never rely on colour alone to convey severity | snapshot matrix; verified on Windows in CI |
| X5 | **Help worth reading**: per-command help with real examples, `dscheck help <command>`, and a short "first run" hint when invoked bare in a project with no config | `dscheck help fix` shows the exact-match rule and an example |
| X6 | **Shell completions** for fish, zsh, bash (`dscheck completions <shell>`), covering commands, flags, and rule names | manual check in fish (the maintainer's shell) + a snapshot test of the generated script |

**Exit:** the golden snapshots are the CLI's visual contract, and they're reviewed like code.

## Sprint Y — Ergonomics for humans and agents

**Goal: the loop from "there are findings" to "there are none" is short for both kinds of user.**

| # | ticket | verify |
|---|---|---|
| Y1 | **`fix --interactive`**: step through near-misses one at a time — show the value, the candidates with distances, apply/skip/quit. The Δ2px decisions a human should make once, quickly | a scripted session drives it end to end |
| Y2 | **Filters**: `--only <rule>`, `--severity error`, `--quiet` (findings only), `--max-warnings N` (the eslint convention) | contract tests; documented in the CLI reference |
| Y3 | **`dscheck explain <rule>`**: the rule's contract in the terminal — what it flags, what it never flags, how to disable — sourced from the same data as the docs page so they cannot drift | conformance test: explain output matches the rule page's front matter |
| Y4 | **Watch-mode polish**: clear screen between runs (opt-out), show only what changed, summarise on exit | manual session; documented |
| Y5 | **Agent format stays frozen**, but add `--format github` (workflow annotations) for CI users not on code scanning | contract test; recipe in the docs |

**Exit:** a human can clear a baseline interactively; an agent's loop is unchanged and still contract-tested.

---

## Sequencing

```
W (honesty) → X (craft) → Y (ergonomics)
```

W1 ships as a patch release the day it's written — it is a correctness fix to a published
binary, not a feature. X's snapshots must exist before Y changes output again.
