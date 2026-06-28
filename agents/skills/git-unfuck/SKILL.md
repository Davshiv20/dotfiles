---
name: git-unfuck
description: Diagnose the current git repo state (detached HEAD, conflicts, unpushed work, stashes, dirty tree, diverged branches) and propose the safest recovery path. Use when the user is confused about their git state, says things are broken, or asks to "unfuck" / clean up / recover git.
model: opus
---

# git-unfuck

Goal: figure out what state the repo is in, explain it plainly, and recommend the **safest** next step. Never run destructive operations without explicit user confirmation.

## Procedure

1. **Confirm you're in a git repo.** If not, say so and stop.

2. **Gather state in parallel** (single message, multiple Bash calls):
   - `git status --short --branch`
   - `git log --oneline -20 --all --decorate --graph`
   - `git stash list`
   - `git branch -vv` (shows upstream + ahead/behind)
   - `git diff --stat` and `git diff --stat --cached`
   - `git rev-parse --abbrev-ref HEAD` (catches detached HEAD: returns `HEAD`)
   - `ls -la .git/ | grep -E 'MERGE_HEAD|REBASE|CHERRY_PICK|BISECT'` to catch in-progress operations

3. **Diagnose.** Classify the situation into one or more of:
   - Detached HEAD with unsaved commits
   - Mid-merge / mid-rebase / mid-cherry-pick / mid-bisect
   - Merge conflicts unresolved
   - Uncommitted changes (staged / unstaged / untracked)
   - Stashes that might be forgotten
   - Local branch ahead/behind/diverged from upstream
   - Branch with no upstream
   - Reflog entries suggesting recently-lost work

4. **Explain plainly** what's going on in 2-4 sentences. Lead with the diagnosis.

5. **Propose a recovery plan.** Order: least destructive first. For each step, show the exact command.
   - Prefer `git stash`, `git switch -c backup/<name>`, or creating a recovery branch over `reset --hard`, `clean -fd`, or `checkout .`
   - If reflog recovery is needed, show `git reflog` first so the user can pick the right SHA
   - If the safest fix involves rewriting history that may be pushed, flag this explicitly

6. **Ask before doing anything destructive.** Even if the user said "unfuck it," confirm before:
   - `reset --hard`, `clean -fd`, `checkout .`, `restore .`
   - Deleting branches, stashes, or tags
   - Any force push
   - Aborting an in-progress merge/rebase if it has manual conflict resolutions

## Output shape

```
**Diagnosis:** <1-3 sentences>

**State:**
- <bullet per notable thing>

**Recommended recovery:**
1. <step with command>
2. <step with command>

**Risky steps (need your OK):**
- <command + what it destroys>
```

## Notes

- Never run `git config` changes.
- Never `--no-verify` or skip hooks.
- If something looks like in-progress user work you don't understand (unfamiliar branch, stash, untracked file), investigate before touching it.
- If the repo is genuinely fine, say so — don't invent problems.
