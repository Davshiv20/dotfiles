#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
home_dir="${HOME}"

# Home-relative files mirrored under home/ (installed back via symlink).
home_files=(
  .zshrc
  .tmux.conf
  .gitconfig
  .bunfig.toml
  .config/git/ignore
  .config/uv/uv.toml
  .config/zed/settings.json
  .config/zed/keymap.json
  .ai-usage/claude-statusline.sh
  .claude/statusline.sh
)

# Known token shapes plus generic KEY=longvalue assignments. Secrets belong in
# ~/.zshrc.local (untracked), never in a tracked file: this repo is public.
secret_pattern='(sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|thing_pat_[A-Za-z0-9_-]{20,}|apikey_[A-Za-z0-9_]{20,}|fc-[a-f0-9]{24,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(API_KEY|TOKEN|SECRET|PASSWORD)=["'"'"']?[A-Za-z0-9_./+-]{16,})'

sync_dir() {
  local source_path="$1"
  local target_path="$2"

  # Already symlinked into this repo by install.sh: nothing to copy.
  if [ -d "${source_path}" ] && ! [ "${source_path}" -ef "${target_path}" ]; then
    mkdir -p "${target_path}"
    # --copy-unsafe-links: skill symlinks point at ~/.agents via relative paths
    # that don't exist inside the repo, so store their contents instead.
    # synced/ is Claude Code's account-synced skill cache, not user config.
    rsync -a --delete --copy-unsafe-links --exclude='.DS_Store' --exclude='synced/' \
      "${source_path}/" "${target_path}/"
  fi
}

copy_file() {
  local source_path="$1"
  local target_path="$2"

  if [ -f "${source_path}" ] && ! [ "${source_path}" -ef "${target_path}" ]; then
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
copy_file "${home_dir}/.pi/agent/settings.json" "${repo_dir}/pi/settings.json"
copy_file "${home_dir}/.pi/agent/npm/package.json" "${repo_dir}/pi/npm/package.json"
copy_file "${home_dir}/.pi/agent/npm/package-lock.json" "${repo_dir}/pi/npm/package-lock.json"

for relative_path in "${home_files[@]}"; do
  copy_file "${home_dir}/${relative_path}" "${repo_dir}/home/${relative_path}"
done

# Brew formulae, casks, VS Code extensions, uv tools and global npm packages.
if command -v brew >/dev/null 2>&1; then
  # Local taps have no remote, so they'd break `brew bundle install` elsewhere.
  brew bundle dump --file=- | grep -v '^tap "local/' > "${repo_dir}/Brewfile"
fi

if leaks="$(grep -rEnI --exclude-dir=.git "${secret_pattern}" "${repo_dir}")"; then
  echo "Refusing: secret-looking values found. Move them to ~/.zshrc.local and re-run." >&2
  echo "${leaks}" | cut -c1-120 >&2
  exit 1
fi

echo "Synced agent, shell and CLI config into ${repo_dir}"
