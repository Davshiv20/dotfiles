#!/usr/bin/env bash
set -euo pipefail

input="$(cat)"
cache_dir="${AI_USAGE_CACHE_DIR:-$HOME/.ai-usage}"
mkdir -p "$cache_dir"

tmp_file="$cache_dir/claude.json.tmp"
now_epoch="$(date -u +%s)"

# Important:
# - used_percent is copied directly from Claude Code's status-line payload.
# - We do not invert it or estimate it from tokens/logs.
# - Stale payloads must not overwrite a fresher cache.
printf '%s' "$input" | jq --argjson observed_epoch "$now_epoch" '
  .rate_limits.five_hour as $five_hour
  | {
      used_percent: $five_hour.used_percentage,
      reset_epoch: $five_hour.resets_at,
      observed_epoch: $observed_epoch
    }
  | select(.used_percent != null and .reset_epoch != null and (.reset_epoch | tonumber) > .observed_epoch)
  | {
      used_percent: .used_percent,
      resets_at: (.reset_epoch | tonumber | strftime("%Y-%m-%dT%H:%M:%SZ")),
      observed_at: (.observed_epoch | strftime("%Y-%m-%dT%H:%M:%SZ"))
    }
' > "$tmp_file"

if [ -s "$tmp_file" ]; then
  mv "$tmp_file" "$cache_dir/claude.json"
else
  rm -f "$tmp_file"
fi

# Claude Code status-line commands must output something. Keep it visually empty.
echo ""