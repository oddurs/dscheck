# Design Systems: Process and Pain Points (2024–2026)

Research synthesis on how practitioners actually produce and maintain design systems, and where it hurts. Compiled August 2026.

**Evidence base.** Primary quantitative source is zeroheight's *Design Systems Report 2026* (147 practitioners, 5th annual; https://report.zeroheight.com/) plus the 2025 edition (~300 respondents). Qualitative sources: Brad Frost, Nathan Curtis / EightShapes, Sparkbox Foundry, Smashing Magazine, Supernova, Knapsack, Builder.io, Figma community forum threads, and several 2025–2026 "why design systems fail" essays. Medium-hosted posts (Design Systems Collective, EightShapes on Medium, JumpCloud) and Reddit were not fetchable in this session; where they are cited it is via secondary summaries. All numbers are from the cited sources; nothing is invented.

---

## 1. The end-to-end lifecycle

Each stage lists: what the work is, the tedious / manual / error-prone parts, who does it, and what tooling exists today. The stages are not strictly linear — Nathan Curtis describes systems running in three concurrent modes (strategic, "generation" production of 3–12 months touching the whole catalog, and business-as-usual incremental support; https://chicagocamps.org/nathan-curtis-from-contribution-to-evolution-charting-the-path-of-design-systems/).

### 1.1 Audit / interface inventory

**What:** Screenshot and catalogue every button, input, card, modal, colour, type style, and spacing value in the existing product(s) to find duplication and decide what the system must cover. Also "discover unofficial design and code systems already in use" (Smashing, *Design System in 90 Days*, https://www.smashingmagazine.com/2025/05/design-system-in-90-days/).

**Tedious / error-prone:**
- Manual screenshotting and sorting of hundreds of UI instances into a deck or spreadsheet; no standard format.
- Hunting through Figma files for detached instances, local styles, hard-coded hex values; in code, grepping for raw colours/px values.
- The audit is stale the day it finishes; almost nobody re-runs it. Sparkbox notes teams call Figma "the source of truth" while "the product design and actual product have drifted apart" (https://sparkbox.com/foundry/finding_and_fixing_design_system_drift).
- Shopify found that "after a year, 14% of their admin UI had wandered off the Polaris mainline" despite strong adoption and monitoring (cited in https://www.builder.io/blog/governance-beyond-figma).

**Who:** Usually 1–2 designers, sometimes a front-end dev for the code side. Agencies (EightShapes, Sparkbox) sell this as a deliverable.

**Tooling:** Figma plugins for style/instance linting (used by only 5% per zeroheight 2026); Omlet / custom scripts for code component usage (9%); screenshots + AI visual diff ("compare-design-to-product" skill, Sparkbox); spreadsheets (21% of teams measure with spreadsheets). No mainstream tool does the initial inventory; it is mostly hand labour.

### 1.2 Foundations and design tokens

**What:** Define colour, type, spacing, radius, elevation, motion as primitives → semantic aliases → (optionally) component tokens; express them as Figma Variables and as code (CSS custom properties, Swift, Kotlin, etc.).

**Tedious / error-prone:**
- **Naming.** "Naming is hard… we often struggle finding the right name — for a design token, colors, UI components, HTML classes, and variables." Names end up "too generic" or "too specific". Teams run naming workshops and "maintain spreadsheets to track token names" (Smashing, https://www.smashingmagazine.com/2024/05/naming-best-practices/). Brad Frost: "we've seen so many design system teams struggle to establish/evolve a solid design token architecture" (https://bradfrost.com/blog/post/introducing-subatomic-the-complete-guide-to-design-tokens/).
- **Keeping three copies in sync.** zeroheight 2026: 90% have tokens in Figma, 82% in code, 66% documented — but only 54% have all three, and **60% have no token automation at all** (29% design→code, 6% code→design, 5% bidirectional). Quote: "Our design tokens are not synced, and our design token architecture is not following best practice."
- **Figma Variables limitations.** Forum threads document: can't move variables between collections without breaking references (open feature request since June 2023: "doing anything with bigger Design Systems is super frustrating and time-consuming"; "Variables are just basic JSONs, how can this not be implemented"; https://forum.figma.com/suggest-a-feature-11/copy-move-variable-groups-into-other-collections-18992/index5.html), "riddled with bugs", "publishing not saved, need to reload the tab", "impossible to move variables, to navigate to aliases", no math, typography variables "half-baked", "very hard to have more than one mode" (https://forum.figma.com/ask-the-community-7/what-s-the-plan-for-variables-at-figma-19468). Primitive→alias updates sometimes don't cascade into components (https://forum.figma.com/ask-the-community-7/variable-updates-do-not-work-on-ant-for-figma-31115).
- **Export from Figma is still a workaround.** "we have created all variables in Figma… we would like to share this with developers as we did with Tokens through github. I am not sure how we can do this now." (https://forum.figma.com/t/how-are-you-using-variables-and-tokens/65520). 21% still use Tokens Studio rather than native Variables.
- Multi-brand / multi-mode theming (63% use tokens for multiple brands, 76% for light/dark) multiplies the matrix and the chance of a missed cell.

**Who:** Design system designer(s) + one front-end engineer. In small orgs, a single designer does it alone and the dev side never quite happens.

**Tooling:** Figma Variables; Tokens Studio; Style Dictionary (de-facto transformer); Specify, Supernova, Knapsack (pipelines); W3C Design Tokens spec 1.0 (Oct 2025) finally standardises the JSON format; Penpot native tokens. The pipeline exists but requires an engineer to wire up and maintain — the #1 desired automation in zeroheight 2026 is "Figma Variables to Design Token automation".

### 1.3 Components (design library + code library)

**What:** Build each component twice — as a Figma component set with variants/properties, and as code in one or more frameworks (React 72%, Web Components 36%, Angular 28%, Vue 18%; plus iOS/Android at ~35% each) — with matching names, props, states and tokens.

**Tedious / error-prone:**
- Knapsack's survey: the artifacts requiring the most effort are, in order, designer documentation, the design library (components and styles), coded components, developer documentation (https://www.knapsack.cloud/blog/design-system-adoption-insights).
- Variant × property × state × mode explosion in Figma. "Setting up components with variables manually can quickly become tedious with large design systems." Unchecked growth: "A system quickly fills up with states, variants, and 'just in case' options" (https://imperavi.com/blog/why-most-design-systems-fail-and-what-actually-works/).
- Name/prop divergence between Figma and code ("Card/Featured" vs `FeaturedCard.tsx`), states designed but never implemented (hover/disabled/loading/error), edge cases undesigned (Boldare, https://www.boldare.com/blog/figma-to-code-design-development-sync/; inhaq, https://inhaq.com/blog/figma-to-code-design-engineer-workflow).
- "Teams lose hundreds of hours manually translating hex codes and padding values from Figma into CSS" (inhaq).
- Code Connect / Storybook mapping is per-component, per-framework manual work; "Figma Code Connect automation" is an explicitly requested automation in zeroheight 2026.
- Satisfaction gap: 72% satisfied with the design side vs 54% with code (zeroheight 2026) — the code library lags.
- Brad Frost's meta-point: "vast numbers of human beings are devoting their time and energy to designing, building, documenting, and maintaining the exact same set of common components" (https://bradfrost.com/blog/post/a-global-design-system/).

**Who:** Designers build the Figma library; front-end engineers build code; often different people at different times, which is where drift starts. "Design systems built without engineering input deliver style guides, not systems" (https://www.getambush.com/article/design-systems-fail-without-engineering).

**Tooling:** Figma components/variants; Storybook (61% of teams use it for docs; now with MCP for agents); Chromatic visual regression; Code Connect; UXPin Merge; shadcn/Radix/MUI as starting points; AI tools (Cursor, Claude Code, v0, Figma Make) increasingly used for code generation (71% of AI users).

### 1.4 Documentation

**What:** Usage guidelines, do/don't, props tables, accessibility notes, token references, per component, aimed at both designers and developers.

**Tedious / error-prone:**
- "Documenting the design system is very time-consuming. We ended up doing the majority of our documentation in Figma because it's faster." (zeroheight 2026). Figma is now the #1 doc tool (69%) ahead of Storybook (61%) and zeroheight (32%).
- Only 45% satisfied with their documentation (vs 72% design library); docs coverage measured by just 20%.
- Docs rot: the rendered example, the Figma component and the code drift apart because each is updated separately. "Documentation often turns into a long, redundant manual full of things the team already knows" while "missing edge-case notes" (imperavi).
- Nathan Curtis: documentation follows "least resistance (lengthy documents)" which "discourages adoption"; docs should be tool-first — live components, then pictures, then words (https://eightshapes.com/articles/principles-of-designing-systems/).
- Panelists (Supernova): "a lot of groundwork needs to be done early to make sure the documentation on top of it scales smoothly"; "make sure the documentation is easy to edit and easy for people to contribute to" (https://www.supernova.io/blog/design-system-documentation-is-a-moving-target-panel-recap).
- AI hopes here are highest: documentation generation is the #1 AI excitement area (57%) and #2 current use (60%), but "None of these AIs support a design system out of the box without hallucinating."

**Who:** The DS designer, usually; content designers are among the most under-represented roles (22% cite this).

**Tooling:** zeroheight, Supernova, Knapsack, Storybook Docs, Confluence/Notion, custom Astro/11ty/Docusaurus sites (16%). 51% of automating teams auto-generate parts of docs (prop tables, token lists).

### 1.5 Adoption

**What:** Get product teams to actually use the library instead of detaching, overriding, or rebuilding.

**Tedious / error-prone:**
- zeroheight 2026: only **7% fully adopted**, 31% widely, 38% moderately, 22% minimally. Yet 42% report high trust: "People trust the system. They just don't use it. Trust isn't the bottleneck. Something else is."
- Top reason for poor adoption: lack of company mandate (73%), weak governance (55%), component incompleteness (45%). Top reason for good adoption: component completeness (79%).
- Manual adoption work: 1:1 consultation (71% do this), workshops, office hours, Slack support, chasing teams to upgrade. Community building has the **highest dissatisfaction in the whole survey** (40%); only one full-time community role found across 147 respondents.
- Measuring adoption is manual: 56% use Figma analytics, 50% surveys, 21% spreadsheets, 9% code-adoption tooling. Knapsack: 6% don't measure at all; 34.7% measure via codebase.
- Knapsack's adoption blockers: lack of knowledge/experience (31%), internal politics (21%), lack of documented workflows (21%). Quote: "I'd rather have everyone using the same imperfect button than have a perfect button no one uses."
- Buy-in is getting worse: satisfaction with organisational buy-in fell from 42% (2025) to 32% (2026), dissatisfaction rose from 23% to 40%. "Leadership has no background in design so they don't understand what 'buy-in' means for a design system."

**Who:** The DS team lead / DesignOps; informal "champions" on product teams.

**Tooling:** Figma library analytics; Omlet; custom ESLint rules / lint-on-PR; dashboards in Supernova/zeroheight; Slack bots. Mostly spreadsheets and goodwill.

### 1.6 Governance and contribution

**What:** Decide who can change what, how requests get in, how contributions are reviewed, how breaking changes are approved.

**Tedious / error-prone:**
- "A design system does not fail because teams dislike consistency. It usually fails because no one has defined how decisions get made, who owns quality, or how new patterns enter the system." Manual load without governance: "answering the same review questions repeatedly", "re-explaining standards to each new contributor", "tracking deprecated patterns still in active use" (https://www.pathtoproject.com/blog/20260401-why-design-systems-fail-without-governance).
- Nathan Curtis: "Contributions is a bit of a bad word in design systems." Stewarding a contribution involves onboarding conversation, weekly check-ins, gap identification (missing variants/states), finishing the work — "Stewarding can be a full time job" when scaling from 20 to 200+ components (https://eightshapes.com/articles/stewarding-design-system-contributions/).
- Only 36% satisfied with their contribution process; 27% cite "managing contributions" as a top challenge.
- Federated model quote: "Without a dedicated team… they regularly fall out of date, or bottlenecks end up happening where teams are waiting for a new component to be released but the designer responsible for it is too busy on feature work." Hybrid: "it's a war of responsibilities in large organizations."
- 61% of teams feel understaffed (federated 74%, hybrid 68%, centralised 53%).

**Who:** DS lead; a review committee; in small orgs, nobody — which is the failure mode ("Without ownership, a system belongs to no one. And when it belongs to no one, it stops mattering", imperavi).

**Tooling:** Jira/Linear intake forms, GitHub PR templates, RFC docs, Slack channels. Essentially no product tooling — "governance is the hardest layer to build because there's no tool that implements it" (Boldare).

### 1.7 Versioning, releases and maintenance

**What:** Publish Figma library updates and code package releases, write changelogs, classify breaking changes, deprecate old components, migrate consumers.

**Tedious / error-prone:**
- Defining a visual breaking change: when asked, system makers answer "¯\_(ツ)_/¯"; "We kinda sorta know what's a visual breaking change." A "safe" contrast tweak or font-weight change breaks adopters' layouts ("If you adjust system typography, their elements may wrap or crop in unexpected ways") (https://eightshapes.com/articles/visual-breaking-change-in-design-systems/).
- Releases are 2–4 hours of a developer's time per sprint (Salesforce Lightning, Morningstar); hot fixes "occur unpredictably" and are handled informally; rapid code releases cause designers to lag so "design toolkits and documentation drift from code"; adopters say "Don't overwhelm us with constant change." (https://eightshapes.com/articles/design-system-release-cadence/).
- Figma side: library publishing at scale — "component updates take considerable time to propagate through the component hierarchy"; no version control for Figma components ("Figma component version control" is an explicitly desired automation).
- 44% describe their system as unstable or very unstable; only 8% "very stable" (zeroheight 2026).
- Release notes are produced by only 56%; change-communication satisfaction is 39%. "Release note generation" is on the desired-automation list.
- Dissatisfied automators report "manual task burden (tokens, NPM, internal tools)" and that it "takes over a month to ship changes".
- Maintenance is where systems die: "They fade slowly and quietly as updates stop, ownership blurs, and people quietly stop using it"; "The team of 10+ was all laid off but me – 'the design system is done, why do we need all these people?'" (zeroheight 2026).

**Who:** One front-end engineer for code releases; DS designer for Figma publishes; nobody for deprecation tracking.

**Tooling:** semver + changesets/Lerna, npm, Chromatic, Storybook; Figma branching + library publish; Figma Agents / AI visual diff for drift detection. Changelog/deprecation tooling for the design side barely exists.

---

## 2. Top 15 recurring pain points (ranked)

Ranking weighs frequency across sources, survey prevalence, and severity. Each item lists evidence and URLs.

| # | Pain point | Evidence |
|---|---|---|
| 1 | **Under-resourcing / the lone maintainer** | 56% cite resourcing as top challenge; 61% understaffed; avg DS team is 2 people at ≤100-employee orgs; "There's only one person working on a design system that supports multiple brands"; "a team of 8 designers supporting 5 different design systems and ~20–30 enterprise products". https://report.zeroheight.com/ |
| 2 | **Design ↔ code drift (Figma is not the truth)** | Shopify: 14% of admin UI off Polaris mainline after a year (https://www.builder.io/blog/governance-beyond-figma); "Figma and code will never be in sync" (consensus across 2025 essays); "Code is the truth about now. Figma is the truth about next." https://sparkbox.com/foundry/finding_and_fixing_design_system_drift ; https://figr.design/blog/figma-design-system-drift |
| 3 | **Token sync is manual for most teams** | 60% have zero token automation; only 54% have tokens in design+code+docs; #1 desired automation is Figma Variables→tokens; "Manual syncing just doesn't scale" (https://www.smashingmagazine.com/2025/08/automating-design-systems-tips-resources/); forum: "not sure how we can do this now" (https://forum.figma.com/t/how-are-you-using-variables-and-tokens/65520) |
| 4 | **Adoption without mandate** | 7% fully adopted; 73% blame lack of mandate; buy-in dissatisfaction 23%→40% YoY; "use of our design system is encouraged but not enforced". https://report.zeroheight.com/ ; Knapsack: politics 21%, knowledge gap 31% https://www.knapsack.cloud/blog/design-system-adoption-insights |
| 5 | **Documentation burden and rot** | Docs #1 effort sink (Knapsack); 45% satisfied; "very time-consuming… ended up doing the majority in Figma because it's faster"; docs become "a long, redundant manual… missing edge-case notes" (https://imperavi.com/blog/why-most-design-systems-fail-and-what-actually-works/) |
| 6 | **Prioritisation / can't keep up with requests** | 35% cite prioritising updates; centralised teams "can't keep up with product team requests"; "We are one small team and our DS is used by hundreds of teams." https://report.zeroheight.com/ |
| 7 | **Governance & ownership vacuum** | 55% blame weak governance for poor adoption; "no one has defined how decisions get made" (https://www.pathtoproject.com/blog/20260401-why-design-systems-fail-without-governance); "Without ownership, a system belongs to no one" (imperavi); "war of responsibilities" (zeroheight) |
| 8 | **Figma Variables tooling gaps** | Can't move/copy variables between collections (request open since 2023: "super frustrating and time-consuming"), alias navigation, modes, bugs on publish, typography "half-baked". https://forum.figma.com/suggest-a-feature-11/copy-move-variable-groups-into-other-collections-18992/index5.html ; https://forum.figma.com/ask-the-community-7/what-s-the-plan-for-variables-at-figma-19468 |
| 9 | **Contribution friction** | "Contributions is a bit of a bad word"; "Stewarding can be a full time job"; 29% dissatisfied with contribution process; federated bottlenecks on busy contributors. https://eightshapes.com/articles/stewarding-design-system-contributions/ ; https://chicagocamps.org/nathan-curtis-from-contribution-to-evolution-charting-the-path-of-design-systems/ |
| 10 | **Breaking-change classification and migration** | "¯\_(ツ)_/¯" when asked what's a visual breaking change; typography/spacing tweaks wrap and crop adopter UIs; 44% say their system is unstable. https://eightshapes.com/articles/visual-breaking-change-in-design-systems/ |
| 11 | **Naming** | "Naming is hard"; spreadsheets to track token names; naming workshops; too-generic vs too-specific. https://www.smashingmagazine.com/2024/05/naming-best-practices/ ; "Design token creation/naming" on desired-automation list |
| 12 | **Handoff translation & missing states** | "hundreds of hours manually translating hex codes and padding values"; variant names ≠ props; hover/disabled/loading/error states designed but not built; "Without tokens, teams debate hex codes in Slack". https://inhaq.com/blog/figma-to-code-design-engineer-workflow ; https://www.boldare.com/blog/figma-to-code-design-development-sync/ |
| 13 | **Measuring adoption / proving ROI** | Only 5% measure ROI; 21% use spreadsheets; 9% use code-adoption tooling; "Metrics & adoption tracking" listed as a tooling gap. https://report.zeroheight.com/ ; https://eightshapes.com/articles/measuring-design-system-success/ |
| 14 | **Release/communication overhead** | 2–4 h per release; release notes by only 56%; change-comms satisfaction 39%; "Don't overwhelm us with constant change". https://eightshapes.com/articles/design-system-release-cadence/ |
| 15 | **AI that doesn't know your system** | "None of these AIs support a design system out of the box without hallucinating"; "I spend more time cleaning up after AI"; 52% neutral on AI effectiveness; yet "AI is the first hope we've had at keeping up". "LLM context generation" now a desired automation. https://report.zeroheight.com/ |

Honourable mentions: multi-platform parity (iOS/Android at ~35% each, "multi-platform alignment challenges"); variant sprawl / unchecked growth; accessibility (fell from 46% to 10% as a cited challenge in one year — largely solved by tooling, which is an instructive precedent); designer burnout / invisibility ("the glue in your org's system — and sometimes feel unseen", Kevin Twohy at Config 2025, https://www.supernova.io/blog/what-config-2025-taught-us-about-the-future-of-design-systems-5-must-watch-talks).

---

## 3. "Small but constant" vs "large systemic"

### Small but constant — candidates for a small, sharp tool

These recur daily/weekly, are mechanical, have a clear input/output, and are currently done by hand or with brittle scripts.

| Pain | Why it's tool-shaped | Current state |
|---|---|---|
| **Figma Variables → token JSON → code** (one-way is enough for most) | Pure transformation; W3C DTCG 1.0 format exists; 60% have nothing | Tokens Studio + Style Dictionary need an engineer to wire; native Figma export is a manual JSON dump |
| **Drift detection: Figma component vs Storybook/prod render** | Deterministic diff of two renderings; Sparkbox already prototypes it with a vision model | Manual weekly "20-minute audit" (figr.design); Chromatic covers code-vs-code only |
| **Token / style linting in Figma and code** (hard-coded hex, off-scale spacing, detached instances) | Rule-based; only 5% use Figma lint plugins | Ad-hoc plugins, ESLint/Stylelint custom rules |
| **Naming validation / generation** against a chosen convention | Convention is a grammar; can be checked | Spreadsheets and workshops |
| **Release notes / changelog from Figma publish + git diff** | Both sides emit change events | Only 56% produce release notes; by hand |
| **Visual breaking-change classifier** (did this token/typography change alter layout of consumers?) | Render before/after across consumer screens | Gut feel ("¯\_(ツ)_/¯") |
| **Prop/variant parity check** (Figma variant props vs code props/TS types) | Two schemas, compare | Manual; Code Connect mapping files per component |
| **Adoption metrics** (usage of DS components in repo, detached instances in Figma) | Static analysis + Figma REST API | Spreadsheets (21%), Omlet (9%) |
| **Interface inventory generation** from a live site/Figma file | Crawl + cluster | Screenshot decks |
| **Docs scaffolding** (props tables, token tables, states matrix) | Generated from source | 51% of automating teams do some of this; most don't |
| **Variable housekeeping in Figma** (move/copy between collections, rename with alias preservation) | Figma plugin API can do it | 2+ year-old feature request; some orgs can't install plugins |

Common thread: every one of these is a *sync or check between two representations* (Figma ↔ tokens ↔ code ↔ docs ↔ shipped UI). That gap is the single largest source of small, constant toil.

### Large systemic — not solvable by a tool alone

- **Resourcing and layoffs** ("the design system is done, why do we need all these people?").
- **Executive mandate and buy-in** (73% of poor adoption; worsening YoY).
- **Org model / ownership** (centralised vs federated vs hybrid; "war of responsibilities").
- **Culture** — Ben Callahan walked away from a client over "cultural incompatibility" (https://www.smashingmagazine.com/2025/11/design-system-culture/).
- **Prioritisation against feature work**; product OKRs vs system OKRs.
- **Contribution stewardship** (human coaching; "full time job").
- **Community building** (40% dissatisfied; one FTE in the whole survey).
- **The inter-org redundancy** Brad Frost describes — every company rebuilds the same button (https://bradfrost.com/blog/post/a-global-design-system/).

Tools can *lower the cost* of these (e.g. automated metrics make the buy-in case; generated docs free the one maintainer) but can't remove them.

---

## 4. Solo designers / small teams vs large orgs

### What small teams (1–100 employees; avg DS team = 2 people; 71% still have a "dedicated" team, usually one person) lack

- **An engineer on the system.** Designer:dev ratio in small product orgs is 1:3, and the DS "team" is often the one designer. The token pipeline, Storybook, Code Connect, CI linting — all assume someone can maintain Node tooling. Result: tokens live in Figma only; code is whatever the devs hand-typed.
- **Time for anything that isn't the next component.** No documentation (fastest path = Figma comments), no release notes, no adoption metrics, no governance doc. The system is "done" when the designer stops.
- **Version control and change history on the design side.** Figma branching is Enterprise-only-ish in practice; no changelog.
- **Knowledge.** Knapsack's #1 adoption blocker is "lack of knowledge/experience" (31%). Token architecture (primitive/semantic/component), naming conventions, breaking-change policy are learned from Brad Frost's course or trial and error.
- **A drift safety net.** Nobody is auditing; drift is discovered when a stakeholder notices.
- **Leverage from starting points.** Open-source kits (shadcn, Radix, MUI, Penpot libraries) get them to 80% but the remaining 20% — theming, tokens, docs — is where the toil lives.
- **What they *don't* need:** governance committees, contribution models, community programmes, federated stewarding. Most large-org literature is irrelevant to them.

### What large orgs (1,000+; avg DS team 5–11; designer:dev 1:21 to 1:53) struggle with instead

- **Scale of consumers** ("hundreds of teams"), multi-brand (21% alias across systems; 29% run multiple entirely different systems), multi-platform (iOS/Android/web), multiple frameworks.
- **Governance, contribution, mandate, politics** — the systemic bucket above.
- **Breaking changes with real blast radius**, release cadence negotiation, deprecation tracking.
- **Measurement for budget defence** — ROI (5%), adoption dashboards, community metrics.
- **Tool sprawl and integration** (19% cite tool/process integration), security constraints (can't install Figma plugins), and "Figma scalability frustrations".
- They have the engineers to build pipelines but **still** report the same token-sync and drift pains — 60% no automation is across all sizes — because pipelines decay and ownership moves.

### Where the two overlap (the universal core)

1. Figma ↔ code ↔ docs are three hand-maintained copies of the same truth.
2. Nobody can cheaply answer "what changed, and who does it break?"
3. Documentation is written last and rots first.
4. Naming and token architecture are re-derived from scratch by every team.
5. AI tooling is eagerly wanted (documentation generation 57%, process automation 40%) but currently "hallucinates" the system; the missing piece is machine-readable system context ("LLM context generation").

---

## Sources

- zeroheight Design Systems Report 2026 — https://report.zeroheight.com/
- zeroheight Design Systems Report 2025 overview — https://zeroheight.com/blog/design-systems-report-2025-an-overview/ ; coverage: https://webdesignerdepot.com/zeroheight-releases-its-design-systems-report-2025/ ; https://francescoimprota.com/2025/03/28/design-system-report/
- Knapsack, Design System Adoption Insights — https://www.knapsack.cloud/blog/design-system-adoption-insights
- Supernova, State of AI in Design Systems / predictions — https://www.supernova.io/blog/the-future-of-ai-assisted-design-systems-predictions-and-use-cases
- Supernova, Documentation is a Moving Target panel — https://www.supernova.io/blog/design-system-documentation-is-a-moving-target-panel-recap
- Supernova, Config 2025 takeaways — https://www.supernova.io/blog/what-config-2025-taught-us-about-the-future-of-design-systems-5-must-watch-talks
- Sparkbox, Finding and Fixing Design System Drift — https://sparkbox.com/foundry/finding_and_fixing_design_system_drift
- Builder.io, Code is the source of truth — https://www.builder.io/blog/governance-beyond-figma
- figr.design, Figma Design System Drift — https://figr.design/blog/figma-design-system-drift
- Boldare, Figma to code sync at scale — https://www.boldare.com/blog/figma-to-code-design-development-sync/
- inhaq, Figma to Code Workflow 2026 — https://inhaq.com/blog/figma-to-code-design-engineer-workflow
- Brad Frost, A Global Design System — https://bradfrost.com/blog/post/a-global-design-system/
- Brad Frost, Introducing Subatomic — https://bradfrost.com/blog/post/introducing-subatomic-the-complete-guide-to-design-tokens/ ; update — https://bradfrost.com/blog/post/subatomic-update-publishing-adopting-design-token-systems/
- Nathan Curtis / EightShapes: Principles — https://eightshapes.com/articles/principles-of-designing-systems/ ; Stewarding Contributions — https://eightshapes.com/articles/stewarding-design-system-contributions/ ; Visual Breaking Change — https://eightshapes.com/articles/visual-breaking-change-in-design-systems/ ; Release Cadence — https://eightshapes.com/articles/design-system-release-cadence/ ; Measuring Success — https://eightshapes.com/articles/measuring-design-system-success/ ; Tent Talk — https://chicagocamps.org/nathan-curtis-from-contribution-to-evolution-charting-the-path-of-design-systems/
- Smashing Magazine: Automating Design Systems — https://www.smashingmagazine.com/2025/08/automating-design-systems-tips-resources/ ; Naming Best Practices — https://www.smashingmagazine.com/2024/05/naming-best-practices/ ; Design System in 90 Days — https://www.smashingmagazine.com/2025/05/design-system-in-90-days/ ; Design System Culture — https://www.smashingmagazine.com/2025/11/design-system-culture/
- "Why design systems fail" essays: https://imperavi.com/blog/why-most-design-systems-fail-and-what-actually-works/ ; https://www.yelenakreyndel.com/why-design-systems-fail-and-how-to-prevent-it/ ; https://www.pathtoproject.com/blog/20260401-why-design-systems-fail-without-governance ; https://www.getambush.com/article/design-systems-fail-without-engineering
- Figma forum threads: https://forum.figma.com/suggest-a-feature-11/copy-move-variable-groups-into-other-collections-18992/index5.html ; https://forum.figma.com/ask-the-community-7/what-s-the-plan-for-variables-at-figma-19468 ; https://forum.figma.com/t/how-are-you-using-variables-and-tokens/65520 ; https://forum.figma.com/ask-the-community-7/variable-updates-do-not-work-on-ant-for-figma-31115
- Storybook blog (MCP, Storybook 10) — https://storybook.js.org/blog/
- Not fetchable this session (403): Design Systems Collective and EightShapes posts on Medium, JumpCloud "Figma is no longer the source of truth", Reddit. Cited only via secondary summaries where used.
