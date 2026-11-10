  ---
  name: htmlify
  description: Render an engineering planning document (RFC, scaling plan, design review, postmortem, audit) as a
  single self-contained HTML file. Use when the input is a structured set of findings + decisions and the audience is
  reviewers who will read it cold in a browser tab. Output is one file with inline CSS, Google Fonts via CDN, no
  JavaScript dependency.
  ---

  # htmlify 

  ## When this skill fires

  - User asks for "a doc," "an RFC," "a plan," "a writeup" *and* the output is meant for team review (not a quick chat
  reply).
  - The content has multiple problems/findings/decisions, not just one explanation.
  - The reader will be busy and skim — so structure has to do most of the work.

  ## When it does NOT fire

  - One-paragraph answers, code review comments, ADRs short enough for markdown.
  - Outputs meant for source control diffing — use markdown instead.
  - User-facing documentation — that's a different design language.

  ## Process

  1. **Read project CLAUDE.md and `~/.claude/CLAUDE.md` first.** Use the brand palette and fonts declared there. If
  none exist, fall back to the defaults below.
  2. **Find or ask for the audience.** Reviewers vs. implementers vs. mixed. A reviewer-doc structures around decisions
   to ratify; an implementer-doc structures around the build sequence.
  3. **Structure top-down from "what to ratify" to "implementation detail."** The reader should be able to stop reading
   at any point and have a coherent picture.
  4. **Author every problem entry as a card with the same shape.** Visual consistency lets the eye skim hundreds of
  words without parsing each one.
  5. **Use `<details>/<summary>` aggressively** for any content longer than ~80 words. Reviewers see the headline;
  expand only what they want to interrogate.
  6. **Color-code by severity tier**, not by section. Tier borders + tier badges share a palette so visual scanning is
  fast.
  7. **Never use JavaScript.** Native HTML/CSS only. Reduces fragility across viewers and email clients.

  ## Document structure (top to bottom)

  ```
  1.  Header + meta strip (status, owner, scope, target)
  2.  TOC — flat, 2-column where possible
  3.  TL;DR — one callout box, 2 paragraphs max
  4.  Quick reference — start-here section, scannable in 60s:
      - Decisions-for-reviewers callout (numbered list of ratification asks)
      - Problems-at-a-glance compact table
      - Plan-at-a-glance compact table
      - Hard rule(s) callout if any
  5.  Goals & non-goals — side-by-side cards
  6.  Why this matters now — 3–4 bullets, not prose
  7.  Problems catalog — tier-grouped cards, collapsible details
  8.  Scenarios / walkthroughs — compact rows with verdict chips
  9.  Foundational patterns — grid of cards
  10. Phased plan — phase cards with deliverables + acceptance criteria
  11. Schema / config / code surface — reference tables
  12. Testing strategy
  13. Rollout sequence
  14. Risks & open questions
  15. Appendix matrix — issue → fix mapping
  ```

  Sections 11–13 are reference material — engineers building the thing read these, reviewers usually skip.

  ## Brand layer

  Default to project CLAUDE.md values. Fall back to these:

  ```css
  :root {
    --navy: #0F2B46;        /* primary, headings, accents */
    --teal: #1A6B5C;        /* secondary, links, success */
    --teal-light: #2A9D8F;  /* accents */
    --gold: #E9A319;        /* warnings, highlight tier */
    --cream: #FAF6F0;       /* page bg */
    --slate: #3D4F5F;       /* body text */
    --white: #FFFFFF;       /* card bg */
    --light-gray: #F4F1EC;  /* table hover, code bg */
    --border: #E5DFD3;
    --shadow: 0 1px 2px rgba(15,43,70,.06), 0 2px 8px rgba(15,43,70,.04);
  }
  ```

  Fonts (Google Fonts CDN):
  - **Playfair Display** (600/700) — h1, h2, card headlines
  - **DM Sans** (400/500/600/700) — body, h3/h4, UI text
  - **JetBrains Mono** (400/500) — code, file paths, IDs

  ```html
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;70
  0&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  ```

  ## Component vocabulary

  Build the doc out of these named primitives. Reuse the same class names across docs so they accumulate familiarity.

  ### `.callout` — semantic boxes

  - `.callout` — default, teal left border (info)
  - `.callout.navy` — high-signal (TL;DR)
  - `.callout.gold` — note, side-channel
  - `.callout.warn` — hard rule, must-read

  ```html
  <div class="callout warn">
    <p><strong>Hard rule.</strong> Do not turn on a second machine before Phase 2 ships.</p>
  </div>
  ```

  ### `.decisions` — "what to ratify" callout

  Numbered list inside a gradient-bordered card. Sits at the top of Quick Reference. Forces the author to articulate
  decisions instead of burying them.

  ### `.tier` chips

  - `.tier-0` → red (revenue/legal)
  - `.tier-1` → gold (flagship UX)
  - `.tier-2` → teal (annoying)
  - `.tier-3` → slate (cosmetic / cost)

  Use as both pill badges (in titles) and as table-cell chips (in matrices). Color is repeated on the
  `.problem.tier-N-border` left border for visual scanning.

  ### `.problem` card

  The workhorse. Every catalog entry uses this shape:

  ```html
  <div class="problem tier-1-border">
    <div class="problem-head">
      <span class="problem-num">P4</span>
      <h4 class="problem-title">Title in DM Sans 17px semibold</h4>
    </div>
    <p class="quote">"Pull-quote in Playfair italic — what the user sees, in their voice."</p>
    <details>
      <summary>read the scenario walkthrough</summary>
      <p><strong>Scenario.</strong> ... long-form prose here ...</p>
    </details>
    <div class="scoring">
      <div><span class="lbl">User-visible</span><span class="val high">Broken (silent)</span></div>
      <div><span class="lbl">Business</span><span class="val">Wasted spend</span></div>
      <div><span class="lbl">Likelihood</span><span class="val">Common</span></div>
    </div>
    <p class="refs"><span><code>path/to/file.py:123</code></span></p>
    <p class="fix-pointer"><strong>→ Phase 2b.</strong> Concrete fix mechanism here.</p>
  </div>
  ```

  The visible chrome (title, quote, scoring, refs, fix-pointer) is ~80 words. The walkthrough behind `<details>` can be
   300+. Reviewer scans the chrome; opens details only for the cases they want to interrogate.

  ### `.problem.struck`

  For items considered and intentionally dropped. Strikes the title; replaces the body with a `.struck-reason` block
  explaining the absorption. Keeps the audit trail visible without keeping the cognitive load.

  ### `.scenario-row`

  Two-column grid: one-line summary on the left, verdict chip on the right (color-coded: green for "Works," gold for
  "needs X," red for "fails today"). Walkthrough lives in a nested `<details>`. Use for stress-testing the plan against
   real user flows.

  ### `.scoring` chip strip

  Three slots, equal width, separated by border rules. Pattern: `<span class="lbl">label</span><span
  class="val">value</span>`. Add `.val.high` for the red-text variant on critical scoring.

  ### `table.compact`

  Tighter type, single-pixel border, navy thead. Use for at-a-glance summary tables (problems list, phases list,
  matrices). Add `<tr class="struck">` for struck rows; the CSS line-throughs them and lets a `<td colspan>` cell carry
   the absorption reason.

  ### `.grid-2`

  Side-by-side `.card` layout for goals/non-goals, before/after, pattern comparisons. Collapses to one column under
  720px.

  ### `.phase` card

  A boxed deliverable list per phase. Title with a monospace `.phase-num` badge. Inside: short paragraph, then numbered
   deliverables, then acceptance criteria as a bullet list. One card per phase.

  ## Authoring rules

  1. **Lead each section with the most scannable element.** Table beats prose. Card beats paragraph. Callout beats
  sentence. Push prose below the scannable element.
  2. **Pull-quotes are non-negotiable on problem cards.** Write each one in the voice of the affected user — what
  they'd say in Slack when they hit it. Forces specificity.
  3. **No headers without content.** If a section has only a "Coming soon" or a single line, fold it into its neighbor.
  4. **Three axes for scoring, always the same three:** user-visible severity, business impact, likelihood. The
  vocabulary stays fixed (silent / annoying / broken / catastrophic; none / wasted spend / trust erosion /
  revenue-legal; rare / common / certain). Consistency lets reviewers calibrate across cards.
  5. **File:line citations on every problem.** Builds trust that the author actually looked at the code, not the docs.
  6. **The "→ Phase X" fix pointer is mandatory.** Every problem has to map to a fix; if it doesn't, either add it to
  the plan or strike it.
  7. **One concept per callout.** Don't pack multiple decisions into one box.
  8. **Strikethrough beats deletion** for items the team considered and dropped. Keeps the audit trail.

  ## Starter skeleton

  When generating a new doc, scaffold from this and fill in:

  ```html
  <!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{TITLE}}</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;
  700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
    <style>/* brand layer + component CSS here */</style>
  </head>
  <body>
  <div class="wrap">
    <header class="doc">
      <div class="eyebrow">{{KIND}} · {{TEAM}}</div>
      <h1>{{TITLE}}</h1>
      <p style="font-size:18px; color:var(--slate);">{{ONE_LINE_PURPOSE}}</p>
      <div class="meta">
        <div><span>Status</span> {{STATUS}}</div>
        <div><span>Owner</span> {{OWNER}}</div>
        <div><span>Scope</span> {{SCOPE}}</div>
      </div>
    </header>

    <nav class="toc"><ol>...</ol></nav>

    <section id="tldr"><h2>TL;DR</h2><div class="callout navy">...</div></section>

    <section id="quickref">
      <h2>Quick reference</h2>
      <div class="decisions">...</div>
      <div class="quickref">{{problems table}}</div>
      <div class="quickref">{{phases table}}</div>
      <div class="callout warn">{{hard rule}}</div>
    </section>

    <section id="goals"><h2>Goals & non-goals</h2><div class="grid-2">...</div></section>

    <section id="problems">
      <h2>What breaks today</h2>
      <div class="tier-header"><span class="tier tier-0">Tier 0</span><h3>...</h3></div>
      <div class="problem tier-0-border">...</div>
      <!-- repeat per tier -->
    </section>

    <section id="scenarios"><h2>Scenarios</h2>{{scenario-rows}}</section>

    <section id="patterns"><h2>Foundational patterns</h2><div class="grid-2">{{cards}}</div></section>

    <section id="phases"><h2>Phased plan — details</h2>{{phase cards}}</section>

    <section id="schema">...</section>
    <section id="testing">...</section>
    <section id="rollout">...</section>
    <section id="risks">...</section>
    <section id="mapping">...</section>

    <footer class="doc">...</footer>
  </div>
  </body>
  </html>
  ```

  ## Anti-patterns

  - **No emojis in section headers or chrome.** They render inconsistently across platforms and undermine the
  typography.
  - **No prose walls.** Anything over ~80 words goes in a `<details>` or splits into bullets.
  - **No JavaScript.** It breaks email clients, view-source pasting, and PDF export.
  - **Don't number cards by phase or by reading order.** Number by discovery order; tier by severity; map by phase. The
   catalog stays stable as it grows.
  - **Don't reuse a callout style for too many purposes.** Four variants is the max (info, navy, gold, warn). More and
  the eye loses calibration.
  - **Don't put the actionable summary at the bottom.** Reviewers stop reading at every break; the top has to carry
  everything that matters.

  ## Output checklist

  Before declaring done, verify:
  - [ ] Single self-contained `.html` file (no external CSS/JS).
  - [ ] Google Fonts link present.
  - [ ] TOC matches actual section order.
  - [ ] Every problem card has: ID + title + pull-quote + scoring + refs + fix pointer.
  - [ ] At least one collapsible `<details>` block (otherwise you're not using progressive disclosure).
  - [ ] At least one `<table class="compact">` (the at-a-glance view).
  - [ ] One "decisions for reviewers" callout near the top.
  - [ ] Renders correctly on mobile widths (test with DevTools at 375px).
  - [ ] No emojis.

  ---
  A few things worth flagging when you save this:

  1. The CSS block is ~250 lines and worth keeping verbatim the first time you use it. After a couple docs you'll havefavorites —
  bump those into ~/.claude/skills/eng-rfc-doc-style.css and reference from the skill body.
  2. The component vocabulary is the durable bit. Whether you use Playfair or Inter doesn't matter; whether .problem cards always have
   the same shape across every doc your team produces — that's what makes scanning fast over time.
  3. The "process" section at the top is what makes it a skill, not a template. A template just gives you boilerplate;
  700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
    <style>/* brand layer + component CSS here */</style>
  </head>
  <body>
  <div class="wrap">
    <header class="doc">
      <div class="eyebrow">{{KIND}} · {{TEAM}}</div>
      <h1>{{TITLE}}</h1>
      <p style="font-size:18px; color:var(--slate);">{{ONE_LINE_PURPOSE}}</p>
      <div class="meta">
        <div><span>Status</span> {{STATUS}}</div>
        <div><span>Owner</span> {{OWNER}}</div>
        <div><span>Scope</span> {{SCOPE}}</div>
      </div>
    </header>

    <nav class="toc"><ol>...</ol></nav>

    <section id="tldr"><h2>TL;DR</h2><div class="callout navy">...</div></section>

    <section id="quickref">
      <h2>Quick reference</h2>
      <div class="decisions">...</div>
      <div class="quickref">{{problems table}}</div>
      <div class="quickref">{{phases table}}</div>
      <div class="callout warn">{{hard rule}}</div>
    </section>

    <section id="goals"><h2>Goals & non-goals</h2><div class="grid-2">...</div></section>

    <section id="problems">
      <h2>What breaks today</h2>
      <div class="tier-header"><span class="tier tier-0">Tier 0</span><h3>...</h3></div>
      <div class="problem tier-0-border">...</div>
      <!-- repeat per tier -->
    </section>

    <section id="scenarios"><h2>Scenarios</h2>{{scenario-rows}}</section>

    <section id="patterns"><h2>Foundational patterns</h2><div class="grid-2">{{cards}}</div></section>

    <section id="phases"><h2>Phased plan — details</h2>{{phase cards}}</section>

    <section id="schema">...</section>
    <section id="testing">...</section>
    <section id="rollout">...</section>
    <section id="risks">...</section>
    <section id="mapping">...</section>

    <footer class="doc">...</footer>
  </div>
  </body>
  </html>
  ```

  ## Anti-patterns

  - **No emojis in section headers or chrome.** They render inconsistently across platforms and undermine the
  typography.
  - **No prose walls.** Anything over ~80 words goes in a `<details>` or splits into bullets.
  - **No JavaScript.** It breaks email clients, view-source pasting, and PDF export.
  - **Don't number cards by phase or by reading order.** Number by discovery order; tier by severity; map by phase. The
   catalog stays stable as it grows.
  - **Don't reuse a callout style for too many purposes.** Four variants is the max (info, navy, gold, warn). More and
  the eye loses calibration.
  - **Don't put the actionable summary at the bottom.** Reviewers stop reading at every break; the top has to carry
  everything that matters.

  ## Output checklist

  Before declaring done, verify:
  - [ ] Single self-contained `.html` file (no external CSS/JS).
  - [ ] Google Fonts link present.
  - [ ] TOC matches actual section order.
  - [ ] Every problem card has: ID + title + pull-quote + scoring + refs + fix pointer.
  - [ ] At least one collapsible `<details>` block (otherwise you're not using progressive disclosure).
  - [ ] At least one `<table class="compact">` (the at-a-glance view).
  - [ ] One "decisions for reviewers" callout near the top.
  - [ ] Renders correctly on mobile widths (test with DevTools at 375px).
  - [ ] No emojis.

  ---
  A few things worth flagging when you save this:

  1. The CSS block is ~250 lines and worth keeping verbatim the first time you use it. After a couple docs you'll have
  favorites — bump those into ~/.claude/skills/eng-rfc-doc-style.css and reference from the skill body.
  2. The component vocabulary is the durable bit. Whether you use Playfair or Inter doesn't matter; whether .problem
  cards always have the same shape across every doc your team produces — that's what makes scanning fast over time.
  3. The "process" section at the top is what makes it a skill, not a template. A template just gives you boilerplate;
  a skill enforces the disciplines (read CLAUDE.md first, ask audience, structure top-down from decisions). Without
  those, you get pretty-looking docs that still bury the lede.
  4. For postmortems and ADRs, the structure flexes. Postmortem doesn't need "Decisions to ratify" — it has "Action
  items" instead. ADR doesn't need "Phased plan" — it has "Status: Proposed/Accepted/Rejected." The skill should call
  out these variants if your team uses them often; right now it's tuned for plans/RFCs.
