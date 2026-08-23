# Design systems in the agent era: how production is shifting and where the tool gaps are

*Research snapshot, August 2026. Sources are linked inline; maturity labels are my read of the public state, not vendor claims.*

---

## 1. How the workflow is shifting

### 1.1 From "designer in Figma, handoff to dev" to code-first with agents in the loop

The classic loop — designer composes in Figma, dev re-implements, DS team referees — is being compressed from both ends:

- **Agents consume design intent directly.** Figma's MCP server (GA, 14 tools as of Feb 2026; remote + desktop transports) streams component names, variables, layout and Code Connect mappings into Cursor/Claude Code context so the agent writes against *your* components rather than re-deriving from a screenshot ([Figma blog](https://www.figma.com/blog/introducing-figma-mcp-server/), [Code Connect in MCP](https://www.figma.com/blog/the-benefits-of-code-connect-in-mcp/)). Storybook 10.3 ships `@storybook/addon-mcp` with docs/dev/test toolsets and a `/manifests/components.json` index ([Storybook MCP](https://storybook.js.org/docs/ai/mcp/overview), [manifests](https://storybook.js.org/docs/ai/manifests)).
- **Generation tools now accept a DS as input.** v0 reads a shadcn-style registry ("a distribution specification designed to pass context from your design system to AI models") ([Vercel](https://vercel.com/blog/working-with-figma-and-custom-design-systems-in-v0)); Figma Make consumes npm-published DS packages ([Figma Help](https://help.figma.com/hc/en-us/articles/35946832653975-Use-your-design-system-package-in-Make-kits)); Lovable has "design system projects" that push components/rules into connected apps ([Lovable docs](https://docs.lovable.dev/features/design-systems)); Subframe exposes an MCP + agent skills so Claude Code/Cursor generate inside your theme ([Subframe](https://www.subframe.com/)); Google Stitch imports a `DESIGN.md` or extracts one from a URL ([Stitch guide](https://www.nxcode.io/resources/news/google-stitch-complete-guide-vibe-design-2026)).
- **"Mouth coding" on top of the DS.** Brad Frost's framing: DS+AI is distinct from vibe coding because "the AI is deliberately constrained to using the high-quality design system materials" ([Frost, Agentic Design Systems in 2026](https://bradfrost.com/blog/post/agentic-design-systems-in-2026/)). The DS becomes the guardrail set that makes non-engineers' prompts safe to ship.

### 1.2 Tokens as source of truth, and the layer that holds them is moving into CSS

- DTCG reached its first stable spec (2025.10, Oct 28 2025) with theming/multi-brand, OKLCH/P3 color, aliases; Style Dictionary v5 adopted it; Figma, Penpot (via Tokens Studio), Sketch, Framer, Knapsack, Supernova, zeroheight implement or are implementing ([W3C CG announcement](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/), [Style Dictionary DTCG](https://styledictionary.com/info/dtcg/), [Tokens Studio + Penpot](https://tokens.studio/blog/tokens-studio-penpot-bringing-native-open-standard-design-tokens-to-everyone)).
- Tailwind v4's `@theme` makes CSS the token authority: declared once, emitted as both utilities and runtime custom properties ([Tailwind v4 guide](https://tomodahinata.com/en/blog/tailwind-css-v4-css-first-design-tokens-production-guide)). Panda CSS does the same with `@layer tokens` + generated TypeScript types so invalid token values fail at dev time ([Panda cascade layers](https://panda-css.com/docs/concepts/cascade-layers)). Open Props is the "tokens-only, no framework" end of this spectrum.
- The practical consensus: single-platform → `@theme`/CSS vars suffice; DTCG JSON + a build step earns its keep when a second platform (native, email, Figma sync) appears ([Clearly Design](https://clearly.design/articles/ai-ready-ds-4-design-tokens-tailwind-v4)).

### 1.3 Distribution is becoming "registry + skill", not "npm package + docs site"

- shadcn CLI v4 (Mar 2026): `registry:base` ships an entire DS (components, deps, CSS vars, fonts, config) as one install; **presets** compress a DS config into a shareable string; `shadcn/skills` + MCP give agents the registry workflow ([changelog](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4)).
- DS teams are shipping *agent surfaces* as first-class deliverables. Miro's 6-person DS team built an MCP (initially only `list components` + `get component docs`) plus Claude Code skills for icon/token search; Slack support questions dropped 70–80% ([Into Design Systems](https://intodesignsystems.substack.com/p/miro-ai-design-system)). Carbon, Material 3, Optics, Cadence and others have public DS MCPs ([carbon-mcp](https://github.com/carbon-design-system/carbon-mcp), [material3-mcp](https://github.com/weppa-cloud/material3-mcp-server), [optics-mcp](https://github.com/RoleModel/optics-mcp)).
- DS platforms repositioned: Supernova "for AI agents" publishes scoped MCP endpoints; zeroheight MCP ([Supernova](https://www.supernova.io/for-ai), [zeroheight](https://zeroheight.com/mcp/)).

### 1.4 "Design system as context engineering"

The DS is increasingly read as a *prompt* rather than a website:
- `DESIGN.md` (Google Labs, Apache-2.0, open-sourced Apr 21 2026, 27.5k stars, alpha): YAML front-matter tokens + prose rationale in 8 canonical sections; CLI with `lint` (11 rules incl. WCAG contrast, broken refs), `diff`, `export` to Tailwind v3/v4 and DTCG ([repo](https://github.com/google-labs-code/design.md)).
- Anthropic's `frontend-design` skill (~800k installs) builds a compact token system before coding and explicitly steers away from "generic AI" aesthetics ([skill](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design), [blog](https://claude.com/blog/improving-frontend-design-through-skills)).
- Builder.io's field guidance: "your codebase is your prompt" — keep rules minimal, make wrong paths fail mechanically (ESLint `no-restricted-imports`, Stylelint `declaration-strict-value`, reference implementations dir, stricter `.eslintrc.agent.json`) ([Builder.io](https://www.builder.io/blog/how-to-make-ai-agents-follow-your-design-system)).
- Headway's agent-ready checklist: machine-readable tokens, documented component APIs, Figma↔code parity, usage rules in code, and a *context delivery method* ([Headway](https://www.headway.io/blog/design-systems-for-ai-agents)).

---

## 2. Concrete new problems

1. **Agents drift from the DS, fast.** Superdesign names four modes: token fabrication (invents `--color-primary-500`), within-session drift, between-session amnesia, silent breaking changes after a rename ([Superdesign](https://superdesign.dev/blog/ai-design-system-drift)). Builder.io saw agents pick deprecated components because old code was more frequent in the repo.
2. **DS docs aren't machine-consumable.** Miro's agent looped because their docs site rendered links in React, not Markdown. Screenshots "convey pixels, not intent or token values" (Headway). Most DS sites still have no `llms.txt`, no manifest, no stable per-component URL an agent can fetch.
3. **No standard, portable DS manifest.** Competing shapes: Storybook `components.json` (React only, preview), DESIGN.md (tokens + prose, no component API), DSDS ([designsystemdocspec.org](https://designsystemdocspec.org/), v0.15.2 draft, 17 block kinds), OpenDesign packages (`manifest.json` + `DESIGN.md` + `tokens.css`) ([open-design](https://github.com/nexu-io/open-design)), shadcn `registry.json`. Nothing bridges tokens ↔ component props ↔ usage rules in one file.
4. **No verification that generated UI conforms to tokens.** Lint catches raw hex in CSS, but not `style={{padding: 13}}` in JSX, `p-[13px]` arbitrary Tailwind classes (eslint-plugin-tailwindcss's v4 support is partial; [oxlint-tailwindcss](https://sergioazocar.com/en/blog/oxlint-tailwindcss-the-linting-plugin-tailwind-v4-needed/) is new), or values that are *valid tokens used in the wrong role* (a `surface` color used as text). Computed-style checks via Playwright exist as blog patterns ([vadim.blog](https://vadim.blog/pixel-perfect-playwright-figma-mcp/)), not packaged tools.
5. **Context budget vs. completeness.** Full DS docs don't fit; Figma `get_design_context` on a page blows Claude Code's 25k-token MCP cap ([Figma known issues](https://developers.figma.com/docs/figma-mcp-server/mcp-clients-issues/)). drift-guard chose CLI over MCP explicitly to avoid ~$52/mo token overhead. Teams need *retrieval-shaped* DS context, not dumps.
6. **Figma MCP fidelity gaps.** `get_design_context` returns base-component tokens instead of variant-specific ones ([forum](https://forum.figma.com/report-a-problem-6/mcp-get-design-context-returns-base-component-tokens-instead-of-variant-specific-tokens-50790)); Code Connect must be hand-maintained.
7. **Token hygiene is now load-bearing.** Agents amplify orphaned tokens, missing semantic aliases, inconsistent naming, and raw values in Figma. The DTCG spec is stable but validators are fragmented ([w3c-tokens-validator](https://www.npmjs.com/package/@paths.design/w3c-tokens-validator), [Design Token Kit](https://design-token-kit.github.io/), [styleframe/dtcg](https://www.styleframe.dev/docs/getting-started/integrations/dtcg)).
8. **Brownfield extraction.** Most teams have a DS-in-the-wild (existing CSS/site) rather than a DTCG file. Extractors exist ([design-extract](https://github.com/manavarya09/design-extract), [dembrandt](https://github.com/dembrandt/dembrandt), [DesignMD](https://designmd.cc/), Superdesign repo-derivation) but output a *palette inventory*, not a *deduplicated, role-assigned* token set.
9. **Rules files rot.** CLAUDE.md / `.cursor/rules/design-system.mdc` / AGENTS.md duplicate token lists that go stale the moment `@theme` changes ([designmd.app on which file does what](https://designmd.app/blog/design-md-agents-md-rules-md/), [atomize DTCG + AGENTS.md workflow](https://atomize.tools/blog/figma-design-tokens-vibe-coding/)).
10. **Enforcement moved from PR review to CI, but CI tooling assumes humans.** Lint output isn't shaped for an agent's fix loop (no suggested token, no confidence, no auto-fix).

---

## 3. Existing attempts and maturity

| Area | Tool | What it does | Maturity |
|---|---|---|---|
| DS → agent context | [Figma MCP](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/) | design context, variables, Code Connect snippets | GA; write-back beta |
| | [Storybook addon-mcp](https://github.com/storybookjs/mcp) | docs/dev/test tools, components manifest | Preview; React only |
| | [shadcn CLI v4 + skills + MCP](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4) | registry:base, presets, agent skill | Shipping, widely adopted |
| | Per-DS MCPs ([Carbon](https://github.com/carbon-design-system/carbon-mcp), [Material 3](https://github.com/weppa-cloud/material3-mcp-server), [Optics](https://github.com/RoleModel/optics-mcp), [southleft](https://github.com/southleft/design-systems-mcp), [yajihum](https://github.com/yajihum/design-system-mcp)) | list/search components, tokens, icons | Mostly hand-rolled; each bespoke |
| | [Supernova for AI](https://www.supernova.io/for-ai), [zeroheight MCP](https://zeroheight.com/mcp/) | hosted MCP per team | Commercial, enterprise |
| Spec formats | [DESIGN.md](https://github.com/google-labs-code/design.md) | tokens+prose, lint/diff/export | Alpha, huge mindshare |
| | [DSDS](https://designsystemdocspec.org/) | full DS doc schema | Draft 0.15 |
| | [OpenDesign packages](https://github.com/nexu-io/open-design) | 151 brand packages (manifest+DESIGN.md+tokens.css) | Active, 90k stars |
| | DTCG 2025.10 + [Style Dictionary v5](https://styledictionary.com/info/dtcg/) | token interchange | Stable |
| Extraction | [design-extract](https://github.com/manavarya09/design-extract), [dembrandt](https://github.com/dembrandt/dembrandt), [DesignMD](https://designmd.cc/), [html-style-extractor](https://github.com/Mrassimo/html-style-extractor) | crawl site → tokens/DESIGN.md/Tailwind | Early; inventory-level output |
| Drift/verification | [drift-guard](https://github.com/Hwani-Net/drift-guard) | snapshot colors/fonts/spacing/DOM, `check` exits 1 | v0.2, HTML/CSS baseline only |
| | [DesignDiff](https://designdiff.netlify.app/) | MCP: Figma spec vs Playwright computed styles, token-weighted score, patch diffs | v0.1 MIT, Figma-dependent |
| | Stylelint `declaration-strict-value`, ESLint `no-restricted-imports`, [eslint-plugin-tailwindcss](https://github.com/francoismassart/eslint-plugin-tailwindcss) `no-arbitrary-value`, [oxlint-tailwindcss](https://sergioazocar.com/en/blog/oxlint-tailwindcss-the-linting-plugin-tailwind-v4-needed/) | static rules | Mature but piecemeal; TW v4 support uneven |
| Token validation | [w3c-tokens-validator](https://www.npmjs.com/package/@paths.design/w3c-tokens-validator), [Design Token Kit](https://design-token-kit.github.io/), [styleframe/dtcg](https://www.styleframe.dev/docs/getting-started/integrations/dtcg), [upft/schemas](https://www.npmjs.com/package/@upft/schemas) | schema validation | Several small, none canonical |
| Skills/rules | [Anthropic frontend-design](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design), [Subframe skill](https://explainx.ai/skills/subframeapp/subframe/design), shadcn skill, Miro's internal skills | behavior guidance | frontend-design is generic (no DS binding) |
| Generation w/ DS | v0 registries, Figma Make npm kits, Lovable DS projects, Subframe MCP, Stitch DESIGN.md | constrained generation | All shipping; each proprietary ingest path |

**Gap summary:** plenty of *context delivery* (MCPs, DESIGN.md), very little *deterministic verification* and *feedback shaped for agents*; no single small tool that goes `@theme`/DTCG → agent-ready manifest → lint → fix-loop.

---

## 4. Candidate tools (solo-developer scale)

Each is scoped to an MVP a single developer can ship in weeks, with a clear wedge into the existing ecosystem rather than competing with Figma/Vercel.

### 4.1 `tokenlint` — off-system value linter for JSX/TSX/CSS/Tailwind
- **Problem:** Nothing catches raw values across *all* the places agents put them: CSS, inline `style={{}}`, Tailwind arbitrary classes `[13px]`, styled-components, CSS-in-JS objects. Existing rules are per-syntax and TW v4 support is spotty.
- **Who:** DS engineers running agent-generated PRs through CI; anyone using Claude Code/Cursor with a `@theme`.
- **Why now:** Agents produce 10× more surface area; `@theme` makes the allowed-set machine-readable for the first time.
- **Competition:** Stylelint `declaration-strict-value`, eslint-plugin-tailwindcss, oxlint-tailwindcss, drift-guard (baseline diffs, not allowed-set).
- **MVP:** Read `@theme` / DTCG / `:root` vars as the allowed set; scan files for color/length/font literals; emit SARIF + agent-friendly JSON with the *nearest token suggestion* and `--fix`.

### 4.2 `ds-manifest` — one-command agent-ready manifest from a repo
- **Problem:** DS docs are websites; agents need a compact index (components, props, tokens, rules, do/don't) with stable fetchable paths.
- **Who:** DS teams who don't have Storybook-React or a hosted platform; library authors.
- **Why now:** Storybook manifests are React-only preview; DESIGN.md omits component APIs; Miro-style MCPs are all hand-built.
- **Competition:** Storybook manifests, DSDS spec, OpenDesign packages, Supernova.
- **MVP:** Static analysis (react-docgen / Vue / Svelte), tokens from `@theme`/DTCG, optional MDX → emits `ds.manifest.json` + `llms.txt` + a generated `DESIGN.md`; ships a 3-tool generic MCP (`list`, `get`, `search`) over it.

### 4.3 `theme-sync` — keep CLAUDE.md / AGENTS.md / `.cursor/rules` in sync with tokens
- **Problem:** Rules files hand-copy token names and rot.
- **Who:** Every team with both a `@theme` and an agent rules file.
- **Why now:** Rules files are now standard; token renames break agents silently (Superdesign "silent breaking changes").
- **Competition:** drift-guard `rules` (one-shot generate), DESIGN.md `export`.
- **MVP:** Managed block markers (`<!-- ds:tokens -->`) in rules files, regenerated from the token source in a pre-commit/CI step; fails CI if stale.

### 4.4 `token-roles` — semantic-role validator
- **Problem:** Lint says "that's a valid token," but `--color-surface` used as `color:` text is still wrong. Agents fabricate plausible-but-wrong roles.
- **Who:** Teams with semantic token layers (bg/fg/border/accent).
- **Why now:** DTCG 2025.10 has `$type` but not role; agents need the role rules to be checkable.
- **Competition:** none packaged; Panda's type system partially.
- **MVP:** Small role schema (`$extensions.roles: ["text", "bg"]`) + rule: token used in property outside its roles → error with suggestion; works on CSS and Tailwind classes.

### 4.5 `rendered-check` — computed-style conformance without Figma
- **Problem:** Static lint misses cascade outcomes and runtime styles; DesignDiff needs a Figma node.
- **Who:** Teams shipping agent PRs with Storybook/Playwright already.
- **Why now:** Playwright + agent loops are the emerging verification pattern but not packaged.
- **Competition:** DesignDiff (Figma-bound), drift-guard (source-level).
- **MVP:** Playwright script walks a story/page, reads computed `color/font/spacing/radius/shadow`, resolves to nearest token, reports off-system computed values per element; JSON + CLI exit code.

### 4.6 `ds-extract-dedupe` — brownfield token *consolidation*
- **Problem:** Extractors return 40 grays; teams need a 6-step scale with proposed names and a migration map.
- **Who:** Agencies/freelancers onboarding legacy sites; startups formalizing a DS before letting agents loose.
- **Why now:** design-extract/dembrandt popular but stop at inventory; DESIGN.md/Stitch accept the output.
- **Competition:** design-extract, dembrandt, DesignMD, Superdesign.
- **MVP:** Input CSS/URL → cluster colors in OKLCH, snap spacing to modular scale, emit DTCG + `@theme` + a `rewrite map` (`#f3f4f6 → {color.gray.100}`) and codemod.

### 4.7 `dtcg-doctor` — token-file health checks for agent use
- **Problem:** Validators check schema; nobody checks *agent-readiness*: orphaned tokens, missing aliases, unused primitives, contrast, naming inconsistency, description coverage.
- **Who:** DS maintainers; Tokens Studio/Figma exporters.
- **Why now:** DTCG stable; DESIGN.md lint shows appetite for 11 rules, but only for its own format.
- **Competition:** DESIGN.md `lint`, w3c-tokens-validator, Design Token Kit.
- **MVP:** CLI over DTCG 2025.10 with ~15 rules and `$description` coverage score; GitHub Action.

### 4.8 `ds-diff` — semantic token/component diff for PRs
- **Problem:** Token changes in PRs show as JSON noise; nobody sees "primary shifted 3 ΔE, 14 components affected."
- **Who:** DS teams reviewing agent- and human-authored token PRs.
- **Why now:** More token churn from agents + `@theme` in CSS makes diffs unreadable.
- **Competition:** DESIGN.md `diff` (format-bound), Supernova (hosted).
- **MVP:** GitHub Action comment: added/removed/renamed tokens, color deltas, usages impacted (grep), rendered swatch PNGs.

### 4.9 `ds-skill` — generate a DS-bound Claude Code skill / Cursor rule pack
- **Problem:** Anthropic's `frontend-design` is generic; teams want "frontend-design, but with *our* tokens and components" and don't know how to write a skill.
- **Who:** Small teams without a DS engineer; agencies shipping to many clients.
- **Why now:** Skills are the new distribution unit (shadcn/skills, Subframe skill, Miro's rule "ship as skill first, MCP only when system-wide").
- **Competition:** shadcn/skills (shadcn only), manual.
- **MVP:** From `ds.manifest.json`/`@theme` generate `SKILL.md` + examples dir + `.cursor/rules/*.mdc` with progressive-disclosure references; regenerate on change.

### 4.10 `mcp-ds` — zero-config generic design-system MCP
- **Problem:** Every DS team hand-writes the same `list_components`/`get_docs`/`search_tokens` server.
- **Who:** Non-React DS teams (Vue/Svelte/Web Components) excluded by Storybook MCP; internal DS teams.
- **Why now:** Proven pattern (Miro, Carbon, Optics) but no reusable package.
- **Competition:** storybookjs/mcp (React), southleft/design-systems-mcp, hosted platforms.
- **MVP:** `npx mcp-ds ./src` serving tokens + docs + component props with chunked responses under the 25k-token cap; stdio + HTTP.

### 4.11 `variant-context` — Figma MCP post-processor for variant-accurate tokens
- **Problem:** `get_design_context` returns base-component tokens, not variant-specific; agents implement the wrong state.
- **Who:** Teams relying on Figma MCP for implementation.
- **Why now:** Known open issue; Code Connect adoption rising.
- **Competition:** none; Figma may fix it.
- **MVP:** Thin MCP proxy that calls Figma MCP, resolves variant properties via REST, and rewrites token refs; risky (platform dependency) — include as a short-lived wedge.

### 4.12 `a11y-tokens` — contrast/size guard at the token layer
- **Problem:** Agents pair semantic tokens into unseen combinations; WCAG failures appear only at render.
- **Who:** Teams with compliance obligations; DS maintainers.
- **Why now:** DESIGN.md lint added contrast; nothing does it on DTCG/`@theme` pairings or on generated JSX.
- **Competition:** DESIGN.md lint (own format), axe (runtime).
- **MVP:** Declare allowed fg/bg pairs (or compute from roles); CLI checks both token file and code usages, with APCA/WCAG scores.

---

## 5. Recommendation

The highest-leverage wedge for a solo developer is **verification, not context**: 4.1 (`tokenlint`) + 4.5 (`rendered-check`) + 4.3 (`theme-sync`), sharing one "allowed-set from `@theme`/DTCG" core. Context delivery is crowded (Figma, Storybook, shadcn, Supernova, DESIGN.md); deterministic, agent-shaped feedback loops are nearly empty, and every context-delivery vendor's own guidance ends with "then lint and screenshot-check it."
