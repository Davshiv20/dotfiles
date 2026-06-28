# AGENTS.md

## Core Philosophy

**Correctness first, then clarity, then performance.** In that order. Never sacrifice correctness for cleverness.

**Explicit over implicit.** Name things what they are. Avoid magic.

**Complexity must be earned.** If a simpler solution exists, use it. Abstractions are a liability until proven an asset.

**Measure before optimizing.** No perf work without a profiler output or a concrete benchmark. Intuition is a starting hypothesis, not a conclusion.

**Ownership.** Code should be owned by one thing. If two systems need the same logic, that's a design smell — resolve it, don't copy-paste.

---

## Communication Style

- Be direct and terse. No preamble. No "Great question!" No "Certainly!".
- Lead with the answer. Context and caveats come after, if necessary.
- If I'm wrong, say so immediately and explain why. Don't soften it to the point of ambiguity.
- Use plain prose. Avoid excessive bullet-point fragmentation for things that are naturally continuous reasoning.
- Code examples > lengthy prose explanations. Show, then explain.
- When you're uncertain, say so explicitly. Don't hallucinate APIs or behavior.

---

## Code Generation Rules

### Always

- Write code that compiles/runs correctly on the first try. If you are not confident, say so.
- Use the language's idiomatic patterns. Don't write Java-style OOP in Go. Don't write Go-style imperative code in Haskell.
- Include error handling. No bare `catch (e) {}`. No ignored `Result`/`Option`. No unchecked nulls on critical paths.
- Name variables for what they *are*, not what they *do*. `userRecord` not `fetchedData`.
- Functions do one thing. If a function needs a comment to explain what it does, its name is wrong or it needs to be split.
- Keep functions short. If it doesn't fit in ~40 lines, there's probably a missing abstraction.
- Prefer immutability. Mutation should be localized and obvious.

### Never

- Never generate placeholder code with `TODO: implement this`. Either implement it or tell me what I need to fill in and why.
- Never use `any` in TypeScript without a comment explaining why it's unavoidable.
- Never suppress linter warnings without a comment.
- Never use `sleep`/polling as a synchronization mechanism.
- Never generate God objects or God functions.
- Never use stringly-typed interfaces where enums or discriminated unions exist.
- Never return bare booleans from functions that can fail — return a Result type or throw a typed error.

### Formatting

- Follow the project's existing style. If no style exists, default to the language's standard formatter (`rustfmt`, `gofmt`, `black`, `prettier`).
- No trailing whitespace. Consistent indentation.
- Imports: stdlib → third-party → internal. Alphabetically within groups.

---

## Language-Specific Defaults

### TypeScript / Node.js

- `strict: true` in tsconfig. No exceptions.
- Always use `bun` over npm. Create `~/.bunfig.toml`:
```toml
  [install]
  minimumReleaseAge = 604800
```
- `unknown` over `any`. Narrow explicitly.
- Async functions must handle rejection. Floating promises are bugs.
- Use `zod` (or equivalent) to validate data at system boundaries (API input, env vars, config).
- ESM only for new projects. No CommonJS.
- Avoid `class` unless implementing an interface or working with a framework that requires it. Prefer plain functions and closures.

### Python

- Use `uv` over poetry/pip. Create `~/.config/uv/uv.toml`:
```toml
  exclude-newer = "7 days"
```
- Type hints on all function signatures. Use `mypy` or `pyright`.
- `pathlib.Path` over `os.path`. Always.
- Dataclasses or `pydantic` models over raw dicts for structured data.
- Context managers (`with`) for any resource that has a lifecycle (files, DB connections, locks).
- `logging` module, not `print`. Structured logging in production code.

### SQL

- Migrations are append-only. Never edit an applied migration.
- Every migration must be reversible (include a `down` migration).
- No `SELECT *` in application code. Name your columns.
- Indexes are not free. Justify every index with a query pattern.
- Long-running transactions are bugs. Keep them short.

---

## Architecture & Design

**Boundaries first.** Define module/service boundaries before writing implementation. Data flow should be obvious from the structure.

**Depend on abstractions, not implementations.** But don't abstract prematurely — wait for the second use case.

**Shared mutable state is the root of most production incidents.** Isolate it, protect it, log access to it.

**Distributed systems are hard.** Assume partial failure. Design for idempotency. Use correlation IDs. Log at boundaries.

**Event-driven ≠ simple.** Events are great for decoupling but terrible for traceability. Every event must have a schema, a version, and an owner.

**Config belongs in the environment.** Not in source code, not in a database, not hardcoded.

**Feature flags are technical debt.** Add them intentionally, remove them on a schedule.
