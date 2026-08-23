# Foundations craft problems: what is computable, what exists, what is still manual

Research notes on the technical sub-problems inside producing design-system *foundations* (tokens, scales, color, type, icons, theming, docs, sync). For each area: state of the art, existing tools, what remains manual or broken, and what a minimal CLI/web tool could do. Ends with a ranked list of the most underserved computable problems.

Date: 2026-08-23.

---

## 1. Color palettes and ramps (perceptual uniformity)

**State of the art.** OKLCH has won. Tailwind v4 rebuilt its default palette in OKLCH along a fitted lightness curve (L ~97.8 at `50` down to ~23.8 at `950`, hue held constant, chroma reduced to the sRGB boundary rather than clipped). Radix Colors uses a 12-step scale where every step has a fixed UI role (1-2 backgrounds, 3-5 component states, 6-8 borders, 9-10 solid, 11-12 text) with APCA targets baked in (step 11 = Lc 60, step 12 = Lc 90 on step 2). Material 3 uses HCT tonal palettes (tones 0-100) generated from a seed via `material-color-utilities`. Leonardo (Adobe) inverts the problem: you specify target contrast ratios and it solves for colors; supports CAM02, OKLAB, OKLCH.

**Tools.**
- Leonardo: https://leonardocolor.io / https://github.com/adobe/leonardo (contrast-first generation, theme-level, JS API)
- Huetone: https://huetone.ardov.me / https://github.com/ardov/huetone (OKLCH/LCH grid editor with WCAG + APCA)
- Accessible Palette: https://accessiblepalette.com (APCA-based ramp editor)
- Radix Colors custom palette: https://www.radix-ui.com/colors/custom (closed-source generator behind the 12-step method)
- Atmos: https://atmos.style/playground
- Rampa Studio: https://github.com/basiclines/rampa-studio (CLI + SDK + web; 11 distribution curves, APCA report, CSS/JSON export)
- Ramps: https://www.ramps.studio (ramps + matched neutral + status colors + semantic tokens; exports CSS/Tailwind/Figma variables/JSON)
- oklchcolorpalettegenerator.com (sRGB/P3 gamut check, WCAG+APCA, DTCG export)
- Figma plugins: OKLCH Color Ramp, AVA Palettes (bezier-sculpted curves)
- material-color-utilities: https://github.com/material-foundation/material-color-utilities
- Evil Martians OKLCH picker: https://oklch.com; culori / colorjs.io as libraries

**What is still manual/broken.**
- Every tool has its own curve; none lets you *import an existing brand palette*, fit a curve to it, and then extend it (add a new hue that matches the existing ramps' lightness/chroma profile). This is the most common real task: "give me a teal that sits in our existing scale."
- Gamut mapping (P3 vs sRGB) is handled inconsistently; chroma clipping vs reduction is a silent choice that changes hue at the ends.
- Ramps are generated per-hue; cross-hue consistency (same step = same L across hues, matched chroma) is usually a manual eyeball step.
- Role-based validation (Radix-style "step 9 must pass X on step 2") exists only inside Radix's own generator.
- Neutral ramps tinted with the brand hue (the "warm gray") are done by hand.

**Minimal tool.** `ramp fit palette.json` → infers the L/C curve from existing ramps; `ramp extend --hue 190` → emits a new ramp matching that curve; `ramp check --roles radix` → validates role-based contrast invariants across all hues. Output DTCG JSON + CSS.

---

## 2. Contrast: APCA vs WCAG 2

**State of the art.** WCAG 2.x AA remains the legal benchmark. APCA was removed from the WCAG 3 draft in July 2023 as "exploratory"; as of April 2026 the W3C position is still "the contrast algorithm used in WCAG 3 is yet to be determined" (Roselli). WCAG 3 Recommendation is projected ~2028-2030. Practical guidance: pick colors that satisfy *both* WCAG 2 and APCA (BridgePCA was built for exactly this), and document any deliberate WCAG 2 failures. Radix, Huetone, Accessible Palette, Rampa all ship APCA already.

**Tools.** apca-w3 (npm), bridge-pca, colorjs.io (`contrastAPCA`, `contrastWCAG21`), Huetone, Leonardo, Polypane, Figma plugins.

**Broken.** Dual-compliance checking is rare; tools pick one algorithm. Font-size/weight-dependent APCA thresholds (Lc 75 for body, Lc 60 for large, etc.) are rarely wired to the actual type scale tokens, so "this token pair is fine" is answered without knowing what text size it will carry.

**Minimal tool.** A contrast function that takes fg token, bg token, *and* the typography token (size/weight) and returns WCAG 2 pass/fail + APCA Lc vs the lookup-table threshold for that size. Both in one result.

---

## 3. Contrast matrices across all fg/bg token pairs

**State of the art.** N×N grids of raw hex values are common (Contrast Grid, Accessible Color Matrix, palette-contrast-checker clones). Build-time variants exist as Style Dictionary custom transforms that compute accessible text color per background (Always Twisted series, part 16).

**Tools.** https://contrast-grid.eightshapes.com (the original), https://www.usetools.design/tools/accessible-color-matrix, Style Dictionary + colorjs.io scripts, Leonardo's theme view.

**Broken.**
- Grids operate on raw colors, not *tokens with roles*. They test every pair, including pairs that never occur (border-on-border). Semantic structure (which tokens are text, which are surfaces) is not used to prune and prioritize.
- No multi-mode support: the matrix must be rerun per theme (light/dark/high-contrast/brand) and diffed by hand.
- Transparent tokens (alpha overlays, `color-mix`) are not composited onto their actual backgrounds before testing.
- Results are not diffable across versions, so a release cannot say "3 pairs regressed."

**Minimal tool.** `tokens contrast tokens.json --pairs text:surface,icon:surface --modes light,dark` → emits a pass/fail table (WCAG 2 + APCA), composites alpha, and exits non-zero on regressions against a committed baseline. CI-friendly.

---

## 4. Semantic token naming and aliasing

**State of the art.** Nathan Curtis's taxonomy (namespace / object / base: category-concept-property / modifier: variant-state-scale-mode) is the reference; Nate Baldwin's Intuit taxonomy and the Smashing "naming best practices" article are the other canonical sources. Three tiers (global/primitive → semantic/alias → component) is near-universal. Tokens Studio models this as *sets* (files) combined by *themes*; Figma Variables model it as *collections* with *modes*; Material 3 uses fixed *roles* (primary, on-primary, surface-container-high...). DTCG 2025.10 standardizes `$value`, `$type`, `$extensions`, alias syntax `{path.to.token}`, and a resolver spec for modes/themes is in progress.

**Tools.** Tokens Studio (https://tokens.studio), Style Dictionary v4/v5 (https://styledictionary.com), Terrazzo (https://terrazzo.app), Design Token Kit, Figma native DTCG export, Curtis's Figma file "Naming Tokens in Design Systems".

**Broken.**
- Naming is enforced by convention and code review, not by a schema. There is no widely-used linter that says "this token name violates the taxonomy" or "this semantic token aliases another semantic token two levels deep."
- Mapping between the three vocabularies (Tokens Studio sets/themes ↔ Figma collections/modes ↔ DTCG resolver) is hand-maintained and lossy.
- Alias graph problems (cycles, dangling refs, primitives referenced directly from components, unused primitives) are discovered late.

**Minimal tool.** `tokens lint` with a naming grammar (regex/segments per tier), alias-graph checks (depth, cycles, dangling, tier skipping), and an "unused/orphan" report. Plus a canonical converter between Tokens Studio `$themes.json`, Figma collections/modes, and DTCG resolver documents.

---

## 5. Type scales and fluid typography

**State of the art.** Utopia (https://utopia.fyi) is the reference for fluid type *and* space scales (min/max viewport, min/max base size, two ratios, `clamp()` output with CSS custom properties). Alternatives: fluid-type-scale.com, clampgenerator.com, tailwind-utopia plugin, Utopia Figma plugin. Modular scales (type-scale.com) remain the static baseline. Variable-font optical sizing (`font-optical-sizing`, `opsz` axis) is supported but rarely tokenized.

**Broken.**
- Line-height is still a table someone types by hand; no tool derives leading from size + measure + x-height, or enforces that line-box heights land on the spacing grid (4/8pt rhythm).
- Optical size, tracking (letter-spacing as a function of size), and weight-per-size are not part of any scale generator; they are per-font lookups done in Figma.
- Fluid scales produce unreadable `clamp()` CSS; there is no verification step that the resulting sizes stay within WCAG zoom/reflow expectations or that min size never exceeds max (a known Utopia footgun).
- Type tokens in DTCG (`typography` composite) don't carry fluid values; Figma Variables have no fluid concept at all, so design ↔ code diverge by construction.

**Minimal tool.** Scale generator that emits size + line-height + tracking + opsz as *composite* DTCG typography tokens, snaps line-height to a grid unit, and produces both the fluid CSS and a per-breakpoint static table (for Figma). Validates monotonicity and min<max.

---

## 6. Spacing and sizing scales

**State of the art.** 4pt base, 8pt rhythm is the de-facto standard (Material, Carbon, Fluent, Polaris). Two competing naming schemes: numeric (`space-4` = 16px, Tailwind style) vs t-shirt (`space-md`); Mark Dalgleish's gist on t-shirt sizing lays out the pain of inserting sizes. Utopia's space calculator does fluid spacing with *pairs* (`s-m`, `m-l`) for responsive gaps.

**Broken.**
- Inserting a step into a t-shirt scale is a breaking rename. Tooling for "rename `lg`→`xl` across tokens, Figma, and code" is nonexistent outside full IDE refactors.
- Sizing (component heights: 24/32/40/48) and spacing are often tokenized separately without a shared base, so control height minus padding doesn't land on the grid.
- Nothing validates that component specs (padding + line-height + border) sum to a grid-aligned height.

**Minimal tool.** Scale generator with pluggable progression (linear, 4pt, geometric, fibonacci) and a checker: given component padding/line-height/border tokens, assert the rendered box height lands on the base unit.

---

## 7. Elevation / shadow systems

**State of the art.** Material's umbra/penumbra/ambient 3-layer model; Atlassian and Fluent publish elevation tokens with explicit dark-mode surface-tint companions. Josh Comeau's layered shadow approach (same light source, scaled layers) is the popular web reference. Generators: boxshadowgen.com, peasydesign shadow system generator, shadows.brumm.af.

**Broken.**
- Shadow tokens in DTCG (`shadow` type, arrays for layers) exist but few generators emit them; most emit raw CSS.
- Dark mode needs a *different* mechanism (surface tint / lighter surface + low-alpha shadow). No tool derives a dark elevation set from a light one.
- Shadow color should be derived from the surface hue and the light color (tinted shadows) and that derivation is manual.

**Minimal tool.** Input: light direction, number of levels, base surface color, mode. Output: DTCG shadow tokens (layered) for light + dark (with surface-tint tokens for dark), plus a preview sheet.

---

## 8. Border radius systems

**State of the art.** Small/medium/large (+ full/pill) scales. Nested radius rule: inner = outer − padding. Figma has no built-in nested radius helper; Tailwind's scale is numeric.

**Broken.** Nested radius is computed by hand per component and drifts. Radius tokens don't encode their relationship to the spacing scale.

**Minimal tool.** Tiny: `radius nest --outer 16 --padding 4` and a lint rule that flags nested components whose inner radius ≠ outer − padding. Low value alone, but belongs in a "scale math" toolkit.

---

## 9. Motion tokens

**State of the art.** Material 3 (`md.sys.motion.duration.short1..extra-long4`, standard/emphasized easing, with accelerate/decelerate variants), Carbon (productive vs expressive, duration scaled by distance), Polaris, Fluent, eBay Evo. DTCG has `duration` and `cubicBezier` types. `prefers-reduced-motion` fallbacks are rarely tokenized.

**Broken.**
- Easing curves live as `cubic-bezier` strings in CSS but as keyframe/Easing enums in Figma/iOS/Android; cross-platform export is inconsistent.
- Duration-by-distance (Carbon) is a formula, not a token, so design tools can't use it.
- No lint that a component uses a motion token at all (hardcoded `200ms ease` is the norm).

**Minimal tool.** Emit a motion token set from two knobs (base duration, distance curve) in DTCG and platform outputs (CSS, Swift `UIView.animate` curves, Android interpolators, Framer/Figma spring approximations). Include reduced-motion variants.

---

## 10. Icon pipelines

**State of the art.** SVGO for optimization; SVGR (React), `@svgx`/unplugin-icons, Iconify for multi-framework; sprites (`<symbol>`/`<use>`) for large sets or no-JS. Consensus: components for <100 icons used in JS apps (tree-shaking, type-safe names), sprites for large sets or static sites. Icon fonts are legacy. Figma → repo export is usually a plugin or REST `images` endpoint plus a script.

**Tools.** https://github.com/svg/svgo, https://react-svgr.com, https://iconify.design, https://github.com/unplugin/unplugin-icons, svg-sprite, Figma REST `GET /v1/images`.

**Broken.**
- Normalization is the actual problem: consistent viewBox, stroke width, `currentColor`, no embedded fills, no transforms, centered on a 24-grid, no ids colliding in sprites. SVGO doesn't assert these; each team writes a bespoke checker.
- Figma export of stroke icons leaks `stroke-width` and `fill="none"` inconsistently; filled vs outlined pairs drift.
- Naming/deprecation/aliasing of icons across versions has no changelog tooling.

**Minimal tool.** `icons check` : a lint over an SVG directory (viewBox, grid alignment, currentColor, no hardcoded colors, path count budget, naming regex, duplicate detection by normalized path hash) + `icons build` producing sprite, React/Vue components, and an Iconify JSON set from one source.

---

## 11. Dark mode / theme derivation

**State of the art.** Same semantic names, different values per mode (Figma modes, Tokens Studio themes, DTCG resolver). Derivation rules are well known but informal: invert lightness order, reduce chroma on dark surfaces, lighten accents, use surface tint for elevation, avoid pure black. Material 3 does this algorithmically from tonal palettes (light uses tone 40 for primary, dark uses tone 80). Generators (Colorffy, AppForceStudio) do it from a few seed colors but produce their own palette, not yours.

**Broken.**
- Given a *finished* light semantic set, there is no tool that proposes a dark mapping by role (text.primary → ramp step 12 becomes step 1-ish) and validates contrast for both. Teams build dark mode by hand for every semantic token, then fix contrast failures one by one.
- High-contrast / forced-colors modes are almost never derived.

**Minimal tool.** `theme derive --from light --to dark tokens.json` using role + ramp-step inversion rules (Radix 12-step maps cleanly: step n ↔ step 13−n for surfaces, with accents held at 9-10), then run the contrast matrix on the result and list failures. Output a diff the designer reviews rather than a new palette.

---

## 12. Component API consistency and anatomy specs

**State of the art.** Nathan Curtis: "Crafting Component API, Together", "Component Specifications", and "Spec-Driven UI Component Development" (2025); his Anova plugin ("Analysis of Variants") exports a JSON/YAML model of every variant's composition and props. EightShapes Specs plugin auto-generates anatomy/spacing annotations in Figma. MUI's API design guide is the common code-side reference (`variant`, `size`, `color`, boolean props for states).

**Tools.** https://www.specsplugin.com, Anova (EightShapes), Storybook + react-docgen, Zeroheight/Supernova component docs.

**Broken.**
- Prop vocabularies drift across components (`size="sm"` vs `size="small"`, `isDisabled` vs `disabled`, `variant` vs `appearance`). No linter cross-checks prop names/enums across a library's components or against the Figma variant properties.
- Figma variant property names vs code prop names are mapped by hand in Code Connect; mismatches are silent.
- Variant matrices (size × variant × state) are enumerated manually; missing combinations are found in QA.

**Minimal tool.** `api lint`: extract props from TS types (or Storybook argTypes) and Figma component properties (REST), normalize, and report: inconsistent enum spellings, boolean naming inconsistencies, variant combinations present in one side but not the other. Feed Code Connect mapping from the result.

---

## 13. Token diffing, changelogs, versioning

**State of the art.** Semver rules are agreed (rename = major, add = minor, value change = patch-or-minor depending on policy). Adobe's Spectrum Design Data publishes a *semantic diff spec* (https://opensource.adobe.com/spectrum-design-data/spec/diff): six categories (renamed, deprecated, reverted, added, deleted, updated), rename detection by UUID → name → `replaced_by` link, deterministic sorted output. It's a spec; the page itself lists no CLI.

**Tools.** Spectrum diff spec; Tokens Studio's changelog/GitHub PR flow; Supernova/Zeroheight changelogs (SaaS); `git diff` on JSON (what most teams actually do).

**Broken.**
- Generic JSON diffs can't tell a rename from delete+add, can't tell a visual change from a no-op alias re-pointing, and can't compute *blast radius* (which semantic and component tokens resolve differently after a primitive changes).
- No "perceptual" diff: ΔE between old and new resolved values, so a changelog could say "primary-500 changed by ΔE 0.8 (imperceptible)" vs "ΔE 12 (visible)".
- Deprecation with `replaced_by` is not standard in DTCG (an `$extensions` convention at best), so codemods can't be generated.

**Minimal tool.** `tokens diff a.json b.json` → resolves aliases, classifies per Spectrum categories, computes ΔE for colors and % change for dimensions, lists affected downstream tokens, emits Markdown changelog + a semver recommendation + a codemod map (`old-name → new-name`) for renames.

---

## 14. Migration from ad-hoc CSS to tokens

**State of the art.** Project Wallace (https://www.projectwallace.com) analyzes CSS: unique colors, font-sizes, spacing values with frequency; `css-design-tokens` (https://github.com/projectwallace/css-design-tokens) emits DTCG JSON from raw CSS; `css-analyzer` is the engine. Stylelint plugins enforce token usage after migration: stylelint-design-tokens-plugin, Kong's stylelint plugin, Mozilla's `no-base-design-tokens`, Salesforce SLDS Linter `no-hardcoded-values-slds2`.

**Broken.**
- Extraction yields "47 shades of gray" but no *clustering*: nothing groups near-identical values (ΔE < 2, 15px vs 16px) into candidate tokens and proposes the canonical one.
- Extraction → proposed scale → codemod is three separate manual steps. No tool rewrites `color: #1a1a1b` to `var(--color-text-primary)` with a confidence score.
- Coverage metrics ("% of color declarations using tokens") are not standard output of any linter.
- JS-in-CSS, Tailwind arbitrary values (`bg-[#123456]`), and inline styles are mostly invisible to CSS-only analyzers.

**Minimal tool.** `css migrate`: parse CSS/Tailwind/CSS-in-JS, cluster values perceptually, propose a scale, map clusters to existing tokens if a token file is supplied, emit a codemod (with per-site confidence) and a coverage report. Coverage as a CI metric that must not regress.

---

## 15. Figma ↔ code sync

**State of the art.** Figma Variables REST API (read/write collections, modes, aliases, code syntax) is **Enterprise-only**, which blocks most teams; plugins (Tokens Studio, Tokens Brücke, Design Token Kit, Variables Import/Export) are the workaround. Figma now exports DTCG 2025.10 JSON natively. Code Connect maps components to code (manual mapping supported without GitHub) and feeds the Figma MCP server; MCP responses can exceed client token limits (25k) on complex pages. Nate Baldwin's article on syncing variables with tokens describes the known mismatches.

**Tools.** Figma Variables REST API, figma-variables-to-styledictionary (GitHub Actions), Tokens Studio, Tokens Brücke, Design Token Kit, Code Connect, Figma MCP server, Specify/Supernova (SaaS).

**Broken.**
- Representation mismatch: Figma has no fluid values, no composite typography token, no shadow-as-layers in variables (styles only), no `cubicBezier` type, 4 mode limit on lower plans, aliases only within/between collections in limited ways. Round-trips lose data.
- Code syntax on variables is per-platform and hand-typed; nothing generates it from the token naming grammar.
- Drift detection (Figma says X, repo says Y) is run ad hoc; no CI step compares and fails.

**Minimal tool.** `figma-tokens diff`: pull variables (API or plugin export), normalize to DTCG, diff against repo tokens using the semantic diff from §13, report drift and unsupported-type losses. Plus a generator for `codeSyntax` from a naming template.

---

## 16. Docs generation from tokens

**State of the art.** SaaS (Zeroheight, Supernova, Knapsack) render token tables from synced sources. OSS: Style Dictionary custom formats, `design-tokens-docs` (DTCG → HTML), Storybook token addons, Terrazzo. Most teams hand-write MDX tables that rot.

**Broken.**
- Docs show values but not *usage*: where a token is used in code, which components depend on it, which pairs pass contrast.
- Contrast, ΔE, and "this token is deprecated, use X" annotations are not derived automatically.
- Multi-mode previews (light/dark side by side) are rare in OSS outputs.

**Minimal tool.** Static site generator from DTCG: swatches per mode, resolved alias chains, contrast per role pair, usage counts from a codebase scan, deprecation notices, and a changelog from §13. Purely derived; zero hand-authored tables.

---

## Cross-cutting observations

1. **DTCG is now a workable interchange format** (2025.10, Figma native export, Style Dictionary/Terrazzo support), so a CLI can reasonably standardize on it as input/output.
2. **The under-tooled layer is validation, not generation.** Generators (ramps, shadows, type scales, clamp calculators) are plentiful. Checkers that take an *existing* token set and assert invariants (contrast by role, alias health, naming grammar, grid alignment, Figma/code drift, version diff) are scarce and mostly bespoke scripts.
3. **Role-awareness is the missing input.** Almost every tool works on raw values; the moment you feed it tokens *with roles* (text vs surface vs border, size/weight for type), you can prune, prioritize, and explain results.
4. **Figma's Enterprise-only Variables API** is the single biggest structural blocker to closed-loop automation; plugin-export-based workflows are the realistic path.
5. **APCA vs WCAG 2 is unresolved until ~2030**; tooling should compute both and let policy decide.

---

## Most underserved computable problems (ranked)

| # | Problem | Why it is underserved | Minimal tool |
|---|---------|----------------------|--------------|
| 1 | **Semantic token diff with rename detection, alias resolution, ΔE, blast radius, and codemod output** | Spectrum published the spec but no general CLI exists; everyone `git diff`s JSON. Every release and every Figma sync needs it. | `tokens diff a.json b.json` → changelog + semver + rename map |
| 2 | **Role-aware contrast matrix in CI (WCAG 2 + APCA, alpha compositing, multi-mode, baseline regression)** | Existing grids are raw-hex, single-mode, non-diffable; build-time scripts are bespoke. Directly gates accessibility. | `tokens contrast --pairs text:surface --modes light,dark` with non-zero exit on regression |
| 3 | **CSS → token migration with perceptual clustering and codemods + coverage metric** | Extraction exists (Project Wallace); clustering, mapping to an existing token set, and rewriting code do not. Largest time sink in adopting a system. | `css migrate` producing proposals + codemod + coverage % |
| 4 | **Token lint: naming grammar, alias-graph health (cycles, dangling, tier skipping), unused tokens** | Enforced only by review. Cheap to compute over DTCG, high payoff in large sets. | `tokens lint` |
| 5 | **Dark/high-contrast theme derivation from a finished light semantic set, with contrast validation and reviewable diff** | Generators make new palettes; nobody derives *your* dark mode from *your* light tokens by role. | `theme derive --from light --to dark` |
| 6 | **Fit-and-extend palettes: infer the L/C curve of an existing brand palette, add hues that match, validate role invariants across hues** | All ramp generators start from scratch with their own curve; "add a matching teal" is manual. | `ramp fit` / `ramp extend` / `ramp check --roles` |
| 7 | **Figma ↔ repo drift detection with loss reporting (unsupported types, mode limits)** | API is Enterprise-only and representations mismatch; drift is found by eye. Builds on #1. | `figma-tokens diff` |
| 8 | **Component API consistency lint across TS props, Storybook argTypes, and Figma variant properties** | Prop/enum spelling drift and variant-matrix gaps are discovered in QA; Code Connect mappings are hand-typed. | `api lint` |
| 9 | **Icon set linter/normalizer (viewBox, grid, currentColor, duplicate detection, naming) + one-source multi-target build** | SVGO optimizes but doesn't assert set-level invariants; every team rewrites this. | `icons check` / `icons build` |
| 10 | **Composite typography scale generator (size + line-height snapped to grid + tracking + opsz) emitting DTCG, fluid CSS, and static per-breakpoint tables** | Utopia solves size only; leading/tracking tables and Figma-compatible static outputs are still manual. | `type scale` |

Honorable mentions (real but lower leverage): layered shadow/elevation token generation with dark-mode surface tint (§7), grid-alignment checker for component box math (§6), motion token multi-platform export with reduced-motion variants (§9), derived docs site from tokens + usage scan (§16), nested radius math (§8).

---

## Sources

- OKLCH tools: https://github.com/basiclines/rampa-studio, https://www.ramps.studio/, https://atmos.style/playground, https://oklchcolorpalettegenerator.com/, https://oklch.fyi/
- Radix Colors: https://www.radix-ui.com/colors, https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale
- Leonardo: https://github.com/adobe/leonardo, https://leonardocolor.io/
- Huetone: https://github.com/ardov/huetone, https://huetone.ardov.me/
- Tailwind v4 OKLCH: https://github.com/tailwindlabs/tailwindcss/discussions/13628, https://evilmartians.com/chronicles/better-dynamic-themes-in-tailwind-with-oklch-color-magic
- Material color utilities: https://github.com/material-foundation/material-color-utilities/
- WCAG 3 contrast status: https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html, https://gist.github.com/Myndex/069a4079b0de2930e72d5401bde9af98
- Contrast matrices: https://www.alwaystwisted.com/articles/a-design-tokens-workflow-part-16, https://www.usetools.design/tools/accessible-color-matrix
- Token diff spec: https://opensource.adobe.com/spectrum-design-data/spec/diff
- Breaking changes: https://designtokens.substack.com/p/how-to-manage-breaking-changes-in, https://www.designsystemscollective.com/design-token-versioning-the-missing-manual-for-scaling-a-design-system-d650025a21d5
- Naming: https://www.smashingmagazine.com/2024/05/naming-best-practices/, https://www.alwaystwisted.com/articles/design-token-naming-conventions, https://docs.tokens.studio/manage-tokens/token-names/, https://www.figma.com/community/file/1096728307713953219/naming-tokens-in-design-systems
- Utopia: https://utopia.fyi/space/calculator/, https://utopia.fyi/clamp/calculator/, https://www.smashingmagazine.com/2021/04/designing-developing-fluid-type-space-scales/, https://github.com/cwsdigital/tailwind-utopia, https://www.fluid-type-scale.com/
- Spacing: https://gist.github.com/markdalgleish/c7c293dd5fe96620558e7b1d793ac07a, https://www.designsystems.com/space-grids-and-layouts/
- Elevation: https://atlassian.design/foundations/elevation, https://fluent2.microsoft.design/elevation
- Motion: https://m3.material.io/styles/motion/easing-and-duration/tokens-specs, https://carbondesignsystem.com/elements/motion/overview/
- Icons: https://www.svggenie.com/blog/svg-sprite-modern-guide, https://dev.to/simprl/a-comprehensive-comparison-of-svg-icon-management-options-in-react-js-projects-glc, https://varun.ca/react-icon-system/
- Dark mode: https://uxdesign.cc/dark-mode-with-design-tokens-8d7b9d9753a, https://muz.li/blog/dark-mode-design-systems-a-complete-guide-to-patterns-tokens-and-hierarchy/
- Component API/specs: https://medium.com/eightshapes-llc/crafting-ui-component-api-together-81946d140371, https://medium.com/@nathanacurtis/analysis-of-variants-9e440c30b93e, https://nathanacurtis.substack.com/p/spec-driven-ui-component-development, https://www.specsplugin.com/schema/, https://mui.com/material-ui/guides/api/
- CSS audit/migration: https://www.projectwallace.com/design-tokens, https://github.com/projectwallace/css-design-tokens, https://github.com/projectwallace/css-analyzer, https://github.com/LasaleFamine/stylelint-design-tokens-plugin, https://github.com/Kong/design-tokens/blob/main/stylelint-plugin/README.md, https://firefox-source-docs.mozilla.org/code-quality/lint/linters/stylelint-plugin-mozilla/rules/no-base-design-tokens.html
- Figma sync: https://medium.com/@NateBaldwin/synchronizing-figma-variables-with-design-tokens-3a6c6adbf7da, https://github.com/gerard-figma/figma-variables-to-styledictionary, https://forum.figma.com/t/whys-the-variables-api-only-available-on-enterprise-plans/51451, https://help.figma.com/hc/en-us/articles/23920389749655-Code-Connect
- Docs generation: https://github.com/Sidnioulz/design-tokens-docs, https://styledictionary.com/, https://terrazzo.app/docs/guides/dtcg/, https://design-token-kit.github.io/, https://www.designtokens.org/
