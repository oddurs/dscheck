# ds0 — Synthesis & candidate angles

Synthesized from four parallel research passes (2026-08-23):

- [01-tooling-landscape.md](01-tooling-landscape.md) — ~60 tools, 8 categories, gaps
- [02-process-and-pain-points.md](02-process-and-pain-points.md) — lifecycle + top-15 practitioner pains
- [03-ai-era-opportunities.md](03-ai-era-opportunities.md) — agent-era shifts, 12 candidate tools
- [04-foundations-craft-problems.md](04-foundations-craft-problems.md) — computable foundation problems, top-10

## The one finding all four passes agree on

**Design-system tooling is full of generators and empty of validators.**

Ramps, shadows, type scales, components, docs — all generate. Almost nothing takes an *existing* system and asserts invariants about it or about the code that claims to use it. Meanwhile the dominant pain is *drift*: three hand-maintained copies of one truth (Figma / tokens-in-code / docs), off-system values creeping in (Shopify: 14% off-mainline after a year with strong tooling), breaking changes classified by gut feel, and now AI agents generating UI that "hallucinates" outside the system.

Secondary agreements:
- The lone-maintainer (avg DS team at small orgs = 2 people, 61% understaffed) needs leverage, not another platform.
- DTCG 2025.10 is finally a viable interchange format → a token file is a legitimate single input for tooling.
- Figma's API is Enterprise-gated and lossy → code/token-side tools have a structural advantage over Figma-side ones.
- Vendor mortality is high (Specify, Backlight, Pattern Lab, Primer Prism dead) → small, OSS, CLI-shaped tools are trusted more than platforms.
- Context delivery to agents (MCP, DESIGN.md, skills) is crowded; *verification* of agent output is an empty quadrant.

## Candidate angles

Ranked by (pain × emptiness × solo-feasibility).

### A. `tokenlint` — the off-system value linter  ★ strongest wedge
Reads the allowed set from DTCG / Tailwind `@theme` / CSS custom props; flags hard-coded colors, spacings, radii, font sizes in CSS, CSS-in-JS, inline styles, Tailwind arbitrary values. Suggests nearest token; `--fix`. Optional role-awareness (surface token used as text color).
- Evidence: 01 gap #2, 02 pains #2/#10, 03 candidates 1+4, 04 #4.
- Competition: stylelint plugins that accept any `var()`; Atlassian/Polaris bespoke rules (Polaris archived).
- Why now: agents write most new UI; this is the guardrail that makes "agent + DS" work.
- MVP: CLI over a glob, JSON + pretty output, exit code for CI. One week.

### B. `ds-diff` — semantic token diff / changelog / breaking-change classifier
Two DTCG files (or two git refs) → renames detected, aliases resolved, ΔE for colors, blast radius by scanning usages, human changelog, codemod for renames. Runs as PR bot.
- Evidence: 04 #1 (Spectrum published the spec, no general CLI), 02 pain #7, 01 gap #9.
- Competition: none general; everyone `git diff`s JSON.
- Pairs naturally with A (same token parser + usage scanner).

### C. `rendered-check` — runtime drift audit
Playwright walks Storybook stories / real pages, resolves computed styles back to nearest token, reports off-system *rendered* values. Catches what static lint can't (cascade, third-party, agent-generated inline styles).
- Evidence: 03 candidate 5, 02 pain #2 (Shopify's manual weekly audit).
- Heavier than A; better as A's second phase than a first product.

### D. `contrast-matrix` — role-aware contrast CI
All fg×bg token pairs per mode, WCAG 2 + APCA, alpha compositing, baseline + regression. Output: matrix, failures, diff against last run.
- Evidence: 04 #2, 03 candidate 12.
- Competition: raw-hex single-mode grids (Accessible Palette, Leonardo); nothing CI-shaped on a DTCG file.
- Small, clear, demoable. Could be a module of A.

### E. `theme-derive` — derive dark / high-contrast from a finished light set
Role + ramp-step inversion over semantic aliases, validate with D, emit reviewable diff via B.
- Evidence: 04 #5. Generators make new palettes; none derive *your* dark mode.
- Craft-heavy, higher judgment risk; strong demo value.

### F. `ds-extract` — brownfield CSS → clustered token proposal + codemod
Project Wallace does inventory; nothing does perceptual clustering → named scale → mapping to an existing token set → codemod with confidence → coverage metric.
- Evidence: 04 #3, 03 candidate 6, 02 lone-maintainer pain.
- Biggest scope of the list; a good "phase 2" on top of A's parser.

### G. `ds-manifest` / `theme-sync` — agent context from the token source
Generate `DESIGN.md` / `llms.txt` / CLAUDE.md managed blocks from tokens+components; CI fails if stale.
- Evidence: 03 candidates 2/3/9, 01 gap #8.
- Crowded (Figma MCP, Storybook MCP, frontend-design skills) — valuable as a *companion* to A, weak as a standalone.

## Recommended shape

**A family with one core.** One parser/resolver for "the allowed set" (DTCG + Tailwind @theme + CSS custom props) and one usage scanner, with thin commands on top:

```
ds lint        (A)   off-system values, role misuse
ds diff        (B)   semantic token diff, changelog, codemods
ds contrast    (D)   role-aware contrast matrix in CI
ds audit       (C)   rendered/runtime drift via Playwright
ds derive      (E)   dark/high-contrast derivation
ds extract     (F)   brownfield → tokens
ds context     (G)   DESIGN.md / skill / MCP from the same model
```

Start with **A**, ship it standalone, then B and D because they reuse 80% of A. That's a coherent "design-system verification toolkit" — the empty quadrant.

## Open questions for you

1. Target stack first: Tailwind v4 `@theme` (largest agent-generated codebase), DTCG JSON (most correct), or CSS custom props (most universal)?
2. Is the audience "me + agents" (dogfood on your own projects) or lone DS maintainers at small orgs? Changes UX: CLI-only vs PR bot vs dashboard.
3. Do you want Figma in scope at all in v1? Research says no (Enterprise API gate, lossy) — plugin-export JSON as input only.
4. Is a *craft* tool (E, dark-mode derivation) more interesting to you than a *hygiene* tool (A)? Hygiene is the bigger gap; craft is the better demo.
