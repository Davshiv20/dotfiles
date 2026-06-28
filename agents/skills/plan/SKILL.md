---
name: plan
description: Create a clear engineering plan before implementation, breaking down the goal, scope, risks, edge cases, and testing strategy.
model: opus
---

# /plan Skill

Use this skill when Shivam wants to think through an implementation before coding.

The goal is to turn a vague or high-level task into a practical execution plan that a developer or coding agent can follow safely.

## When to Use

Use this skill when Shivam says things like:

- `/plan`
- `plan this`
- `make a plan`
- `how should I approach this`
- `before coding, think through this`
- `break this task down`
- `give me an implementation plan`
- `what should the agent do`

Also use it when the task is risky, multi-step, architectural, or likely to touch several files.

## Core Behavior

Before suggesting changes, understand the current flow and the desired end state.

If the request is clear enough, do not ask unnecessary questions. Make reasonable assumptions and state them.

If something is genuinely blocking, ask at most one focused clarification question. Otherwise, give the best possible plan with the available context.

Do not write code unless Shivam explicitly asks for implementation after the plan.

## Output Format

```md
# Plan: <short task name>

## Goal

Explain the desired end state in 2–4 sentences.

## Current Understanding

Summarize:
- Existing behavior
- Desired behavior
- Known constraints
- Assumptions

## Scope

### In Scope

List what this plan covers.

### Out of Scope

List what should not be changed right now.

## Proposed Approach

Describe the strategy and why it is safer than obvious alternatives.

## Step-by-Step Implementation Plan

1. Inspect the relevant existing flow.
   - What to check
   - Why it matters
   - What to be careful about

2. Identify the source of truth.
   - State owner
   - Data owner
   - API or module boundary

3. Make the smallest safe change.
   - Prefer existing patterns
   - Avoid unnecessary rewrites

4. Update dependent logic.
   - Frontend/backend/db/workers/tests as needed

5. Add or adjust tests.
   - Happy path
   - Failure path
   - Regression path

6. Verify manually.
   - User-visible behavior
   - Error behavior
   - Edge cases

## Files / Areas Likely Involved

List likely files, modules, components, endpoints, workers, tests, or configs.

Use “likely” when exact files are unknown.

## Edge Cases

Consider:
- Race conditions
- Retries
- Duplicate requests
- Multi-tab behavior
- Multi-worker behavior
- Empty/null states
- Permission issues
- Failure modes
- Backward compatibility
- User-visible regressions

## Testing Plan

Include:
- Unit tests
- Integration tests
- Manual checks
- Regression checks

Be specific about the test cases.

## Rollout / Safety Notes

Mention:
- Feature flags, if useful
- Logging
- Metrics
- Fallback behavior
- Backward-compatible migrations
- Rollback considerations

## Final Checklist

- [ ] Existing behavior understood
- [ ] Source of truth identified
- [ ] Minimal change designed
- [ ] Edge cases covered
- [ ] Tests planned
- [ ] Manual verification path clear
- [ ] Rollback/fallback considered
