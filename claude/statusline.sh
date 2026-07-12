#!/usr/bin/env bash
set -euo pipefail

input=$(cat)

# --- raw values from JSON ---
cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // "."')
model_id=$(echo "$input" | jq -r '.model.id // ""')
total_input=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0')
ctx_size=$(echo "$input" | jq -r '.context_window.context_window_size // 200000')
used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // 0')
total_output=$(echo "$input" | jq -r '.context_window.total_output_tokens // 0')

# --- segment 1: basename of cwd ---
dir=$(basename "$cwd")

# --- segment 2: git branch + dirty flag ---
branch=""
if git -C "$cwd" rev-parse --git-dir >/dev/null 2>&1; then
  branch=$(git -C "$cwd" symbolic-ref --short HEAD 2>/dev/null \
           || git -C "$cwd" rev-parse --short HEAD 2>/dev/null \
           || echo "?")
  if ! git -C "$cwd" diff --quiet 2>/dev/null \
     || ! git -C "$cwd" diff --cached --quiet 2>/dev/null; then
    branch="${branch}*"
  fi
fi

# --- segment 3: shortened model name ---
# strip leading "claude-" prefix for brevity
model_short=$(echo "$model_id" | sed 's/^claude-//')

# --- segment 4: context window usage ---
ctx_k=$(awk "BEGIN { printf \"%.0f\", $total_input / 1000 }")
ctx_max_k=$(awk "BEGIN { printf \"%.0f\", $ctx_size / 1000 }")
ctx_pct=$(awk "BEGIN { printf \"%.0f\", $used_pct }")
ctx_seg="ctx ${ctx_k}k/${ctx_max_k}k (${ctx_pct}%)"

# --- segment 5: session token total (input + output) ---
total_tok=$(awk "BEGIN { printf \"%.0f\", ($total_input + $total_output) / 1000 }")
tok_seg="${total_tok}k tok"

# --- segment 6: session cost ---
# Pricing (per-million tokens) as of model knowledge cutoff.
# claude-opus-4*  : $15 in / $75 out
# claude-sonnet-4*: $3 in / $15 out
# claude-haiku-*  : $0.80 in / $4 out
# fallback        : $3 in / $15 out
case "$model_id" in
  *opus-4*)   price_in=15;   price_out=75   ;;
  *opus-3*)   price_in=15;   price_out=75   ;;
  *sonnet-4*) price_in=3;    price_out=15   ;;
  *sonnet-3*) price_in=3;    price_out=15   ;;
  *haiku*)    price_in=0.80; price_out=4    ;;
  *)          price_in=3;    price_out=15   ;;
esac
cost=$(awk "BEGIN { printf \"%.2f\", ($total_input * $price_in + $total_output * $price_out) / 1000000 }")
cost_seg="\$${cost}"

# --- ANSI helpers ---
DIM="\033[2m"
RESET="\033[0m"
SEP="${DIM} │ ${RESET}"

# --- assemble ---
parts=("$dir")
[ -n "$branch" ] && parts+=("$branch")
[ -n "$model_short" ] && parts+=("$model_short")
parts+=("$ctx_seg" "$tok_seg" "$cost_seg")

out=""
for part in "${parts[@]}"; do
  if [ -z "$out" ]; then
    out="$part"
  else
    out="${out}${SEP}${part}"
  fi
done

printf "%b\n" "$out"
