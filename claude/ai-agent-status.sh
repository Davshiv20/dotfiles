#!/usr/bin/env bash
set -euo pipefail

count_exact_processes() {
  local pids
  local count=0

  pids=$(pgrep -x "$1" 2>/dev/null || true)
  while IFS= read -r pid; do
    [ -n "$pid" ] && count=$((count + 1))
  done <<< "$pids"

  printf '%s' "$count"
}

count_hermes_sessions() {
  local count=0
  local pid command

  while IFS= read -r pid; do
    [ -n "$pid" ] || continue
    command=$(ps -p "$pid" -o command= 2>/dev/null || true)
    case "$command" in
      *" gateway run"*|*" dashboard"*|*" proxy"*) ;;
      *) count=$((count + 1)) ;;
    esac
  done < <(pgrep -f '/hermes-agent/venv/bin/hermes([[:space:]]|$)' 2>/dev/null || true)

  printf '%s' "$count"
}

claude_json=$(claude agents --json 2>/dev/null || printf '[]')
claude_seg=$(echo "$claude_json" | jq -r '
  [.[] | select(.state != "done")] as $agents
  | ($agents | group_by(.status // "unknown")
      | map({key: (.[0].status // "unknown"), value: length})
      | from_entries) as $counts
  | "claude \($agents | length)"
    + (if ($counts.working // 0) > 0 then " (\($counts.working) working)" else "" end)
    + (if ($counts.waiting // 0) > 0 then " (\($counts.waiting) waiting)" else "" end)
' 2>/dev/null || printf 'claude ?')

codex_count=$(count_exact_processes codex)
pi_count=$(count_exact_processes pi)
hermes_count=$(count_hermes_sessions)

printf 'ai %s · codex %s · hermes %s · pi %s\n' \
  "$claude_seg" "$codex_count" "$hermes_count" "$pi_count"
