# dotagents

Version-controlled home for AI-agent configuration, prompts, and skills.

## Contents

- `agents/skills/` → `~/.agents/skills/`
- `claude/CLAUDE.md` → `~/.claude/CLAUDE.md`
- `claude/AGENTS.md` → `~/.claude/AGENTS.md`
- `claude/skills/` → `~/.claude/skills/`

Runtime state, caches, project memories, plans, logs, and secrets are intentionally ignored.

## Sync from this machine into the repo

```sh
./scripts/pull-from-home.sh
```

## Install repo files onto a machine

```sh
./scripts/install.sh
```

The install script backs up existing files/directories before replacing them with symlinks to this repo.
