# dotfiles

Personal, version-controlled configuration for AI coding agents.

This repo stores reusable agent instructions and skills so they can be synced across machines instead of living only in `~/.agents` and `~/.claude`.

## What is tracked

```text
AGENTS.md                  -> ~/.claude/AGENTS.md
CLAUDE.md                  -> ~/.claude/CLAUDE.md
agents/skills/             -> ~/.agents/skills/
claude/skills/             -> ~/.claude/skills/
claude/output-styles/      -> ~/.claude/output-styles/
claude/settings.json       -> ~/.claude/settings.json
claude/statusline.sh       -> ~/.claude/statusline.sh
claude/ai-agent-status.sh  -> ~/.claude/ai-agent-status.sh
pi/extensions/             -> ~/.pi/agent/extensions/
pi/themes/                 -> ~/.pi/agent/themes/
pi/settings.json           -> ~/.pi/agent/settings.json
pi/npm/package*.json       -> ~/.pi/agent/npm/package*.json
scripts/install.sh         -> install this repo onto a machine
scripts/pull-from-home.sh  -> sync current local config back into this repo
```

## What is intentionally not tracked

Runtime state and machine-local data should stay out of git:

- Claude project memories
- caches
- plans
- shell snapshots
- logs
- API keys / secrets
- `.env` files

See `.gitignore` for the exact rules.

## Current setup

The repo lives at:

```sh
~/Desktop/dotfiles
```

It is a normal git repo. The initial commit has already been created locally.

It has **not** been pushed yet unless you add a remote and push it yourself.

Check with:

```sh
cd ~/Desktop/dotfiles
git remote -v
git status --short --branch
```

If `git remote -v` prints nothing, no remote exists yet.

## Daily usage on this machine

After editing skills or Claude/agent instructions in your normal home locations, sync them into this repo:

```sh
cd ~/Desktop/dotfiles
./scripts/pull-from-home.sh
git diff
git add .
git commit -m "Update agent config"
```

Then push if a remote has been configured:

```sh
git push
```

### Cross-runtime agent visibility

The Claude Code status line always includes a live summary for Claude Code,
Codex, Hermes, and Pi agents, for example:

```text
ai claude 7 (2 waiting) · codex 1 · hermes 2 · pi 3
```

Claude Code supplies structured working/waiting status through
`claude agents --json`; completed Claude background jobs are excluded. Codex,
Hermes, and Pi expose process counts because their CLIs do not currently offer
an equivalent active-agent JSON endpoint. Hermes infrastructure processes such
as the gateway, dashboard, and proxy are excluded.

## Installing on a new laptop

Clone the repo somewhere, for example:

```sh
cd ~/Desktop
git clone <YOUR_REPO_URL> dotfiles
cd dotfiles
```

Install/symlink the repo into the expected home-directory locations:

```sh
./scripts/install.sh
```

The install script links:

```text
~/Desktop/dotfiles/AGENTS.md      -> ~/.claude/AGENTS.md
~/Desktop/dotfiles/CLAUDE.md      -> ~/.claude/CLAUDE.md
~/Desktop/dotfiles/agents/skills  -> ~/.agents/skills
~/Desktop/dotfiles/claude/skills  -> ~/.claude/skills
```

If those files/directories already exist, the script backs them up first using a suffix like:

```text
.backup-YYYYMMDD-HHMMSS
```

After installation, edits made in `~/.agents/skills`, `~/.claude/skills`, `~/.claude/CLAUDE.md`, or `~/.claude/AGENTS.md` will point at this repo via symlinks.

## Publishing to GitHub

Create an empty GitHub repo, then run:

```sh
cd ~/Desktop/dotfiles
git remote add origin git@github.com:<USERNAME>/<REPO>.git
git push -u origin main
```

Or with HTTPS:

```sh
git remote add origin https://github.com/<USERNAME>/<REPO>.git
git push -u origin main
```

Recommended: keep this repo private unless you are sure none of your prompts or skills contain private information.

## Safety checklist before pushing

```sh
cd ~/Desktop/dotfiles
git status --short
rg -n --hidden -i '(api[_-]?key|secret|token|password|private key|sk-[A-Za-z0-9])' --glob '!.git/**' .
```

Review any matches before publishing.
