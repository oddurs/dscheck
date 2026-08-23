#!/bin/sh
# offsystem guardrail for Claude Code.
#
# PostToolUse hook: after Claude edits or writes a file, lint it against the
# design system. Exit 2 feeds the findings back to Claude, which fixes them
# before the human ever sees the diff.
#
# Install: copy the "hooks" block from settings.snippet.json into your
# project's .claude/settings.json (adjust the offsystem path if not on PATH).

file=$(jq -r '.tool_input.file_path // empty')
case "$file" in
  *.css|*.scss|*.jsx|*.tsx) ;;
  *) exit 0 ;;
esac

findings=$(offsystem check "$file" --format agent 2>/dev/null)
[ -z "$findings" ] && exit 0

echo "off-system values found — replace each with the suggested token (the \"fix\" field):" >&2
echo "$findings" >&2
exit 2
