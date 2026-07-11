#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
home_dir="${HOME}"

sync_dir() {
  local source_path="$1"
  local target_path="$2"

  if [ -d "${source_path}" ]; then
    mkdir -p "${target_path}"
    rsync -a --delete --exclude='.DS_Store' \
      "${source_path}/" "${target_path}/"
  fi
}

copy_file() {
  local source_path="$1"
  local target_path="$2"

  if [ -f "${source_path}" ]; then
    mkdir -p "$(dirname "${target_path}")"
    cp "${source_path}" "${target_path}"
  fi
}

sync_dir "${home_dir}/.agents/skills" "${repo_dir}/agents/skills"
sync_dir "${home_dir}/.claude/skills" "${repo_dir}/claude/skills"
sync_dir "${home_dir}/.claude/output-styles" "${repo_dir}/claude/output-styles"
sync_dir "${home_dir}/.pi/agent/extensions" "${repo_dir}/pi/extensions"
sync_dir "${home_dir}/.pi/agent/themes" "${repo_dir}/pi/themes"

copy_file "${home_dir}/.claude/CLAUDE.md" "${repo_dir}/CLAUDE.md"
copy_file "${home_dir}/.claude/AGENTS.md" "${repo_dir}/AGENTS.md"
copy_file "${home_dir}/.claude/settings.json" "${repo_dir}/claude/settings.json"
copy_file "${home_dir}/.claude/statusline.sh" "${repo_dir}/claude/statusline.sh"
copy_file "${home_dir}/.pi/agent/settings.json" "${repo_dir}/pi/settings.json"
copy_file "${home_dir}/.pi/agent/npm/package.json" "${repo_dir}/pi/npm/package.json"
copy_file "${home_dir}/.pi/agent/npm/package-lock.json" "${repo_dir}/pi/npm/package-lock.json"

echo "Synced agent config into ${repo_dir}"
