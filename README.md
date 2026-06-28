# dotagents

Personal, version-controlled configuration for AI coding agents.

This repo stores reusable agent instructions and skills so they can be synced across machines instead of living only in `~/.agents` and `~/.claude`.

## What is tracked

```text
agents/skills/          -> ~/.agents/skills/
claude/CLAUDE.md        -> ~/.claude/CLAUDE.md
claude/AGENTS.md        -> ~/.claude/AGENTS.md
claude/skills/          -> ~/.claude/skills/
scripts/install.sh      -> install this repo onto a machine
scripts/pull-from-home.sh -> sync current local config back into this repo
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
~/Desktop/dotagents
```

It is a normal git repo. The initial commit has already been created locally.

It has **not** been pushed yet unless you add a remote and push it yourself.

Check with:

```sh
cd ~/Desktop/dotagents
git remote -v
git status --short --branch
```

If `git remote -v` prints nothing, no remote exists yet.

## Daily usage on this machine

After editing skills or Claude/agent instructions in your normal home locations, sync them into this repo:

```sh
cd ~/Desktop/dotagents
./scripts/pull-from-home.sh
git diff
git add .
git commit -m "Update agent config"
```

Then push if a remote has been configured:

```sh
git push
```

## Installing on a new laptop

Clone the repo somewhere, for example:

```sh
cd ~/Desktop
git clone <YOUR_REPO_URL> dotagents
cd dotagents
```

Install/symlink the repo into the expected home-directory locations:

```sh
./scripts/install.sh
```

The install script links:

```text
~/Desktop/dotagents/agents/skills  -> ~/.agents/skills
~/Desktop/dotagents/claude/skills  -> ~/.claude/skills
~/Desktop/dotagents/claude/CLAUDE.md -> ~/.claude/CLAUDE.md
~/Desktop/dotagents/claude/AGENTS.md -> ~/.claude/AGENTS.md
```

If those files/directories already exist, the script backs them up first using a suffix like:

```text
.backup-YYYYMMDD-HHMMSS
```

After installation, edits made in `~/.agents/skills`, `~/.claude/skills`, `~/.claude/CLAUDE.md`, or `~/.claude/AGENTS.md` will point at this repo via symlinks.

## Publishing to GitHub

Create an empty GitHub repo, then run:

```sh
cd ~/Desktop/dotagents
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
cd ~/Desktop/dotagents
git status --short
rg -n --hidden -i '(api[_-]?key|secret|token|password|private key|sk-[A-Za-z0-9])' --glob '!.git/**' .
```

Review any matches before publishing.
