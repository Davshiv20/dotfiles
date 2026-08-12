# code-review (vendored)

`code-review.md` is copied verbatim from the official Anthropic plugin marketplace:

- Source: `anthropics/claude-plugins-official` → `plugins/code-review/commands/code-review.md`
- Author: Anthropic
- License: Apache-2.0 (see `LICENSE`)
- Vendored: 2026-08-12

## This is not the built-in `/code-review`

Claude Code ships its own `/code-review` compiled into the CLI binary. That one reviews the
working diff in-session and supports `/code-review ultra`. It has no source file on disk, so
it cannot be vendored here.

This file is a different command that happens to share the name. It reviews a GitHub pull
request with parallel agents, scores each finding 0-100 for confidence, drops anything below
80, and posts the survivors as a `gh pr comment`.

## Note on placement

This is a **command**, not a skill — its frontmatter (`allowed-tools`,
`disable-model-invocation`) is command frontmatter, and it is kept under its original
filename rather than renamed to `SKILL.md`. It lives under `agents/skills/` to match where
the rest of this repo's agent assets are kept. Loading it as a slash command means installing
the upstream plugin (`/plugin install code-review@claude-plugins-official`), which will
collide with the built-in command of the same name.
