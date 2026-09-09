---
name: pr-description
description: Use when writing or editing a pull request title or body. Produce concise PR commentary focused on the final aggregate change, with diagrams, snippets, and before/after evidence where useful.
---

# PR Description Skill

Use this skill when writing or editing a pull request title or body.

## Core rules

- Do not write essays unless the change is truly impressive, difficult, high-risk, or wide-scoped.
- Do not include validation/test-run sections or say tests were run.
- Keep text concise and scannable.
- Prefer bullets over paragraphs.
- Focus only on the final aggregate squash-merge result.
- Do not mention intermediate PR details, refactor history, commit-by-commit changes, or PR-size reductions.
- Use code references when helpful.

## Preferred content

Favor concrete artifacts over prose:

- Mermaid codeblock diagrams.
- Code samples or snippets:
  - internals
  - API shape
  - sample usage
  - before/after code when useful
- Short bullet lists for the few words that need to be written.

## Visual changes

For any direct or indirect visual change:

- Include a before/after table.
- Use uploaded images or videos.

```md
| Before | After |
| --- | --- |
| <img src="..." /> | <img src="..." /> |
```

## Benchmarks

For benchmark-related PRs:

- Always show before/after tables.
- Baseline = target branch.
- Candidate = this PR.

```md
| Scenario | Baseline | Candidate | Delta |
| --- | ---: | ---: | ---: |
| ... | ... | ... | ... |
```

## High-risk / impressive changes

For truly impressive, difficult, high-risk, or wide-scoped changes, it is okay to write the body like a short technical blog post, but still anchor it in concrete artifacts:

- context
- key design choice
- diagram
- code/sample usage
- before/after screenshots or benchmark tables when relevant

## Default PR body shape

````md
## Summary

- ...
- ...

```mermaid
flowchart LR
  A[Before] --> B[After]
```

## Code

```ts
// sample usage or key internal shape
```
````
