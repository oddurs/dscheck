# Design-system tooling landscape (2025–2026)

Survey date: August 2026. Scope: tools used to build, ship, govern, and maintain design systems. Each entry: what it does, who uses it, price/license, and a user-reported weakness with a source. Prices are list prices at time of fetch. A "Gaps observed" section closes the document.

**Context numbers that frame everything below** (zeroheight Design Systems Report 2026, n=147; [report.zeroheight.com](https://report.zeroheight.com/)):

- Adoption is the #1 challenge for the fifth year running; buy-in satisfaction fell from 42% to 32%; 61% of teams are understaffed.
- 86% have design tokens but only **40% have an automated token pipeline**; only 22% use aliased (semantic) token architecture.
- Only **37% have any automation** (down 8% YoY); 31% satisfaction among those who do.
- Most-measured metric is adoption (41%); ROI is measured by 5%. Only 19% use a DS platform for measurement.
- 56% are experimenting with AI (code gen 71%, docs gen 60%); docs-as-MCP/chatbot adoption is 12% despite 57% interest; 61% worry AI replaces human design judgment.
- Tooling both fragments and consolidates: Figma + Storybook are the dominant pair ([2025 report](https://zeroheight.com/how-we-document/)); 68% document in multiple places.

---

## 1. Design tokens

### Style Dictionary (v4/v5)
- **What:** OSS Node build system: token JSON (legacy or DTCG) → CSS/SCSS/JS/iOS/Android/Compose/Flutter via transforms and formats. Maintained under Tokens Studio (Joren Broekema). v4 (Jun 2024) went ESM/async/DTCG-first; **v5 (May 2025)**, latest 5.5.x (Aug 2026). [styledictionary.com/info/dtcg](https://styledictionary.com/info/dtcg/)
- **Who:** The de-facto standard; zeroheight's token automation moved to SD v5 ([zeroheight](https://help.zeroheight.com/hc/en-us/articles/48049028236187-Migrating-to-Style-Dictionary-v5-in-tokens-automation)); Tokens Studio `sd-transforms` targets it.
- **Price:** Free, Apache-2.0.
- **Weakness:** DTCG 2025.10 support is still partial (gradients, duration, **Resolver module in progress**; tracking issue [#1590](https://github.com/style-dictionary/style-dictionary/issues/1590) open since Nov 2025; docs admit "does not have full support yet"). Composite tokens are painful: maintainer called composite-transform issues "untenable" ([#848](https://github.com/style-dictionary/style-dictionary/issues/848)); `$dimension` objects splitting into multiple vars ([#1398](https://github.com/style-dictionary/style-dictionary/issues/1398)); typography shorthand warns on spec-valid `letterSpacing` ([#1494](https://github.com/style-dictionary/style-dictionary/issues/1494)). Three breaking majors in ~2 years forced every downstream to re-migrate.

### Tokens Studio (Figma plugin + Studio platform)
- **What:** Figma plugin (ex-"Figma Tokens") for authoring tokens/themes and syncing to Git or Figma Variables; plus **Studio**, a standalone graph-based platform with branching, releases, and an MCP ("Portal and Relay"). Plugin OSS ([github](https://github.com/tokens-studio/figma-plugin), MIT).
- **Who:** Most common plugin for token-driven Figma teams; co-built Penpot tokens; employs the Style Dictionary maintainer.
- **Price:** Free plugin; Plus €49/user/mo monthly or Starter Plus €17/mo annual; Studio Essential €169/mo, Organization €499/mo (5 editors), Enterprise custom; no free Studio tier. [pricing](https://tokens.studio/pricing)
- **Weakness:** Performance on complex instances: 4+ min updates vs <5 s detached, no maintainer response since Oct 2025 ([#3641](https://github.com/tokens-studio/figma-plugin/issues/3641)); laggy files / tokens not applied ([#586](https://github.com/tokens-studio/figma-plugin/issues/586)); random color changes and style unlinking ([Figma forum](https://forum.figma.com/ask-the-community-7/bugs-within-the-tokens-studio-plugin-34241)). Variables sync is lossy because Figma has only 4 variable types, so `5px` round-trips as a string ([forum](https://forum.figma.com/t/import-figma-variables-in-tokens-studio/85584)). Its own JSON (`$themes`, `$metadata`) is not strict DTCG.

### Terrazzo (formerly Cobalt)
- **What:** OSS CLI + strict DTCG parser with plugins for CSS, Sass, JS, Tailwind, Swift, vanilla-extract; strong wide-gamut color support. Renamed from Cobalt Feb 2024 ([#201](https://github.com/terrazzoapp/terrazzo/issues/201)); v2 stable in 2025, 2.7.x Aug 2026.
- **Who:** Smaller mindshare than SD; essentially one maintainer (Drew Powers); a DTCG reference implementation.
- **Price:** Free, MIT.
- **Weakness:** Steady 2026 output-correctness bugs: inconsistent `variableName` ([#827](https://github.com/terrazzoapp/terrazzo/issues/827)), invalid `initial-value: var()` for aliased composites ([#820](https://github.com/terrazzoapp/terrazzo/issues/820)), Tailwind plugin emitting `[object Object]` for typography ([#811](https://github.com/terrazzoapp/terrazzo/issues/811)), group `$type` leaking into sibling groups ([#800](https://github.com/terrazzoapp/terrazzo/issues/800)). Strict validation means Tokens Studio/Figma exports usually need cleanup first.

### Cobalt (legacy)
- `@cobalt-ui/cli` last published 1.12.0 (Nov 2024) and is marked deprecated on npm ("upgrade to @terrazzo/cli"). Still listed as a tool in the [DTCG tools discussion](https://github.com/design-tokens/community-group/discussions/312) — stale. Don't adopt.

### Penpot native design tokens
- **What:** First design tool with built-in DTCG-style tokens (sets, themes, aliases, math), launched ~Apr 2025 with Tokens Studio ([Tokens Studio blog](https://tokens.studio/blog/tokens-studio-penpot-bringing-native-open-standard-design-tokens-to-everyone), [Smashing](https://www.smashingmagazine.com/2025/05/integrating-design-code-native-design-tokens-penpot/)). Typography composites Nov 2025, shadows Dec 2025; Git sync and token API still "planned" ([roadmap thread](https://community.penpot.app/t/what-s-next-for-penpot-design-tokens/8789)).
- **Who:** OSS/self-host teams, public sector, Figma-cost refugees.
- **Price:** Free SaaS + self-host; MPL-2.0.
- **Weakness:** Export is **Tokens Studio format, not DTCG 2025.10**, despite docs claiming compliance; "any tool targeting strict DTCG 2025.10 will fail or silently drop values," acknowledged by staff May 2026 ([community](https://community.penpot.app/t/token-export-is-tokens-studio-format-not-dtcg-2025-10/10544)). Color import only accepts hex strings ([penpot#9305](https://github.com/penpot/penpot/issues/9305)). Early review: "promising but incomplete," proprietary `$themes` = lock-in risk ([Always Twisted](https://www.alwaystwisted.com/articles/design-tokens-in-penpot)).

### W3C DTCG spec
- **Status:** First stable release **"2025.10" on 2025-10-28** after ~5 years of drafts ([announcement](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/); [Format module](https://www.designtokens.org/tr/drafts/format/); [Resolver module](https://www.designtokens.org/tr/drafts/resolver/)). Community Group, not Recommendation track. Editors from Adobe, Figma, Google, Microsoft, Tokens Studio, Penpot, Knapsack, Supernova, zeroheight.
- **Weakness:** Stable ≠ implemented. Colors moved from hex strings to `{colorSpace, components, hex?}` objects, which most tools don't fully handle. The Resolver module (the part that does modes/themes) still says "preview draft, should not be implemented." "DTCG support" claims span three incompatible dialects (2nd editor's draft, Tokens Studio, 2025.10) ([discussion #312](https://github.com/design-tokens/community-group/discussions/312)). Critique of ecosystem over-complexity: [andretorgal.com](https://andretorgal.com/posts/2025-01/the-problem-with-design-tokens).

### token-transformer → sd-transforms
- token-transformer is dead (last release May 2023, "no longer supported" on npm). Successor `@tokens-studio/sd-transforms` v2 (MIT) still has reference-resolution failures ([#288](https://github.com/tokens-studio/sd-transforms/issues/288)) and needs hand-written SD configs for themes ([#186](https://github.com/tokens-studio/sd-transforms/issues/186)).

### Specify — shut down
- SaaS token engine (Figma → SDTF → code). **Closed 2024-11-15**; founder cited Figma absorbing features and no product-market fit ([The End of Specify](https://specifyapp.com/blog/the-end-of-specify)). Cautionary tale for venture-backed token middleware.

### Knapsack tokens
- **What:** Token editor, Figma ingest, CI/npm publishing inside the Knapsack enterprise platform ([POV](https://www.knapsack.cloud/blog/knapsack-pov-on-tokens)). Listed DTCG implementer.
- **Price:** Sales-led only, reported $25k–$500k+/yr, no free trial ([cssauthor](https://cssauthor.com/design-token-management-tools/), [pricing](https://www.knapsack.cloud/pricing)).
- **Weakness:** G2 (4.3/5, 11 reviews): high price, slowness, overwhelming UI ([G2](https://www.g2.com/products/knapsack/reviews?qs=pros-and-cons)). Tokens are a feature of a much larger platform.

### Figma Variables REST API + native DTCG import/export
- **What:** `GET/POST /v1/files/:key/variables`; Schema 2025 (Nov 2025) added native DTCG JSON import/export in the UI ([Figma help](https://help.figma.com/hc/en-us/articles/18490793776023-Update-1-Tokens-variables-and-styles), [misha.wtf](https://www.misha.wtf/blog/figma-dtcg-design-tokens)).
- **Price:** **REST API is Enterprise-only** (~$90/editor/mo).
- **Weakness:** Enterprise gating thread open since Aug 2023 with no Figma response ([forum](https://forum.figma.com/suggest-a-feature-11/why-s-the-variables-api-only-available-on-enterprise-plans-36426)). Native export doesn't support composites (typography, gradients, shadows) and export naming doesn't mirror import ([forum 2026](https://forum.figma.com/suggest-a-feature-11/dtcg-composite-token-export-support-51314)). Variables model only color/number/string/boolean.

### Token gaps
1. Multi-brand/theming has no shipped standard: Resolver module is "do not implement," SD and Terrazzo both in-progress, Tokens Studio uses proprietary `$themes`, Figma uses modes (plan-capped). Everyone hand-rolls set stacking.
2. Figma Variables ↔ DTCG round-trip is lossy (4 types vs ~10, no composites, units become strings, API Enterprise-only).
3. Three incompatible "DTCG" dialects in the wild; Penpot exports one while claiming another.
4. Composite tokens are the weak point in every tool.
5. Middleware mortality: Specify, Backlight, Cobalt, token-transformer all gone/deprecated within two years.
6. No bidirectional sync or conflict resolution — every pipeline is push-only from design to code.

---

## 2. Component docs / workshops

Three products in this space died in ~2 years: Specify (Nov 2024), Backlight (Jun 2025), Pattern Lab (archived May 2026).

### Storybook
- **What:** The de-facto component workshop: isolated stories, autodocs/MDX, interaction/a11y/visual testing, addons; multi-framework. v9 (2025) halved install size ([blog](https://storybook.js.org/blog/storybook-bloat-fixed/)); **v10 (Oct 2025) is ESM-only**, Node 20.16+ ([release notes](https://storybook.js.org/releases/10.0), [migration guide](https://storybook.js.org/docs/releases/migration-guide)); 10.5.x Aug 2026. Now ships an MCP addon (see §8).
- **Who:** Essentially every DS with a code side (Polaris, Primer, Spectrum, Pajamas); 61% of DS teams use it for docs ([report](https://report.zeroheight.com/)).
- **Price:** MIT, free; Chromatic is the paid layer.
- **Weakness:** Performance remains the top complaint: story loading 5–10x slower in SB10 vs SB6 from the mocking plugin ([#33778](https://github.com/storybookjs/storybook/issues/33778), Feb 2026); >1 min preview builds ([#33608](https://github.com/storybookjs/storybook/discussions/33608)); a11y addon slowing docs ([#30975](https://github.com/storybookjs/storybook/issues/30975)). Complexity: "Ask HN: Is it time for a new Storybook?" — "tries to do too much," "once it is finally set up I don't touch it" ([HN](https://news.ycombinator.com/item?id=33675261)). Two breaking majors in 2025 ([#30672](https://github.com/storybookjs/storybook/issues/30672)); ~1,570 open issues. Cold start ~8 s vs Ladle ~1.2 s ([comparison](https://dev.to/themachinepulse/storybook-10-why-i-chose-it-over-ladle-and-histoire-for-component-documentation-2omn)).

### Ladle
- **What:** Vite-based, React-only Storybook alternative reading CSF stories; near-zero config, very fast ([github](https://github.com/tajo/ladle)).
- **Who:** Uber (origin); teams wanting a fast React playground; Lost Pixel promotes it.
- **Price:** MIT. 5.1.1 (Nov 2025); effectively one maintainer.
- **Weakness:** React-only; no autodocs/prop tables ([#79](https://github.com/tajo/ladle/issues/79)); MDX was a long-running ask ([#58](https://github.com/tajo/ladle/issues/58)); tiny addon ecosystem.

### Histoire
- **What:** Vite workshop for Vue 3 / Svelte / Nuxt by Akryum; `.story.vue` SFCs ([github](https://github.com/histoire-dev/histoire)). MIT.
- **Who:** Vue/Nuxt libraries.
- **Weakness:** Still not 1.0 after four years (1.0.0-beta.1 Jan 2026; ~190 open issues). Bus factor: "developed by 1 person… a 1 person shiny toy project" ([discussion #414](https://github.com/histoire-dev/histoire/discussions/414)). Ecosystem churn breaks it: Vite 7 ([#805](https://github.com/histoire-dev/histoire/issues/805)), Vue ≥3.5.26 ([#821](https://github.com/histoire-dev/histoire/issues/821)).

### Zeroheight
- **What:** SaaS DS documentation builder; Figma component/style sync, Storybook embeds, token sets, analytics, AI assistant, MCP ([zeroheight.com](https://zeroheight.com/)).
- **Who:** Large enterprise DS teams; 32% of surveyed teams.
- **Price:** Per-editor seats, unlimited viewers. Free 1 editor; **Starter $49/editor/mo** (max 5 editors); Enterprise custom ([pricing](https://zeroheight.com/pricing/)). Pricing has changed repeatedly ([uxblueprints](https://www.uxblueprints.com/tools/zeroheight-review)).
- **Weakness:** G2 recurring dislikes: slow/unreliable large Figma syncs, no page-level publishing control, clunky editor without robust undo; manual content review "becoming our team's bottleneck" ([G2](https://www.g2.com/products/zeroheight/reviews?qs=pros-and-cons)). Code docs remain a Storybook embed — two systems by its own guide ([ZH guide](https://zeroheight.com/help/guides/should-you-document-your-design-system-in-storybook/)).

### Supernova
- **What:** "Agentic design system platform": Figma token/component sync, docs, Style-Dictionary-style code pipelines, hosted MCP ([supernova.io](https://www.supernova.io/), [2025 review](https://www.supernova.io/2025)).
- **Who:** Mid/large product orgs wanting tokens→code plus docs.
- **Price:** Free (≤5 seats, 1 pipeline); **Pro $35/full seat/mo** (≤15 seats); Enterprise custom; AI credits metered ([pricing](https://www.supernova.io/pricing)).
- **Weakness:** Capterra/SoftwareAdvice: "early stage product, so a lot of features are missing or are not delightful yet"; must publish to preview; no component inspect; tokens "don't appear the same as in Figma"; SSO login problems "caused a loss of confidence"; "sometimes crashes and runs slowly" ([Capterra](https://www.capterra.com/p/266448/Supernova/), [SoftwareAdvice](https://www.softwareadvice.com/app-development/supernova-profile/)). Pro's 15-seat cap pushes real adoption to sales-led Enterprise.

### Knapsack
- **What:** Enterprise platform: docs + live rendering of real components (multi-framework), tokens, Figma integration, CI hooks, OSS MCP server. Raised **$10M Oct 2025** ([TechCrunch](https://techcrunch.com/2025/10/09/knapsack-picks-up-10m-to-help-bridge-the-gap-between-design-and-engineering-teams/)).
- **Price:** Sales-led; Basic (min 5 users, 50 viewers) / Core (min 10, 200 viewers, SSO) / Pro (min 20, unlimited viewers); no free trial ([pricing](https://www.knapsack.cloud/pricing)).
- **Weakness:** "Pricing too high," "slow performance," limited integrations, no trial ([G2](https://www.g2.com/products/knapsack/reviews?qs=pros-and-cons), [Capterra](https://www.capterra.com/p/241708/Knapsack/reviews/)). Viewer caps mean you pay for consumers to *read* docs.

### Backlight (divRIOTS) — shut down
- Browser IDE for building/documenting/publishing DS code. **Shut down June 1, 2025** to focus on Figma plugins ([product update](https://divriots.com/blog/ide-product-update)). A well-regarded code-side DS tool couldn't sustain itself.

### Pattern Lab — archived
- Atomic-design pattern library generator. Org **archived May 13, 2026**: "no longer actively maintained" ([repo](https://github.com/pattern-lab/patternlab-node)). Spiritual successor is Knapsack (commercial).

### Docusaurus-based DS docs (DIY)
- **What:** MIT static-site generator used as the public DS site with Storybook iframed ([storybook-addon-docusaurus](https://storybook.js.org/addons/storybook-addon-docusaurus)); "Stop paying for design system documentation you can build yourself" ([Medium](https://medium.com/all-about-design-systems/stop-paying-for-design-system-documentation-you-can-build-yourself-a10f1390987f)).
- **Weakness:** Official Storybook integration answer is "embed an iframe" ([#7713](https://github.com/facebook/docusaurus/discussions/7713)): two pipelines, no shared prop tables or tokens, zero Figma awareness; drift prevention is pure process ([techinterview](https://www.techinterview.org/post/3233475411/frontend-component-documentation-storybook-2026/)).

### Frontify
- **What:** Brand management / DAM platform with a DS/developer module ([frontify.com](https://www.frontify.com/)). Enterprise, contact-sales.
- **Weakness:** Built for marketing, "limited developer-focused features" ([zeroheight vs Frontify](https://zeroheight.com/vs/frontify/), vendor-biased but echoed); lag with large files, tier-gated features ([Research.com](https://research.com/software/reviews/frontify), [GetApp](https://www.getapp.com/marketing-software/a/frontify/reviews/)).

### Docs gaps
1. Docs drift from code is solved by process, not tooling (autodocs covers props; usage guidance rots).
2. Every SaaS platform is Figma-first and treats code as an iframe; nothing reconciles "what Figma says" with "what the package exports."
3. Seat-based pricing taxes contribution; small teams are explicitly underserved by all three platforms.
4. Vendor mortality: three products dead in two years; Ladle and Histoire are single-maintainer.
5. Storybook is the only serious multi-framework OSS workshop, and it is heavy and churns.

---

## 3. Design-to-code bridges

### Figma Code Connect
- **What:** Maps Figma components/props to real code snippets (React, HTML/Vue/Angular, SwiftUI, Compose) via `.figma.tsx` files + CLI or a GitHub-connected UI; feeds Dev Mode and the MCP server ([help](https://help.figma.com/hc/en-us/articles/23920389749655-Code-Connect)). CLI is MIT ([github](https://github.com/figma/code-connect)).
- **Who:** DS teams on Org/Enterprise.
- **Price:** Gated to **Organization/Enterprise with a Full or Dev seat** (Org Dev $25, Ent Dev $35, Org Full $55, Ent Full $90/mo). Not on Professional ([pricing](https://www.figma.com/pricing/)).
- **Weakness:** **Silent breakage** — CLI validation passes but Dev Mode shows "Failed to load Code Connect example" after designers change props; discovered only by manual checking ([#291](https://github.com/figma/code-connect/issues/291), open since Jul 2025, no response). Prop-mapping limits: conditional mappings ([#40](https://github.com/figma/code-connect/issues/40), [#280](https://github.com/figma/code-connect/issues/280)), children composition ([#224](https://github.com/figma/code-connect/issues/224)); HTML/Vue parser rejects ternaries, monorepo glob discovery fails ([#311](https://github.com/figma/code-connect/issues/311)); private GitHub Enterprise unsupported ([#259](https://github.com/figma/code-connect/issues/259)); infinite loading connecting repos ([forum](https://forum.figma.com/report-a-problem-6/figma-code-connect-infinite-loading-for-github-repository-47814)).

### Figma Dev Mode
- **What:** Inspect/handoff: measurements, CSS/iOS/Android, variables, Code Connect snippets, VS Code extension.
- **Price:** Since Mar 2025: Dev seat $12 (Pro) / $25 (Org) / $35 (Ent) per month; Full seats rose up to 33% ([billing update](https://www.figma.com/blog/billing-experience-update-2025/), [pricing](https://www.figma.com/pricing/)).
- **Weakness:** Cost for dev-heavy orgs: a 10-designer/20-dev shop computed ~$9k/yr extra, 59-reply thread with no Figma reply ([forum](https://forum.figma.com/t/dev-mode-licensing-needs-a-review/62009)); "4x as many developers as designers who OCCASIONALLY need to inspect… even more expensive than a dev's IDE" ([forum](https://forum.figma.com/share-your-feedback-26/new-dev-mode-seat-pricing-is-unacceptable-what-do-we-do-now-8322), [forum](https://forum.figma.com/ask-the-community-7/dev-mode-dev-seat-licensing-cost-it-s-maddening-36449)).

### Figma Dev Mode MCP server (official)
- **What:** Local and remote MCP exposing `get_design_context`/`get_code`, `get_metadata`, `get_image`, `get_variable_defs`, `get_code_connect_map`, `create_new_file` ([blog](https://www.figma.com/blog/introducing-figma-mcp-server/), [guide](https://github.com/figma/mcp-server-guide)).
- **Price:** Seat-gated quotas: Starter 20 calls/month; View/Collab seats **6 calls/month**; Dev/Full 200/day (Pro/Org) or 600/day (Ent) ([rate limits](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/)).
- **Weakness:** **Context blowups** — `get_design_context` responses of 170k–351k tokens vs Claude Code's 25k MCP cap; Figma's fix is "call `get_metadata` first" ([Figma docs](https://developers.figma.com/docs/figma-mcp-server/mcp-clients-issues), [forum](https://forum.figma.com/report-a-problem-6/dev-mode-mcp-server-not-accessible-professional-plan-56934)). Quotas hit quickly ([forum](https://forum.figma.com/report-a-problem-6/limit-of-requests-to-figma-via-mcp-52327)). Variables reachable via MCP but not inside Figma's own Make — "an own goal" ([forum](https://forum.figma.com/share-your-feedback-26/figma-mcp-enables-get-variables-but-make-can-t-access-them-without-manual-export-copy-and-paste-this-is-binkers-50008)). Conditional logic/states flattened to one frame. Plan/access breakage ([forum](https://forum.figma.com/report-a-problem-6/claude-mcp-stopped-working-on-pro-plan-54024)).

### Framelink / GLips Figma-Context-MCP (unofficial)
- **What:** OSS MCP flattening Figma REST data into compact layout JSON ([github](https://github.com/GLips/Figma-Context-MCP)). MIT, uses your PAT.
- **Weakness:** RCE **CVE-2025-53967** (CVSS 7.5), fixed in 0.6.3 ([Hacker News](https://thehackernews.com/2025/10/severe-figma-mcp-vulnerability-lets.html)); 429 rate limits ([#258](https://github.com/GLips/Figma-Context-MCP/issues/258)); indirect prompt injection via design text ([#303](https://github.com/GLips/Figma-Context-MCP/issues/303)).

### Anima
- **What:** Figma plugin + web playground converting designs to React/Vue/HTML (Tailwind, MUI) with vibe-coding on top ([animaapp.com](https://www.animaapp.com/)).
- **Who:** Designers, freelancers, agencies; rare in DS engineering.
- **Price:** Free (5 generations); Pro ~$24–31/mo; Enterprise from $500/mo ([pricing](https://www.animaapp.com/pricing)).
- **Weakness:** Absolute positioning even with auto layout — users tick Flexbox and still get absolute coords ([Anima forum](https://forum.animaapp.com/t/auto-layout-from-figma-still-shows-absolute-positioning/229), [Figma forum](https://forum.figma.com/ask-the-community-7/absolute-position-from-figma-plugin-27817)); no DS component mapping comparable to Builder/Code Connect ([comparison](https://www.pixelperfecthtml.com/figma-to-code-plugins-anima-vs-locofy-vs-hand-coding/)).

### Locofy
- **What:** Figma plugin that tags elements, auto-detects layout, exports React/Next/Vue/Tailwind/RN/Flutter.
- **Price:** Token-metered: PAYG ~$0.40/token; Starter ~$33/mo; Pro ~$100/mo ([tekpon](https://tekpon.com/software/locofy/reviews/)).
- **Weakness:** "Inconsistent code quality, non-semantic output, slow processing on larger frame sets"; files must be semantically tagged first; opaque token pricing ([tekpon](https://tekpon.com/software/locofy/reviews/), [Product Hunt](https://www.producthunt.com/products/locofy-ai/reviews), [Gartner](https://www.gartner.com/reviews/product/locofy)).

### Builder.io Visual Copilot / Fusion
- **What:** Figma plugin (fine-tuned model + Mitosis) exporting React/Vue/Svelte/Angular/Qwik with **component mapping to your existing code**; Fusion ingests repo + Figma so PMs/designers generate PRs ([blog](https://www.builder.io/blog/best-figma-to-code-plugin)).
- **Price:** Free (60 credits/mo); Pro $24/user; Team $40/user; **"design system intelligence" Enterprise-only** ([pricing](https://www.builder.io/pricing)). Mitosis MIT.
- **Weakness:** "Gets roughly 75% of the way; quality depends heavily on Figma file organization" ([sixtythirtyten](https://www.sixtythirtyten.co/blog/from-figma-to-code-ai-design-to-dev-workflows-in-2026)); credit billing bugs ([forum](https://forum.builder.io/t/paid-invoice-for-additional-ai-credits-only-base-credits-applied/16445)); data-residency question not answered directly ([forum](https://forum.builder.io/t/importing-from-figma-with-visual-copilot/4923)). Code→Figma walkthrough needs "at least five context switches" ([Builder blog](https://www.builder.io/blog/claude-code-to-figma)).

### Design-to-code gaps
1. **No drift detection**: nothing alerts when a Figma change breaks a Code Connect mapping or when code diverges from design.
2. Tokens are the weak link: MCP exposes variables, downstream tools emit raw px values.
3. Paywall stacking: Code Connect needs Org/Ent; MCP needs Dev/Full seats; Builder DS intelligence is Enterprise. Small teams get the worst version of every bridge.
4. Conditional/compositional props are unsupported or buggy everywhere; AI converters flatten states.
5. Output quality is gated on Figma hygiene, yet no vendor ships a pre-flight linter for it.
6. "Structural component parity — keeping Figma variants, states, and properties in sync with coded component APIs — does not have a reliable automated solution in 2026" ([Atomize](https://atomize.tools/blog/figma-design-system-parity-code-sync)); the emerging "design system contracts" argument says the component should live in neither Figma nor code ([UX Collective](https://uxdesign.cc/design-system-contracts-the-component-lives-in-neither-figma-nor-code-3032d94ca067)).

---

## 4. Linting / consistency

### stylelint-declaration-strict-value
- **What:** Forces listed properties to use a variable/function/keyword instead of raw values; autofix can map values to tokens ([github](https://github.com/AndyOGo/stylelint-declaration-strict-value)). MIT; the de facto OSS answer.
- **Weakness:** CSS-in-JS interpolation is a **wontfix** ([#134](https://github.com/AndyOGo/stylelint-declaration-strict-value/issues/134)); it accepts *any* `var()`, not just approved tokens. DIY rules that suggest the nearest token ([michaelmang.dev](https://www.michaelmang.dev/blog/linting-design-tokens-with-stylelint/)) and Mozilla's in-house `no-base-design-tokens` ([firefox docs](https://firefox-source-docs.mozilla.org/code-quality/lint/linters/stylelint-plugin-mozilla/rules/no-base-design-tokens.html)) show what's missing.

### @atlaskit/eslint-plugin-design-system (Atlassian)
- **What:** 40+ rules: `ensure-design-token-usage`, `no-deprecated-design-token-usage` (autofix), `use-tokens-typography`, `use-primitives`, a11y rules; companion Stylelint plugin ([atlassian.design](https://atlassian.design/components/eslint-plugin-design-system), [npm](https://www.npmjs.com/package/@atlaskit/eslint-plugin-design-system)). Free.
- **Weakness:** Hard-coupled to `@atlaskit/tokens`/Compiled — a reference implementation, not a reusable engine ([community](https://community.developer.atlassian.com/t/atlaskit-eslint-plugin-configuration-issues-in-react-16-8-0/62798)).

### @metamask/eslint-plugin-design-tokens
- Three rules (`color-no-hex`, Tailwind classname rules), 3 stars, hard-wired to MetaMask ([github](https://github.com/MetaMask/eslint-plugin-design-tokens)). Shows the generic "eslint-plugin-design-tokens" niche is empty: each org writes its own.

### ESLint `no-restricted-imports` / `no-restricted-syntax`
- Core rules used to ban raw MUI/Chakra imports in favour of DS wrappers ([eslint](https://eslint.org/docs/latest/rules/no-restricted-imports), [timdeschryver](https://timdeschryver.dev/bits/enforce-module-boundaries-with-no-restricted-imports)). Free; near-universal.
- **Weakness:** Exclusion patterns don't work as expected ([#17860](https://github.com/eslint/eslint/issues/17860)); per-directory allow-lists awkward ([#17047](https://github.com/eslint/eslint/discussions/17047)); path-only, no value awareness.

### Shopify `@shopify/stylelint-polaris`
- 40+ rules pushing Polaris tokens, with a bulk `stylelint-disable` insertion migration ([docs](https://polaris-react.shopify.com/tools/stylelint-polaris)). MIT.
- **Weakness:** **Effectively EOL** — Polaris React superseded by Web Components Oct 2025 and the monorepo **archived Aug 11, 2026** ([repo](https://github.com/Shopify/polaris)); request for rules on the new components got a hesitant answer ([community](https://community.shopify.dev/t/feature-polaris-linting/35660)).

### Design Lint (Figma plugin, Daniel Destefanis)
- Scans layers for fills/strokes/effects/text not using a style, radius not in an allowed set; click-to-fix ([github](https://github.com/destefanis/design-lint)). Free, MIT; widely installed; Discord maintains a fork.
- **Weakness:** **Style-centric, not Variables-aware**; customisation requires forking ("Configuration file?" [#49](https://github.com/destefanis/design-lint/issues) open since 2023); low maintenance.

### Roller · Design Linter (Toybox)
- Commercial plugin: register styles in a Roller library, scan and fix ([community](https://www.figma.com/community/plugin/751892393146479981/roller-design-linter)); ~20k installs. Launched 2019, opaque pricing, predates Variables.

### Other Figma linters (2025, variable-aware)
- FigLint, Yet Another Design Linter, Variable Linter, FigmaLint (AI), Design System Linter Pro, OSS aficat/design-linter ([FigLint](https://www.figma.com/community/plugin/1323794044088972088/figlint), [YADL](https://www.figma.com/community/plugin/1496477931536811576/yet-another-design-linter), [Variable Linter](https://www.figma.com/community/plugin/1517207651312100081/variable-linter), [aficat](https://github.com/aficat/design-linter)).
- **Weakness:** A long tail of single-author plugins with no shared rule format, no CI/headless mode; forum threads asking how to lint a large DS get plugin lists, not a solution ([forum](https://forum.figma.com/archive-21/plugins-to-help-lint-standardize-a-large-design-system-32726)).

### eslint-plugin-tailwindcss
- `no-arbitrary-value`, `no-custom-classname`, `classnames-order`; rewritten for Tailwind v4 after a long gap that spawned forks ([github](https://github.com/francoismassart/eslint-plugin-tailwindcss), [hyoban fork](https://github.com/hyoban/eslint-plugin-tailwindcss)). MIT.
- **Weakness:** `no-arbitrary-value` is off by default; `no-custom-classname` false-positives on plugin-generated classes so teams disable the enforcing rules ([amanhimself](https://amanhimself.dev/blog/resolving-custom-tailwind-classname-eslint-warning/)).

### Panda CSS `strictTokens` / `strictPropertyValues`
- Build-time, type-level enforcement: token-bearing props accept only token names; `[raw]` escape hatch ([docs](https://panda-css.com/docs/concepts/writing-styles)). MIT.
- **Weakness:** Strict mode blocks `auto`/`inherit`/`unset` — answer is "define them as tokens," called "rather suboptimal" ([#2712](https://github.com/chakra-ui/panda/discussions/2712), [#2158](https://github.com/chakra-ui/panda/issues/2158)); `borderWidth` accepted nothing under strict ([#2181](https://github.com/chakra-ui/panda/issues/2181)); no per-token-type strictness ([#1400](https://github.com/chakra-ui/panda/discussions/1400)); escape hatch is ungated and unmonitored.

### vanilla-extract
- Zero-runtime TS stylesheets with `createThemeContract` typed tokens and Sprinkles typed atomics ([github](https://github.com/vanilla-extract-css/vanilla-extract)). MIT; used by Seek/Braid.
- **Weakness:** "Maintainers… are not very active… issues often don't get any responses" ([sandroroth](https://sandroroth.com/blog/vanilla-extract-approach/)); object-shaped tokens proposal unanswered ([#1681](https://github.com/vanilla-extract-css/vanilla-extract/discussions/1681)); Sprinkles union types degrade IDE performance ([#1082](https://github.com/vanilla-extract-css/vanilla-extract/discussions/1082)); enforcement only inside `.css.ts`.

### Linting gaps
1. **No token-aware linter that knows *your* token set** — nothing reads a DTCG file and lints CSS, JS, *and* Figma against it.
2. CSS-in-JS/template interpolation is a blind spot.
3. Vendor-specific, not reusable: Atlassian, MetaMask, Polaris, Mozilla each wrote bespoke rules; Polaris is archived.
4. Figma-side linting is a plugin zoo with no CI mode.
5. Escape hatches (`[raw]`, arbitrary values, bulk `stylelint-disable`) are never tracked over time.

---

## 5. Visual regression

### Chromatic
- **What:** Cloud visual + interaction testing for Storybook (and Playwright/Cypress); TurboSnap limits re-snapshots. Billing unit = story × browser × viewport ([billing](https://www.chromatic.com/docs/billing/)).
- **Price:** Free 5k snapshots/mo; Starter $149/mo (35k); Pro ~100k; Enterprise.
- **Weakness:** Snapshot-volume cost spirals: ComplyAdvantage went 133k → 365k snapshots in three months from "the rebase spiral" and had to delete stories to cut 60% ([case study](https://technology.complyadvantage.com/how-we-cut-our-chromatic-costs-by-60-a-visual-testing-optimisation-story/)); 500 stories/30 PRs a day ≈ $300–700/mo ([bug0](https://bug0.com/knowledge-base/storybook-visual-regression-testing-chromatic)); users ask for a non-Chromatic path with the Vitest runner ([#31826](https://github.com/storybookjs/storybook/discussions/31826)); "no plan B" lock-in ([delta-qa](https://delta-qa.com/en/blog/storybook-visual-testing-without-chromatic/)).

### Percy (BrowserStack)
- **What:** Cloud diffing via SDKs on BrowserStack infra; 2025 AI "Visual Review Agent."
- **Price:** Free 5k; Desktop $199/mo (10k); Desktop+Mobile $599/mo (25k) ([pricing](https://percy.io/pricing)).
- **Weakness:** Poor per-dollar value (10k for $199 vs Argos 40k for $100); no reviewer assignment ([Chromatic compare](https://www.chromatic.com/compare/percy), competitor source); complaints aggregate under BrowserStack ([bug0](https://bug0.com/knowledge-base/browserstack-reviews)).

### Lost Pixel
- **What:** OSS CLI (Storybook/Ladle/Playwright modes) diffing in CI; Platform adds review UI ([github](https://github.com/lost-pixel/lost-pixel), MIT). Platform ~$100–670/mo.
- **Weakness:** Flaky captures — fonts not loaded, loading states captured ([#429](https://github.com/lost-pixel/lost-pixel/issues/429)); their own blog concedes retries + custom waits are needed ([blog](https://www.lost-pixel.com/blog/handling-flaky-visual-regression-tests-with-lost-pixel-platform)).

### Argos CI
- **What:** OSS visual testing service (MIT code): upload from any runner, ARIA-snapshot diffs, auto-ignore flakes. Free 5k; $100/mo for 40k; free for OSS ([pricing](https://argos-ci.com/pricing)). Used by MUI.
- **Weakness:** Deterministic pixel diff — stabilisation (dates, animations, fonts) is on you ([docs](https://argos-ci.com/docs/learn/reliability-and-flakiness/flaky-tests/stabilize-date-and-time)); smaller ecosystem ([review](https://thectoclub.com/tools/argos-software-review/)).

### BackstopJS
- Self-hosted config-driven screenshot regression ([github](https://github.com/garris/BackstopJS), MIT). Long tail of Puppeteer flake: parallel captures corrupting ([#1344](https://github.com/garris/BackstopJS/issues/1344)), resize flake ([#968](https://github.com/garris/BackstopJS/issues/968)); single maintainer; no PR review UI.

### Playwright `toHaveScreenshot`
- Built-in pixel assertion, baselines in repo ([docs](https://playwright.dev/docs/test-snapshots)). Free, Apache-2.0.
- **Weakness:** Platform-specific baselines (`-darwin` vs `-linux`) so macOS devs can't update CI baselines without Docker ([#36228](https://github.com/microsoft/playwright/issues/36228), [#13873](https://github.com/microsoft/playwright/issues/13873)); no review UI — approving means committing PNGs ([Scott Logic](https://blog.scottlogic.com/2025/08/21/making-visual-comparison-test-maintenance-easier-with-github-actions.html)); anti-aliasing flake ([#7548](https://github.com/microsoft/playwright/issues/7548)).

### Applitools Eyes
- AI perceptual diffing + Ultrafast Grid; contact sales, thousands/yr. "Not easy to afford," "tricky to use if not well versed" ([Capterra](https://www.capterra.com/p/229998/Applitools-Eyes/reviews/)).

### reg-suit
- OSS CLI diffing screenshot dirs with S3/GCS baselines and PR reports ([github](https://github.com/reg-viz/reg-suit), MIT). Bring-your-own screenshots and storage; approval by re-push rather than review UI.

### VRT gaps
1. Cost scales with snapshots × browsers × viewports × commits; nobody has cracked "pay for review, not pixels."
2. Flake handling is on the user; OSS tools lack the auto-ignore heuristics SaaS sells.
3. Component-level and page-level testing are separate pipelines; only Chromatic spans both.
4. **No tool ties a visual diff back to the token or Figma change that caused it.**

---

## 6. Adoption / analytics

### Omlet (Zeplin)
- **What:** CLI scans React code (AST) and ships component/prop usage to a dashboard; self-host OSS ([github](https://github.com/zeplin/omlet)). Free (1 user, 4 scans/30d); Intro $159/mo ([pricing](https://omlet.dev/pricing/)).
- **Weakness:** React-only (Vue request [#8](https://github.com/zeplin/omlet/issues/8)); parser rejects TS `satisfies` and silently drops the whole file ([#11](https://github.com/zeplin/omlet/issues/11)); compound components undetected ([#2](https://github.com/zeplin/omlet/issues/2)).

### Figma Library Analytics
- **What:** Org/Enterprise dashboard + REST API for component/style/variable insertions and detaches ([help](https://help.figma.com/hc/en-us/articles/360039238353-View-and-explore-library-analytics)). API Enterprise-only.
- **Weakness:** Numbers disagree between views (summary 4 detaches, detail 1; detail capped at 30 days "due to a current system limitation") ([forum](https://forum.figma.com/report-a-problem-6/figma-analytics-detaches-accuracy-41548)); API can't return per-file breakdowns shown in the UI ([forum](https://forum.figma.com/report-a-problem-6/library-analytics-api-cannot-return-information-that-is-available-in-the-web-ui-49717)); admins see only files they can access, no cross-library rollup ([forum](https://forum.figma.com/ask-the-community-7/discrepancies-in-figma-library-analytics-16536)); no "why detached" ([Figma blog](https://www.figma.com/blog/design-systems-104-making-metrics-matter/)).

### react-scanner
- Node CLI extracting React component + prop usage to JSON ([github](https://github.com/moroshko/react-scanner), MIT); the DIY starting point.
- **Weakness:** Lagging parser — fails on `??=` ([#81](https://github.com/moroshko/react-scanner/issues)), "Unknown node type: JSXElement" ([#79](https://github.com/moroshko/react-scanner/issues)); 22 open issues mostly unanswered; counts imports not renders.

### zeroheight Measurement
- Docs analytics plus a GitHub Action scanning repos for component usage, hardcoded colors, package versions ([measurement](https://zeroheight.com/measurement/), [action](https://github.com/zeroheight/action-design-system-adoption)). Paid/enterprise tiers.
- **Weakness:** Coupled to the docs product; scanner is import/package-based; their own help doc frames dev-side measurement as still "manual or automated checks" ([help](https://help.zeroheight.com/hc/en-us/articles/36474148202523-How-to-measure-the-dev-side-of-a-design-system)).

### Supernova / Knapsack analytics
- Supernova's code-adoption is largely a recipe (extract → parse → export JSON → visualise) ([blog](https://www.supernova.io/blog/design-system-analytics-metrics)); Knapsack analytics only cover what's in Knapsack ([Capterra](https://www.capterra.com/p/241708/Knapsack/reviews/)). Both platform-gated.

### Storybook telemetry
- Opt-out ecosystem telemetry for maintainers, not an org dashboard ([docs](https://storybook.js.org/docs/configure/telemetry)); opt-out default drew EU-legality pushback ([#19910](https://github.com/storybookjs/storybook/discussions/19910)); background requests continue when disabled ([#27053](https://github.com/storybookjs/storybook/discussions/27053)).

### Custom AST scanners and metrics practice
- Productboard, Mews and others publish in-house approaches ([Productboard](https://www.productboard.com/blog/how-we-measure-adoption-of-a-design-system-at-productboard/), [Mews](https://developers.mews.com/design-system-adoption-metric-building/), [visual coverage analyzer](https://www.designsystemscollective.com/measuring-design-system-adoption-building-a-visual-coverage-analyzer-b5d9ae410d42)).
- **Weakness:** Import counts conflate "imported" with "used well" — "Design System Adoption is a Red Herring" ([Ouriach](https://medium.com/@disco_lu/design-system-adoption-is-a-red-herring-6c6b5a504f43)); Mews had to use production render data for a trustworthy number; every company rebuilds the same scanner.

### Analytics gaps
1. React-only everywhere; Vue/Svelte/Web Components/native have nothing turnkey.
2. **Design-side and code-side data never join** — no tool maps a Figma component's detach rate to its code counterpart's usage.
3. Static import counts dominate; render-time coverage is DIY.
4. Figma's own numbers are partial and inconsistent.
5. No consensus metric definition; "adoption %" is incomparable across teams; ROI measured by 5%.

---

## 7. Theming / color generation

### Adobe Leonardo
- Contrast-first palette generator (key colors + target ratios → scales); npm lib + web UI ([github](https://github.com/adobe/leonardo), Apache-2.0). Used by Spectrum.
- **Weakness:** Library doesn't reproduce the site: single-color input yields "lots of dark colors and almost no light ones"; polynomial lightness path unreachable without editing the lib ([#254](https://github.com/adobe/leonardo/issues/254), open since Jul 2025, no reply).

### Huetone
- OKLCH/LCH palette editor with WCAG + APCA grids and gamut checks ([github](https://github.com/ardov/huetone), MIT).
- **Weakness:** Low maintenance — 2023 issues still open, newest issue Feb 2024 ([issues](https://github.com/ardov/huetone/issues)); no pipeline beyond copy-paste.

### Radix Colors
- Pre-built 12-step light/dark/P3/alpha scales with documented step semantics ([github](https://github.com/radix-ui/colors), MIT). Widely used with Radix Themes / shadcn.
- **Weakness:** Documented contrast guarantee doesn't hold: Yellow 4.33, Amber 4.44, Orange 4.13 on step 3, below the promised 4.5:1 ([#42](https://github.com/radix-ui/colors/issues/42), open since Feb 2024, no response); step 9 flagged by Lighthouse ([#30](https://github.com/radix-ui/colors/issues/30)); custom generator is a black box.

### Material Theme Builder (M3 / HCT)
- Seed color → full M3 tonal palettes via `material-color-utilities` (TS/Dart/Java/Swift/C++) ([github](https://github.com/material-foundation/material-color-utilities), Apache-2.0).
- **Weakness:** Library and Theme Builder disagree ([#194](https://github.com/material-foundation/material-color-utilities/issues/194)); TS neutrals default to #000000 ([#201](https://github.com/material-foundation/material-color-utilities/issues/201)); ESM export broken in 0.4.0 ([#195](https://github.com/material-foundation/material-color-utilities/issues/195)); 89 open issues; seed-derived schemes famously desaturate brand colors ([#185](https://github.com/material-foundation/material-color-utilities/issues/185)).

### Accessible Palette (Wildbit)
- Multi-hue scales with consistent CIELCh lightness per level; WCAG + APCA ([app](https://accessiblepalette.com/), [post](https://www.wildbit.com/blog/accessible-palette-stop-using-hsl-for-color-systems)). Free.
- **Weakness:** sRGB-only (chroma clipped), "APCA may change," no export pipeline, effectively unmaintained (authors' own caveats).

### OKLCH tools (oklch.com / Evil Martians)
- OKLCH picker with P3/Rec2020 boundaries and CSS fallbacks ([github](https://github.com/evilmartians/oklch-picker), MIT).
- **Weakness:** Lingering gamut/chart bugs ([#129](https://github.com/evilmartians/oklch-picker/issues), [#62](https://github.com/evilmartians/oklch-picker/issues)); single-color tool, not a palette system.

### Tailwind v4 OKLCH palette
- Default palette redefined in OKLCH as `@theme` CSS variables ([docs](https://tailwindcss.com/docs/colors)). MIT.
- **Weakness:** No automatic fallbacks — "new colors don't work for 7% of users worldwide" closed without shipping fallbacks ([#16351](https://github.com/tailwindlabs/tailwindcss/issues/16351)); old Safari breaks ([#18081](https://github.com/tailwindlabs/tailwindcss/issues/18081)); opacity-modifier bugs ([#14499](https://github.com/tailwindlabs/tailwindcss/issues/14499)); email/legacy needs a separate hex palette.

### Atmos
- Paid OKLCH palette builder with contrast checks, history, Figma sync ([pricing](https://atmos.style/pricing)). Closed source; free tier becomes view-only after trial; single-maintainer.

### ColorBox (Lyft), Palettte, Primer Prism
- ColorBox: curve-based HSB scales, abandoned (2018–2019 issues open) ([github](https://github.com/lyft/coloralgorithm)). Palettte: HSL-based, no updates since ~2019 ([app](https://palettte.app/)). Primer Prism: LCh curve editor, **archived Dec 2024** with open crash bugs ([github](https://github.com/primer/prism)).

### Color gaps
1. Most perceptual tools are one-person or archived; maintained ones are Adobe/Google-shaped or single-color pickers.
2. Gamut/fallback handling is unresolved across the board (Tailwind no fallbacks, Accessible Palette sRGB-only, Material/Leonardo clip differently).
3. "Guaranteed contrast" claims fail in practice (Radix #42, Leonardo, Material); APCA vs WCAG 2 unsettled.
4. Library vs UI divergence (Leonardo #254, Material #194) breaks automation.
5. **Nothing produces semantic/theme tokens (surface/on-surface/border roles) plus light/dark/high-contrast modes from one source** in DTCG form; Material is closest but M3-shaped.

---

## 8. AI-era tools and MCP servers

### v0 (Vercel)
- Prompt-to-React/Next UI on shadcn/ui + Tailwind; DS context via shadcn registries, theme tokens, Figma imports ([blog](https://vercel.com/blog/ai-powered-prototyping-with-design-systems)). Credit-based SaaS.
- **Weakness:** Credits drain: "50 cents on small edits as the AI reads the whole project," charged "even when the tool fails" ([Trustpilot](https://au.trustpilot.com/review/v0.dev)); Vercel concedes non-shadcn libraries yield lower-quality output — it respects *your* system only if re-expressed as a shadcn registry ([blog](https://vercel.com/blog/working-with-figma-and-custom-design-systems-in-v0)).

### Claude Artifacts / Claude Design (Anthropic)
- Artifacts = inline HTML/React previews; Claude Design (Anthropic Labs, Apr 2026) = canvas for prototypes/mockups with handoff to Claude Code, claims to apply your design system ([announcement](https://www.anthropic.com/news/claude-design-anthropic-labs), [TechCrunch](https://techcrunch.com/2026/04/17/anthropic-launches-claude-design-a-new-product-for-creating-quick-visuals/)). Pro/Max/Team/Enterprise only.
- **Weakness:** No native Figma export, no pixel-precise editor; "design system cleanup and production handoff often still require Figma" ([uxpilot](https://uxpilot.ai/blogs/claude-design-review), [Anima](https://animaapp.com/blog/ai-design-en/claude-design-review-features-pros-cons-and-best-alternatives/)); "impressive, but not yet ready to replace Figma" ([substack](https://yiannisantoniou.substack.com/p/claude-design-redux-impressive-but)).

### Figma Make
- Prompt-to-app inside Figma with attachable library/"Make Kit." Full seats only; monthly AI credits (~3,000–4,250) not purchasable standalone ([techstackdaily](https://www.techstackdaily.com/review/figma-pros-and-cons-2026/)).
- **Weakness:** "Figma Make not using my library components" — generates generic/shadcn output even with a library attached; open since Jun 2025, Figma in May 2026: "a persistent and genuinely frustrating gap… a known limitation" ([forum](https://forum.figma.com/suggest-a-feature-11/figma-make-not-using-my-library-components-42235)). Can't read the variables its own MCP exposes ([forum](https://forum.figma.com/share-your-feedback-26/figma-mcp-enables-get-variables-but-make-can-t-access-them-without-manual-export-copy-and-paste-this-is-binkers-50008)).

### Subframe
- Visual editor producing production React/Tailwind with AI assist and a built-in theme layer; from ~$29/mo.
- **Weakness:** "If you're not in the React/Tailwind ecosystem… you'll hit friction" ([designwhine](https://www.designwhine.com/subframe-review-a-design-tool-production-ready/)).

### Paper (paper.design)
- AI-native canvas on real HTML/CSS with a first-party MCP ([review](https://www.banani.co/blog/paper-design-mcp-review)). Free (100 MCP calls/week) → Pro ~$20/user ([pricing](https://paper.design/pricing)).
- **Weakness:** Open alpha; MCP call ceiling "hits quickly"; no migration path from an existing Figma DS ([sfailabs](https://sfailabs.com/guides/figma-mcp-vs-paper), [uithings](https://uithings.com/figma-vs-paper)).

### Onlook
- OSS "Cursor for designers": visual editor over a running Next.js + Tailwind app, writes back to source ([github](https://github.com/onlook-dev/onlook), Apache-2.0); cloud in closed beta.
- **Weakness:** Next.js + Tailwind only ([FAQ](https://docs.onlook.com/faq)); tracker dominated by self-host breakage (#3133, #3116, #3119); exposing design context to external agents is only a proposal (#3128) ([issues](https://github.com/onlook-dev/onlook/issues)).

### Google Stitch
- Gemini prompt/sketch → UI screens; exports to Figma/HTML/React/Flutter; free (400 daily credits) ([review](https://www.banani.co/blog/google-stitch-ai-review)).
- **Weakness:** Output "defaults to the most statistically common design decisions"; low contrast / missing ARIA; no bring-your-own design system ([index.dev](https://www.index.dev/blog/google-stitch-ai-review-for-ui-designers), [moda](https://moda.app/blog/google-stitch-review)).

### Lovable / Bolt / Magic Patterns / UXPin Merge / Relume
- **Lovable:** full-stack builder with a "Design systems" feature on paid plans ([docs](https://docs.lovable.dev/features/design-systems)); codebases get "messy" after 20–30 prompts, Lovable's own docs concede pages look "inconsistent as a product" ([survey](https://designrevision.com/blog/why-developers-switch-from-lovable-survey-results), [FAQ](https://lovable.dev/faq/design/systems-and-libraries)).
- **Bolt:** token burn — "up to half their tokens went to errors," rewrites whole files and breaks structure ([Product Hunt](https://www.producthunt.com/products/bolt-new/reviews), [review](https://superdesign.dev/blog/bolt-review)).
- **Magic Patterns:** DS import + canvas, $20–100/seat; "requires uploading or configuring design systems to achieve brand-accurate output," weak responsive preview ([banani](https://www.banani.co/blog/magic-patterns-ai-review)).
- **UXPin Merge / Forge:** design with real coded React components, AI layouts; $6–149/editor; steep learning curve, slow on large projects ([flowstep](https://flowstep.ai/blog/uxpin-reviews/)).
- **Relume:** Webflow-centric sitemap/wireframe generator; output "feels too familiar" ([converge](https://enter.converge.ai/blog/relume-review)).

### MCP servers for design systems
- **Figma Dev Mode MCP** — see §3. Context blowups, seat-gated quotas.
- **Storybook MCP (`@storybook/addon-mcp`)** — docs/manifest tools plus `run-story-tests` for a generate→test→fix loop ([docs](https://storybook.js.org/docs/ai/mcp/overview)). MIT. Preview status; docs tools **React-only**; needs Storybook 10.5+. The only DS MCP that validates output.
- **shadcn registry + MCP** — CLI 3.0 (Aug 2025) namespaced/private registries positioned as "a distribution specification designed to pass context from your design system to AI models" ([changelog](https://ui.shadcn.com/docs/changelog/2025-08-cli-3-mcp), [registry](https://ui.shadcn.com/docs/registry)). MIT. Only reaches teams that re-author as a shadcn registry.
- **Tokens Studio Portal/Relay** and community `tokensStudioMCP` ([designtools.fyi](https://designtools.fyi/tools/tokens-studio), [glama](https://glama.ai/mcp/servers/Blyawon/tokensStudioMCP)). Teams "skip the semantic layer entirely," so agents see `red-6` not `color-feedback-error` and pick wrong tokens ([thedesignsystem.guide](https://learn.thedesignsystem.guide/p/design-tokens-that-ai-can-actually)).
- **Supernova MCP** — hosted OAuth MCP serving tokens/components/docs; per-team "AI Context Management" ([docs](https://learn.supernova.io/latest/design-systems/features/mcp-for-design-system-LIHAMhjr-LIHAMhjr)). **Read-only** — "can't make changes to data inside Supernova."
- **zeroheight MCP** — remote MCP over published pages ([mcp](https://zeroheight.com/mcp/)). Prose-only; quality depends on doc structure; no validation.
- **Knapsack MCP** — OSS server over docs/components/tokens ([blog](https://www.knapsack.cloud/blog/knapsacks-mcp-server-turns-design-systems-into-production-engines)); value requires ingesting your whole system into Knapsack first.
- **Library/community servers** — Google Design MCP ([overview](https://developers.google.com/design-mcp/overview)), Ant Design official MCP ([docs](https://ant.design/docs/react/mcp/)), southleft/design-systems-mcp (Carbon, Polaris, M3, Fluent, Spectrum, Mantine…) ([github](https://github.com/southleft/design-systems-mcp)), agentience/react-design-systems-mcp (Cloudscape only, others "planned") ([github](https://github.com/agentience/react-design-systems-mcp)). Mostly docs-scrapers for *public* libraries that don't know your theme overrides or wrappers.
- **Mobbin MCP** (May 2026, 621k screens) ([businesswire](https://www.businesswire.com/news/home/20260511053592/en/Mobbin-Launches-MCP-Server-Giving-AI-Tools-621500-Real-App-Screens-to-Reference)) pulls agents toward *other* products' patterns — the opposite of enforcing a house system.
- **21st.dev Magic MCP** — effectively abandoned (last commit Feb 2026) with an unanswered prompt-injection/supply-chain advisory ([#46](https://github.com/21st-dev/magic-mcp/issues/46)).

### "Design system as LLM context" practice
- DESIGN.md / AGENTS.md layering with community corpora (awesome-design-md, designmd.app, designtoken.md) ([betterstack](https://betterstack.com/community/guides/ai/design-md-ai/), [awesome-design-md](https://github.com/voltagent/awesome-design-md), [designtoken.md](https://designtoken.md/)); "Figma for Coding Agents" on HN: "most outputs from coding agents do start looking similar… a fixed design system as input could solve that" ([HN](https://news.ycombinator.com/item?id=47719485)).
- Vercel Web Interface Guidelines as an agent skill — 100+ rules, review-only, doesn't modify code ([changelog](https://vercel.com/changelog/web-interface-guidelines-now-available-as-an-agent-command), [skill](https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md)).
- Drift analyses: token fabrication, within-session drift, between-session amnesia, silent breaking changes ([superdesign](https://superdesign.dev/blog/ai-design-system-drift)); "docs say one thing, tokens another, components a third" and agents pick whichever they find first; JSON vs Markdown docs cut token cost ~80% ([intodesignsystems](https://www.intodesignsystems.com/blog/design-system-not-ready-for-ai-agents), [otf-kit](https://otf-kit.dev/blog/design-system-is-agent-context), [HN](https://news.ycombinator.com/item?id=44322036)).
- Sparkbox proposes AI vision models for detecting drift between Figma and production, but "this judgment is what AI cannot do and shouldn't do" ([Sparkbox](https://sparkbox.com/foundry/finding_and_fixing_design_system_drift)).

### AI-era gaps
1. Generated UI drifts from the system structurally (no memory, invented tokens); Figma Make ignores attached libraries for a year.
2. The "design system" most tools accept is shadcn + Tailwind; non-React/web-component/native/themed-MUI systems have no first-class path.
3. No feedback loop from code back to Figma; Claude Design and Paper don't export to Figma at all.
4. Context-window economics: 170k–350k-token Figma responses vs 25k caps; nobody offers scoped/progressive disclosure by default.
5. Semantic tokens, usage rules, pairings and contrast metadata are not exposed to agents.
6. Read-only or validate-nothing servers; only Storybook MCP closes the loop with tests, and it's preview/React-only. No post-generation token-violation lint step.
7. Prompt-injection and supply-chain surface in design content and community MCPs.
8. Credit/token pricing charges for failed or full-file rewrites, discouraging the tight loop that keeps output on-system.

---

## Gaps observed (cross-cutting)

Problems nobody solves well, with evidence.

1. **No drift detection between design, tokens, code, and docs.** Figma Code Connect breaks silently ([#291](https://github.com/figma/code-connect/issues/291)); "structural component parity… does not have a reliable automated solution in 2026" ([Atomize](https://atomize.tools/blog/figma-design-system-parity-code-sync)); Sparkbox's answer is a hand-rolled AI-vision skill ([Sparkbox](https://sparkbox.com/foundry/finding_and_fixing_design_system_drift)); zeroheight users call manual review "the bottleneck." Every vendor treats drift as a process problem.

2. **No token-aware linter that reads *your* DTCG file and enforces it across CSS, JS/CSS-in-JS, and Figma.** `declaration-strict-value` accepts any `var()` and wontfixes CSS-in-JS ([#134](https://github.com/AndyOGo/stylelint-declaration-strict-value/issues/134)); Atlassian/MetaMask/Polaris/Mozilla each wrote bespoke rules, and Polaris's is now archived; Figma-side linting is a plugin zoo with no CI mode; Design Lint doesn't understand Variables.

3. **Theming / multi-brand has no standard implementation.** DTCG Resolver module is "preview, do not implement"; Style Dictionary ([#1590](https://github.com/style-dictionary/style-dictionary/issues/1590)) and Terrazzo both in progress; Tokens Studio uses proprietary `$themes`; Figma uses plan-capped modes. Only 22% of teams even use aliased tokens ([report](https://report.zeroheight.com/)).

4. **The Figma Variables ↔ DTCG round-trip is lossy and paywalled.** Four variable types vs ~10 token types, no composite export ([forum](https://forum.figma.com/suggest-a-feature-11/dtcg-composite-token-export-support-51314)), REST API Enterprise-only since 2023 ([forum](https://forum.figma.com/suggest-a-feature-11/why-s-the-variables-api-only-available-on-enterprise-plans-36426)); Penpot exports a different dialect than it claims ([community](https://community.penpot.app/t/token-export-is-tokens-studio-format-not-dtcg-2025-10/10544)). Three incompatible "DTCG" dialects are in circulation.

5. **Nothing is bidirectional.** Every pipeline (tokens, Code Connect, MCP, AI generators) runs design → code. Code → Figma is "at least five context switches" ([Builder](https://www.builder.io/blog/claude-code-to-figma)); Claude Design and Paper don't export to Figma; Supernova's MCP is read-only.

6. **Adoption measurement is React-only, import-based, and never joins design-side with code-side data.** Omlet/react-scanner are React-only with parser gaps ([omlet#11](https://github.com/zeplin/omlet/issues/11)); Figma analytics disagree with themselves ([forum](https://forum.figma.com/report-a-problem-6/figma-analytics-detaches-accuracy-41548)); ROI is measured by 5% of teams; "Design System Adoption is a Red Herring" ([Ouriach](https://medium.com/@disco_lu/design-system-adoption-is-a-red-herring-6c6b5a504f43)).

7. **AI generators don't respect existing design systems unless the system is shadcn + Tailwind.** Figma Make ignoring attached libraries is an acknowledged year-long gap ([forum](https://forum.figma.com/suggest-a-feature-11/figma-make-not-using-my-library-components-42235)); v0/Lovable/Onlook/shadcn MCP/Storybook MCP all assume React+Tailwind; agents see primitive tokens, not semantics ([thedesignsystem.guide](https://learn.thedesignsystem.guide/p/design-tokens-that-ai-can-actually)); no tool validates generated output against the system except the preview-only Storybook MCP.

8. **Design-system context is too big and too unstructured for agents.** Figma MCP returns 170k–350k tokens against 25k caps ([Figma docs](https://developers.figma.com/docs/figma-mcp-server/mcp-clients-issues)); "docs say one thing, tokens another, components a third" ([intodesignsystems](https://www.intodesignsystems.com/blog/design-system-not-ready-for-ai-agents)); only 12% of teams deliver docs via MCP/chatbot despite 57% interest ([report](https://report.zeroheight.com/)).

9. **Visual regression is priced per pixel and never linked to cause.** Chromatic costs spiral with rebases ([ComplyAdvantage](https://technology.complyadvantage.com/how-we-cut-our-chromatic-costs-by-60-a-visual-testing-optimisation-story/)); Playwright has platform-bound baselines and no review UI; no tool maps a visual diff back to the token or Figma change that produced it.

10. **Color/theme generation is fragmented, mostly abandoned, and never emits semantic DTCG tokens with modes.** Primer Prism archived, ColorBox/Palettte/Huetone stale; "guaranteed contrast" claims fail (Radix [#42](https://github.com/radix-ui/colors/issues/42)); Tailwind ships OKLCH without fallbacks ([#16351](https://github.com/tailwindlabs/tailwindcss/issues/16351)); library output diverges from the web UI (Leonardo [#254](https://github.com/adobe/leonardo/issues/254), Material [#194](https://github.com/material-foundation/material-color-utilities/issues/194)).

11. **Escape hatches are never tracked.** Panda `[raw]`, Tailwind arbitrary values, bulk `stylelint-disable`, Figma detaches — all exist, none is reported as a trend.

12. **Vendor mortality and single-maintainer risk across the whole stack.** Specify (2024), Backlight (2025), Pattern Lab (2026), Primer Prism (2024), 21st.dev Magic MCP (2026) gone or abandoned; Terrazzo, Ladle, Histoire, Huetone, BackstopJS, vanilla-extract are effectively one person; Storybook and Style Dictionary each shipped multiple breaking majors in two years. Seat-based SaaS (zeroheight $49/editor, Supernova 15-seat cap, Knapsack sales-only, Figma Org/Enterprise gates) taxes exactly the cross-discipline contribution a design system needs — and only 37% of teams have *any* automation, down 8% YoY.
