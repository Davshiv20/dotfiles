---
name: blog-first-draft
description: Write the first draft of an engineering blog post or technical explainer — the structure, the section-by-section skeleton, and the sentence-level language rules that make it read like a professional publication rather than an internal doc. Trigger on "write a blog post", "blog draft", "write this up as an article", "explainer post", "turn this into a post", or when finished engineering work needs a public-facing write-up.
---

# Blog First Draft

Produce a draft that a reader outside the team can follow start to finish, and that an editor at a real
publication would not have to rewrite.

## Before writing

Answer these three, in one sentence each. If you can't, ask the user rather than guessing.

1. **Who is the reader, and what do they already know?** An engineer who has never seen this codebase is
   the usual answer. It decides which terms get a gloss and which don't.
2. **What is the one thing they should remember?** Everything in the draft either supports it or gets cut.
3. **What do we actually know vs. what are we inferring?** Anything inferred gets labelled in the text.
   See "Honesty scaffolding" below — this is not optional and it is what makes a post credible.

## Structure

Nine moves. Numbered sections are the reader's map — keep the numbering visible.

| # | Move | What it does | Length |
|---|---|---|---|
| 1 | **Hero + dek** | Title says what was built. The dek (2–3 lines under it) states the payoff and the honest scope in plain language. | 3 lines |
| 2 | **The hook** | The target experience, described as a user sees it — no architecture yet. A live demo, screenshot, or a concrete "user asks X, then Y appears" walkthrough. | 1–2 paras |
| 3 | **The real question** | Reframe: name the interesting problem and dismiss the boring one. *"The interesting question isn't how you draw a bar chart. It's everything around it: …"* Then list the questions the post will answer — and answer exactly those, in that order. | 1 para |
| 4 | **Prior art** | What already existed, and how sure you are of each claim. Link every source. | 1 section |
| 5 | **What you built on top** | The gap between prior art and your stack, then your pieces, one card each. This is the section people came for. | 1 section |
| 6 | **The mapping table** | Their property ≈ your implementation, one row each, with the file that earns it. The single highest-density artifact in the post. | 1 table |
| 7 | **Where you departed** | Numbered, one per departure, each with the constraint that forced it. Departures are more interesting than adoptions — give them room. | 3–5 blocks |
| 8 | **Lessons that save a day** | The bugs that cost you real time. Concrete, reproducible, with the fix. This is what gets the post shared. | 2–3 blocks |
| 9 | **Was it worth it + Sources** | Honest verdict, then generalise past your specific case. Sources last, with what each one backs. | 2 paras + list |

Section 3 is load-bearing: the questions it raises are a contract. A reader who finishes the post should be
able to point at where each one got answered.

## Language rules

The first four are preferences — apply them where they help and let the subject matter overrule them. The
rest hold in almost every case.

**Start where the reader already is.** Open on the situation they recognise, then turn to what changed:
*"Rendering a chart in a chat reply has always meant waiting for the reply to finish. It doesn't have to."*
Two sentences and the stakes are clear. Opening with architecture works only if the audience is already
inside the problem.

**Keep most sentences to one idea.** Break the compound ones that carry three. Vary the rhythm on purpose —
a long explanatory sentence, then a short one that lands it — rather than making every sentence short,
which reads as clipped.

**Prefer the concrete detail to the intensifier.** `very`, `completely`, `genuinely`, `emphatically`,
`incredibly`, `truly`, `simply`, `really` — each is usually standing in for a fact. Sweep for them before
shipping and replace rather than just delete. Keep one if the emphasis is real and earned.

**Use "you" for what the reader will hit, "we" for what your team did.** Second person makes advice land and
keeps instructions direct. Drop it for passages that are pure narrative of what happened.

**Gloss jargon inline with an em-dash appositive, once, on first use.** *"a vector database — a store that
retrieves records by similarity rather than exact match — sitting behind the agent."* Never a glossary box,
never a footnote, never twice.

**Cut self-praise.** No "the fun part," "the part we're proud of," "elegantly," "beautifully,"
"embarrassingly direct." State what the thing does and let the reader be impressed. Replace
*"the move we're proudest of"* with *"the piece that makes it compose."*

**Attribute every non-obvious number and claim.** Name the source, use an active verb, give the specific
figure: *"their docs put the cap at 16 MiB."* An unattributed number reads as invented.

**Prefer numbers to adjectives.** "an 8 KB runaway guard," "24 KB of chart HTML," "roughly the slowest
widget, not the sum" — all stronger than "large," "significant," "much faster."

**Give every sentence a subject.** Passive constructions hide who did what, which in a comparison post is
exactly the information the reader needs. *"The tag is lifted out of the stream"* → *"The client lifts the
tag out of the stream once the text has arrived."*

**Subheads are short declaratives, not labels.** "A `<canvas>` cannot read a CSS variable," "The allowlist
has two halves" — each is a claim. Not "Architecture Overview," not "Implementation Details."

**Close short.** One forward-looking line, ideally with a small turn in it. No summary paragraph — the
reader just read it.

**Never:** exclamation marks, "we're excited to announce," "in today's fast-paced world," "it's important
to note that," "leverage" as a verb, hedging stacks ("it might potentially be possible that").

## Honesty scaffolding

A technical post makes claims about systems you did not build. Get this wrong once and the whole post is
suspect. Three devices:

1. **Margin notes** (`.src-note`) directly under any section that mixes documented fact with inference:
   *"Verified against the vendor's published docs. The finer details below are not published; they're
   observable behaviour plus the community's reverse-engineering, and are labelled as such."*
2. **Inline confidence tags** on comparison-table rows: `documented` vs `observable behaviour`. One word,
   in a smaller face, next to the claim it qualifies.
3. **A Sources section** that says *what each link backs*, with the load-bearing sentence quoted verbatim —
   not a bare list of URLs.

**Verify links before shipping.** Fetch every source page and confirm it says what you're claiming. This
routinely catches a specific failure: a plausible technical claim about someone else's system that no page
of theirs actually makes, and that one of their help articles quietly contradicts. Cite the page you read,
not the page you remember.

## Tone toward other people's work

If the post compares your work to a company's product, appreciate the work and drop the negations.
*"It feels like magic. It is not — it is a set of design choices"* reads as a put-down. *"What makes it
feel that way is craft — a small set of deliberate design choices, most of which they have described in
public"* says the same thing and credits the team. Never frame your version as beating theirs; frame
departures as constraints your stack imposed.

## Format

Default to a self-contained HTML file in `docs/` — one file, inline CSS, no build step, opens in a browser
and shares as a link. Match the visual system of the existing posts in `docs/` (dark theme, numbered
sections, `.callout` / `.src-note` / `.dep` / `.maprow` components already defined in them). Copy the
`<style>` block from an existing post rather than inventing a new palette.

Use markdown instead when the destination is a repo README, a PR description, or a platform that renders
markdown itself.

## Reusable components

These earn their keep — reach for them by name:

- **`.maprow` comparison table** — their property ≈ ours, with the file that implements it
- **`.dep` numbered block** — one departure, its constraint, and the code
- **`.callout.good` / `.callout.bad`** — the rule to follow / the trap to avoid
- **`.src-note`** — the confidence qualifier under a claim
- **A live demo** — for anything about timing, streaming, or animation, a working demo beats three
  paragraphs. Static prose cannot show "the card appears mid-sentence." Make the demo do what the post
  claims: if the text says two things happen concurrently, the demo must not run them in sequence.
- **A before/after toggle** — for a visual bug (theme flip, layout shift), let the reader trigger it

## Checklist before shipping

- [ ] Every question raised in section 3 is answered somewhere
- [ ] Every claim about someone else's system is either linked or labelled as observed
- [ ] Every link fetched and confirmed to say what you claim
- [ ] Intensifier and self-praise sweep done
- [ ] Every acronym and framework name glossed on first use
- [ ] Section headings read as claims, not labels
- [ ] Any demo or animation matches the behaviour the prose describes
- [ ] File paths in the post exist (`ls` them)
- [ ] Read the first and last paragraph back to back — do they still describe the same post?
