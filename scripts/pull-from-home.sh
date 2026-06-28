#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
home_dir="${HOME}"

mkdir -p "${repo_dir}/agents" "${repo_dir}/claude"

if [ -d "${home_dir}/.agents/skills" ]; then
  rsync -a --delete --exclude='.DS_Store' \
    "${home_dir}/.agents/skills/" "${repo_dir}/agents/skills/"
fi

if [ -d "${home_dir}/.claude/skills" ]; then
  rsync -a --delete --exclude='.DS_Store' \
    "${home_dir}/.claude/skills/" "${repo_dir}/claude/skills/"
fi

for file in CLAUDE.md AGENTS.md; do
  if [ -f "${home_dir}/.claude/${file}" ]; then
    cp "${home_dir}/.claude/${file}" "${repo_dir}/claude/${file}"
  fi
done

echo "Synced agent config into ${repo_dir}"
