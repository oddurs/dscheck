---
title: The agent guardrail
description: Make Claude Code or Cursor produce on-system UI, automatically.
sidebar: { order: 1 }
---

Agents write plausible UI with made-up values: `#3b82f6` instead of `var(--color-primary)`,
`gap: 14px` instead of `var(--space-3)`, or a fabricated `var(--color-primary-500)` that
doesn't exist in your system. dscheck closes the loop: after every file the agent writes,
it reports each off-system value *with the exact replacement*, and the agent fixes itself
before you ever see the diff.

## Claude Code

Copy the hook from [`integrations/claude-code/`](https://github.com/oddurs/dscheck/tree/main/integrations/claude-code)
into your project's `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{ "type": "command", "command": "sh .claude/dscheck-hook.sh" }]
      }
    ]
  }
}
```

The hook lints only the file that was written and exits `2` with the findings on stderr —
Claude Code feeds that back to the agent, which applies the `fix` field of each finding.

## Any agent: the `agent` format

```bash
dscheck check src/Button.tsx --format agent
```

One JSON line per finding, suggestion first, so a model can act without prose parsing:

```json
{"fix":"var(--spacing-3)","rule":"dscheck/no-raw-length","file":"src/Button.tsx","line":19,"col":16,"message":"Raw length 14px in padding — use var(--spacing-3) (12px, Δ2px)"}
```

## Measured effect

Same component task, same model, same design system:

| | off-system values in the diff |
|---|---|
| agent without guardrail | **19** (10 raw colors, 9 raw lengths) |
| agent with dscheck hook | **0** |

The guardrailed agent consulted `dscheck tokens` first and shipped on-system in one pass.
