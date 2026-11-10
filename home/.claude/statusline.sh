#!/usr/bin/env bash
set -euo pipefail

input=$(cat)

# Keep feeding the ~/.ai-usage rate-limit cache; it prints nothing itself.
if [ -x "${HOME}/.ai-usage/claude-statusline.sh" ]; then
  printf '%s' "$input" | "${HOME}/.ai-usage/claude-statusline.sh" >/dev/null 2>&1 || true
fi

cwd=$(jq -r '.workspace.current_dir // .cwd // "."' <<<"$input")

branch=""
if git -C "$cwd" rev-parse --git-dir >/dev/null 2>&1; then
  branch=$(git -C "$cwd" symbolic-ref --short HEAD 2>/dev/null \
           || git -C "$cwd" rev-parse --short HEAD 2>/dev/null || echo "?")
  if ! git -C "$cwd" diff --quiet 2>/dev/null || ! git -C "$cwd" diff --cached --quiet 2>/dev/null; then
    branch="${branch}*"
  fi
fi

# Cost and rate limits come straight from Claude Code's payload; no local price table.
sep=$'\033[2m │ \033[0m'
metrics=$(jq -r --arg sep "$sep" '
  def limit($name; $w): if $w.used_percentage == null then empty
    else "\($name) \($w.used_percentage | round)% ↻\($w.resets_at | strflocaltime("%H:%M"))" end;
  [
    (.model.display_name // .model.id // empty),
    (.context_window | select(. != null)
      | "ctx \((.total_input_tokens // 0) / 1000 | round)k/\((.context_window_size // 0) / 1000 | round)k (\(.used_percentage // 0 | round)%)"),
    (.cost.total_cost_usd | select(. != null) | "$\(. * 100 | round / 100)"),
    limit("5h"; .rate_limits.five_hour // {}),
    limit("7d"; .rate_limits.seven_day // {})
  ] | join($sep)' <<<"$input")

out=$(basename "$cwd")
[ -n "$branch" ] && out="${out}${sep}${branch}"
[ -n "$metrics" ] && out="${out}${sep}${metrics}"
printf '%s\n' "$out"
