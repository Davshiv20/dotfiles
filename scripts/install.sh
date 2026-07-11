#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
timestamp="$(date +%Y%m%d-%H%M%S)"

backup_then_link() {
  local source_path="$1"
  local target_path="$2"

  [ -e "${source_path}" ] || return 0
  mkdir -p "$(dirname "${target_path}")"

  if [ -L "${target_path}" ]; then
    rm "${target_path}"
  elif [ -e "${target_path}" ]; then
    mv "${target_path}" "${target_path}.backup-${timestamp}"
    echo "Backed up ${target_path} -> ${target_path}.backup-${timestamp}"
  fi

  ln -s "${source_path}" "${target_path}"
  echo "Linked ${target_path} -> ${source_path}"
}

backup_then_link "${repo_dir}/agents/skills" "${HOME}/.agents/skills"
backup_then_link "${repo_dir}/claude/skills" "${HOME}/.claude/skills"
backup_then_link "${repo_dir}/claude/output-styles" "${HOME}/.claude/output-styles"
backup_then_link "${repo_dir}/claude/settings.json" "${HOME}/.claude/settings.json"
backup_then_link "${repo_dir}/claude/statusline.sh" "${HOME}/.claude/statusline.sh"
backup_then_link "${repo_dir}/CLAUDE.md" "${HOME}/.claude/CLAUDE.md"
backup_then_link "${repo_dir}/AGENTS.md" "${HOME}/.claude/AGENTS.md"
backup_then_link "${repo_dir}/pi/extensions" "${HOME}/.pi/agent/extensions"
backup_then_link "${repo_dir}/pi/themes" "${HOME}/.pi/agent/themes"
backup_then_link "${repo_dir}/pi/settings.json" "${HOME}/.pi/agent/settings.json"
backup_then_link "${repo_dir}/pi/npm/package.json" "${HOME}/.pi/agent/npm/package.json"
backup_then_link "${repo_dir}/pi/npm/package-lock.json" "${HOME}/.pi/agent/npm/package-lock.json"

echo "Install complete."
