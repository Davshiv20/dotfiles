# dotfiles

Agent, shell, and CLI configuration for my Mac. **This repo is public.**

## What is tracked

```text
AGENTS.md, CLAUDE.md       -> ~/.claude/
claude/settings.json       -> ~/.claude/settings.json
claude/skills/             -> ~/.claude/skills/
claude/output-styles/      -> ~/.claude/output-styles/
agents/skills/             -> ~/.agents/skills/
pi/                        -> ~/.pi/agent/ (extensions, themes, settings, npm)
home/<path>                -> ~/<path>  (.zshrc, .gitconfig, .tmux.conf, .bunfig.toml,
                                         git ignore, uv, zed, Claude statusline)
Brewfile                   -> brew formulae, casks, VS Code extensions,
                              uv tools, global npm packages
```

Not tracked: secrets, `~/.config/gh`, `~/.config/thing` (contain tokens),
Claude memories/caches/plans, and Claude's account-synced skills (`~/.claude/skills/synced`).

## Secrets

Secrets live in `~/.zshrc.local`, which is untracked and sourced by `.zshrc`.
`pull-from-home.sh` refuses to finish if it finds a secret-looking value anywhere in the repo.

## Sync this machine into the repo

```sh
./scripts/pull-from-home.sh
git diff
git commit -am "Update config" && git push
```

## Install on a new machine

```sh
git clone https://github.com/Davshiv20/dotfiles.git ~/Desktop/dotfiles
~/Desktop/dotfiles/scripts/install.sh
```

The script symlinks everything into place. Any existing file is first moved to
`<file>.backup-YYYYMMDD-HHMMSS`. Then it runs `brew bundle install`. Put your secrets in `~/.zshrc.local` afterwards.

Paths in `.zshrc` and `claude/settings.json` assume the username `apple`.

Single branch: `main`.
