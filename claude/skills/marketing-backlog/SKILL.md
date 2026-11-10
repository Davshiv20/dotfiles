---
name: marketing-backlog
description: Mine the repo — commits, merged PRs, new modules, existing docs — for everything shipped that could become public marketing material, sanitize it into use-case-agnostic form, and sort it into three tiers (LinkedIn post, blog post, demo/talk). Trigger on "what can we blog about", "marketing ideas from the repo", "content backlog", "what have we shipped that we can talk about", "mine the repo for content", "what's worth posting".
---

# Marketing Backlog

Turn shipped engineering work into a ranked list of publishable material. Assume the repo holds
client-funded work: **nothing that identifies a client, their data, or their vocabulary may leave it**.
Every candidate gets abstracted before it gets scored. If the repo turns out to be fully in-house or
open-source, the sanitization phase costs little and the tiering still applies.

Output is a backlog file, not a finished post. Drafting happens per item, later, with `blog-first-draft`
for tier 2.

## Rule zero: the specificity budget

You have one budget for specific detail. **Spend it on the engineering, never on the customer.**

| Keep specific (this is what makes it worth reading) | Make generic (this is what gets you sued) |
|---|---|
| Algorithms, data structures, protocols | Client names, logos, people, deal names |
| Framework, library and vendor names — naming them is what makes it credible | Which client asked for it, and why |
| Failure modes, race conditions, the bug that cost a day | Industry vertical when it's a small field |
| Latency numbers, payload sizes, token counts, guard limits | Absolute business metrics ("$4M pipeline") |
| File and module architecture | Custom schema field names, object names, tenant IDs |
| Code, as long as it carries no client vocabulary | Screenshots of real records or real customer data |

A post that says *"we cut a 40-second wait to 900 ms by reserving the stream index before going async"* is
publishable. The same post with *"for a large healthcare CRM client"* is not — and adds nothing.

## Phase 0 — Orient

Never assume a layout. Discover it, then set two variables the rest of the commands use.

```bash
# Top-level directories, by file count — the code lives in the top few
git ls-files | awk -F/ 'NF>1 {print $1}' | sort | uniq -c | sort -rn | head -10

# Does this repo tag commits with ticket IDs? What prefix?
git log --pretty=%s | grep -oE '\b[A-Z]{2,6}-[0-9]+\b' | sed 's/-[0-9]*$//' \
  | sort | uniq -c | sort -rn | head -5

# Where prose and runnable examples already live
git ls-files | grep -iE '(^|/)(docs?|blog|writeups?|adr)/' | head -20
git ls-files | grep -iE '(demo|example|sample)' | head -20
```

Then set, from what you just saw:

```bash
SINCE="6 months ago"
CODE="src"        # space-separated code roots: "src", or "lib app internal", or "." for flat repos
DEPTH=3           # path components that name a subsystem here; 2 for shallow repos, 4 for deeply nested
```

## Phase 1 — Mine

These assume only `git`. Run all of them.

```bash
# 1. Which subsystems actually saw work — where the shipped features live
git log --since="$SINCE" --name-only --pretty=format: -- $CODE | grep -v '^$' \
  | cut -d/ -f1-$DEPTH | sort | uniq -c | sort -rn | head -20

# 2. New modules — a new file is usually a new capability, the richest seam
git log --diff-filter=A --since="$SINCE" --name-only --pretty=format: -- $CODE | grep -v '^$' | sort -u

# 3. Merged PRs by title (git-only; works without any GitHub access)
git log --merges --since="$SINCE" --pretty="%ad|%s" --date=short

# 4. Ticket clusters — many commits on one ticket means a substantial feature
git log --since="$SINCE" --pretty="%s" | grep -oE '\b[A-Z]{2,6}-[0-9]+\b' | sort | uniq -c | sort -rn | head -20

# 5. Feature commits, ignoring CI and housekeeping noise
git log --since="$SINCE" --no-merges --pretty="%h|%ad|%an|%s" --date=short \
  | grep -viE 'version bump|\[skip ci\]|^.*\|Merge |lint|format|typo|bump deps' | head -60
```

**GitHub enrichment is optional and often unavailable.** `gh pr list` needs an authenticated account with
access to the repo, which frequently fails on private org repos even when `gh auth status` looks healthy.
Try it; fall back to step 3 without comment if it errors:

```bash
gh pr list --state merged --limit 100 \
  --json number,title,mergedAt,author,additions,deletions,labels 2>/dev/null \
  --jq '.[] | [.mergedAt[:10], .author.login, "+\(.additions)/-\(.deletions)", .title] | @tsv'
```

If the repo carries per-directory documentation (`CLAUDE.md`, `README.md`, `ARCHITECTURE.md`) read the ones
for any subsystem that shows up hot — they explain what the layer is for, which is what you need in order to
describe a feature to a stranger.

## Phase 2 — Cluster into candidates

A candidate is **a capability, not a commit**. Twelve commits on one ticket are one candidate. One commit
that fixes a subtle cross-boundary bug can also be one candidate.

For each, write two lines before judging it:

1. **What it does**, in one sentence a competent engineer outside this codebase would understand.
2. **What was non-obvious about it** — the constraint, the failure mode, the thing you'd tell someone at
   a bar. If line 2 is empty, the candidate is not material. Drop it.

Sources of candidates, roughly in descending yield:

- A new module or subsystem (`--diff-filter=A` output)
- A ticket cluster with 5+ commits
- A bug fix whose root cause spans two layers or two languages
- A performance change with before/after numbers in the commit body
- Anything already written up internally — a design doc, an ADR, a walkthrough — that never went public
- A pattern documented in a directory `CLAUDE.md` — team conventions are content
- Infrastructure that was replaced (migration stories travel well)

## Phase 3 — Abstract, then scan

### The abstraction ladder

Climb until the rung no longer identifies anyone. Stop at the lowest safe rung — over-abstraction makes
the content useless.

| Rung | Example |
|---|---|
| 0 · Raw (never publish) | "Invoice approval routing for *[Client]*'s SAP tenant, fields `ZINV_APPROVER`, `ZCOST_CTR`" |
| 1 · Vendor-generic | "Extracting approver and cost-centre metadata from invoices in SAP" |
| 2 · Category-generic | "Pulling structured fields out of semi-structured business documents" |
| 3 · Problem-generic | "Getting an LLM to populate a 200-field schema it has never seen, without inventing values" |
| 4 · Technique-only | "Schema-conditioned extraction with per-field confidence gating" |

Rung 3 is usually the sweet spot: the problem is universal, the engineering stays specific. If the client is
identifiable from the *shape* of the problem (rare industry, unique scale, a public partnership), go to 4.

### The leak scan

Run before writing a single word of copy. **Report file paths and counts only — never paste a matched value
into the backlog, a draft, or a chat message.**

No pathspec — scan the whole tree, fixtures and tests included. Those leak more than application code.

```bash
# Real-looking emails and domains (fixtures and seed data leak clients constantly)
git grep -lE '[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}' | sort -u

# Tenant / org / account UUIDs
git grep -lE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | sort -u

# Custom-schema vocabulary — adapt the pattern to the platform in play. Custom fields carry the
# client's own words, which is the subtlest leak of all. Examples by platform:
#   Salesforce  '[A-Za-z0-9_]+__c'      SAP  '\bZ[A-Z_]{3,}\b'      Odoo  '\bx_[a-z_]+\b'
git grep -lE '<pattern for your platform>' | sort -u

# Internal hostnames, buckets, warehouses, dashboards
git grep -lEi '(\.internal\b|s3://|gs://|\.slack\.com|\.atlassian\.net|\.lookerstudio)' | sort -u

# Untracked data dumps — CSVs, schema exports, notebooks, result JSON.
# Never a source for public material, and often not gitignored.
git status --porcelain | grep '^??'
```

Maintain `.claude/marketing-denylist.txt` (gitignored): client names, subsidiaries, product names, key
people, and any codename that maps to one. Grep every draft against it. The scan finds *shapes*; the
denylist finds *names*. You need both.

### Sanitizing code samples

Code is the best evidence and the biggest leak surface. Before a snippet goes in anything public:

- Rename any identifier carrying client vocabulary; keep the framework names
- Replace real field names with plausible generic ones (`ZCOST_CTR` → `cost_center`)
- Strip ticket IDs, internal URLs, Slack channels, bucket names, account IDs
- Replace fixture data with obviously-synthetic data (`acme.example.com`, `alice@example.com`)
- Re-read for *comments* — they leak more than code does

### Two things you cannot decide alone

Flag these to the user; do not resolve them yourself:

1. **IP ownership.** Client-funded work may be work-for-hire. Whether a technique built on a client's dime
   can be published is a contract question, not an engineering one. Flag every item with "confirm publishing
   rights" until told a blanket policy exists.
2. **Client courtesy.** Even when legally clear, a client may recognise their own project. If an item is
   recognisable to *them*, note it — someone should ask them first.

## Phase 4 — Tier the candidates

Score each candidate 1–5 on four axes, then apply the routing rule:

| Axis | 1 | 5 |
|---|---|---|
| **Surprise** — would a competent engineer say "huh, I didn't know that"? | Standard practice | Genuinely counterintuitive |
| **Reach** — how many engineers hit this problem? | Only in this stack | Anyone building this class of system |
| **Showable** — is the payoff visible? | Prose only | Must be seen to be believed |
| **Depth** — how much explaining before the payoff lands? | One paragraph | Needs diagrams and code |

**Routing:**

- **Depth ≤ 2 and Surprise ≥ 3** → **Tier 1, LinkedIn.** One idea, one lesson, no setup required.
- **Depth ≥ 3 and Surprise ≥ 3** → **Tier 2, blog post.** Needs room, code, and a diagram.
- **Showable ≥ 4** → **Tier 3, demo** — regardless of depth. Add a talk/CFP abstract if Reach ≥ 4.
- **Surprise ≤ 2 and Reach ≤ 2** → drop it. Most candidates land here; that is the correct outcome.

An item can be tier 2 *and* tier 3. Note it as "blog + demo" and build the demo first — it becomes the
blog's hero asset.

## Tier 1 — LinkedIn

**What it is:** one sharp, self-contained lesson. A bug with a non-obvious cause. A constraint that turned
out to be load-bearing. A number that surprised you. A convention that stopped an argument.

**Format rules, from current platform behaviour:**

- 1,200–1,500 characters. Longer reads as a blog post pasted in the wrong place.
- The first ~210 characters are all that shows before "see more". Put the claim there — not a greeting,
  not "I'm excited to share", not a question fishing for replies.
- The ranked signals are **dwell time** and **substantive comments** (10+ words). Write something that
  takes 40 seconds to read and leaves a question worth answering.
- **No external link in the post body** — it suppresses reach. Link in the first comment.
- ≤3 hashtags, specific ones.
- Formulaic AI cadence is penalised (~47% less reach). No "Here's the thing:" / "Let that sink in." /
  one-line-paragraph staccato throughout.
- Tue–Thu, business hours, is the usual peak.

**Template:**

```
[Line 1: the concrete claim or number. Complete, standalone, no windup.]
[Line 2: the twist — why it isn't what you'd expect.]

[3–5 short paragraphs: the setup, what broke, why. Keep the engineering specific.
Name frameworks. Give real numbers. No client, no vertical, no logos.]

[The generalisable lesson — one sentence, transferable to a reader in a different stack.]

[An open question you actually want answered. Not "thoughts?"]
```

**Anti-patterns:** the humblebrag launch ("thrilled to announce"), the fake-vulnerability story, the
listicle of things everyone knows, any post whose real subject is that your team is great.

## Tier 2 — Blog post

**What it is:** a system, a design decision with alternatives, or an investigation. Needs 1,500+ words,
code, and at least one diagram.

**What travels** (from how technical writing spreads): firsthand experience, proprietary data or numbers
nobody else has, a truth found by practice rather than by reading, a strong claim defended properly, and a
build to something that matters at the end. Product announcements travel poorly — roughly a 4% chance of
reaching a technical front page. Frame every item as *"here is what we learned"*, never *"here is what we
built"*.

**Handoff:** once an item is picked, invoke the **`blog-first-draft`** skill — it owns the structure (hook →
real question → prior art → what you built → mapping table → departures → lessons → verdict + sources),
the language rules, and the honesty scaffolding. Feed it the sanitized candidate and the file paths.

**Blog-specific sanitization:** `blog-first-draft` tells you to cite file paths and link sources. In a public
post, keep module paths (they're architecture) and drop anything that resolves to a private URL, a ticket,
or an internal dashboard.

## Tier 3 — Demo (and the talk that follows it)

**What it is:** behaviour that has to be *seen* — timing, streaming, concurrency, layout, a before/after
that a paragraph cannot convey.

**The isolation requirement is absolute.** Never demo against client data or a client tenant. Build the demo
on a **neutral scenario** with obviously-synthetic data, and pick a domain far from the client's:

- Good neutral domains: personal fitness logs, public transit timetables, weather, open-source repo stats,
  a fictional coffee chain, chess games, library catalogues.
- Bad: anything in the client's industry, anything with the shape of their schema, "a sales pipeline" if the
  client is a sales company.

The neutral scenario is also better material — the audience isn't distracted by unfamiliar jargon.

**Build rules:**

- Self-contained and offline. No VPN, no prod credentials, no live API that can rate-limit you on stage.
- `Problem → Solution → Value`, 3–5 beats maximum. Developers want depth on few things, not a feature tour.
- **The demo must do what the copy claims.** If the text says two things happen concurrently, the demo must
  not run them in sequence — a demo that quietly contradicts its own narration destroys the credibility of
  everything around it.
- Deterministic. Seed the randomness. An LLM call live on stage needs a recorded fallback.
- Record a clean run before you need it. The recording is the deliverable that survives.
- Two shapes that carry well: a single self-contained HTML file with inline CSS/JS for anything
  browser-visible, and a one-command runnable script for pipeline or backend behaviour. Check what the
  repo already has (phase 0) before building either from scratch.

**If Reach ≥ 4, attach a CFP abstract.** Four moves, in this order:

1. The problem **the audience has** — not the problem you solved.
2. The stakes — what it costs them to keep not solving it.
3. A preview of the approach — enough to be credible, not the whole answer.
4. The explicit takeaway — what they will leave knowing or able to do.

Reviewers are picking the right talk for their audience, not the most deserving speaker. Say who the talk
is for and what they walk out with, in the first three sentences.

## Output

Write the backlog into the repo's documentation directory — `<docs-dir>/marketing/backlog.md`, creating
it if needed. Ranked table first, then one brief per item.

```markdown
# Marketing backlog — <date range mined>

| # | Candidate (public framing) | Tier | Surprise | Reach | Showable | Depth | Rights |
|---|---|---|---|---|---|---|---|
| 1 | Streaming two content types out of one token stream | Blog + demo | 5 | 4 | 5 | 4 | confirm |

## 1. Streaming two content types out of one token stream

**Tier:** blog + demo
**Public framing (rung 3):** How do you stream prose and a rendered visual out of a single LLM token
stream without either one blocking the other?
**The non-obvious part:** the index has to be reserved synchronously before the async render starts,
or blocks land out of order on refresh.
**Evidence:** `<code-root>/streaming/publisher.py`, `splitter.py`; ~30 commits, ABC-123
**Neutral demo scenario:** monthly running distance, synthetic
**Sanitization notes:** no client vocabulary in this path; code samples clean as-is
**Rights:** confirm publishing rights — framework-level technique, not client-specific logic
**Effort:** demo 1 day (a partial asset already exists in the repo), post 1 day
```

Keep internal references (file paths, ticket IDs, commit hashes) **in the backlog** — it lives in the repo
and is the audit trail. They get stripped when an item becomes a draft.

## Final gate before anything is published

- [ ] Denylist grep over the final text returns nothing
- [ ] Leak scan patterns return nothing in any included snippet
- [ ] No screenshot contains a real record, name, avatar, or URL
- [ ] Every number is either public, synthetic, or a ratio with no absolute business value attached
- [ ] Someone who works at the client could not identify their own project from this
- [ ] Publishing rights confirmed by a human
- [ ] A demo, if present, does exactly what the words next to it say
