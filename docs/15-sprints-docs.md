# dscheck — Docs sprints: UI, engine, writing

*Status: plan v1, 2026-08-24. The docs site has a design system, brand, and typography
([14-brand-typography lives in /reference/brand](../docs-site/src/content/docs/reference/brand.md));
these sprints finish the surface (UI), the machinery (engine), and the words (writing).
Sequence P → Q → R; all ungated. The house doctrine extends to docs: **claims are
tested, silence is deliberate, and examples must actually run.***

## Sprint P — Docs UI — **DONE 2026-08-24** (playwright audit harness: 38 shots × 2 themes × 3 widths committed; caught Steps-counter collision + harness viewport bug; contrast proof 24/24; landing pitch; ergonomics/responsive/reduced-motion; pagefind on-system — search's top query lands the right rule page)

**Goal: every surface a reader touches looks intentional — not just the markdown well.**

| # | ticket | verify |
|---|---|---|
| P1 | **Full-surface audit**: walk every Starlight surface in both themes — search modal (pagefind), next/prev pagination, mobile nav + hamburger, tablet sidebar, banner, tabs/steps/badges/file-tree components, 404 — and bring each onto tokens (no default-theme leftovers) | screenshot pass of each surface, both themes, committed to `fixtures/docs-ui/` |
| P2 | **Landing page as the pitch**: demo GIF above the fold, the M1 numbers (19 → 0), a three-step "install → check → fix" strip, and one real finding rendered in the site's own aside style | landing communicates the product in <10 seconds of scanning |
| P3 | **Reading ergonomics**: heading anchor affordances, table horizontal-scroll containers on mobile, code-block copy button styling, `scroll-margin` under the sticky header, external-link indicators, skip-to-content visible on focus | keyboard-only walkthrough recorded in the audit |
| P4 | **Responsive type**: the roomy scale steps down gracefully at phone widths (media-query token remaps — deliberate steps, not fluid `clamp`, per the system's own doctrine) | phone-width screenshots in the audit pass |
| P5 | **Motion & preference respect**: `prefers-reduced-motion` guards on every transition; `prefers-contrast` spot-check; print stylesheet proofed on one long rule page | emulated-preference screenshots |
| P6 | **Contrast proof**: every fg/bg token pairing used by the site checked (WCAG AA at minimum) and recorded — the future `dscheck contrast` command's first manual dry-run | contrast table committed with the audit |

**Exit:** the committed audit shows every surface, both themes, three widths — all on-system (self-lint already enforces the CSS side).

## Sprint Q — Docs engine — **DONE 2026-08-24** (build-time link+anchor validation; llms.txt + llms-full.txt + 31 pages mirrored as .md for agents; tested-snippet gate over schema/CLI/rules; description enforcement + OG/social meta + lastUpdated + editLink; on-system 404; redirect map; weekly lychee)

**Goal: the machinery guarantees what the site promises — links resolve, agents can read it, metadata is right.**

| # | ticket | verify |
|---|---|---|
| Q1 | **Link integrity in CI**: internal links + anchors validated at build (starlight-links-validator or equivalent); external links checked weekly (lychee workflow, availability-style exit like the corpus) | a planted broken link fails the build |
| Q2 | **Agent-readable docs**: generated `llms.txt` + `llms-full.txt`, and every page served as plain `.md` alongside its HTML — dscheck's docs consumable by the agents it guards | `curl /llms.txt` and `curl /<page>.md` round-trip in a build test |
| Q3 | **Tested snippets**: extract fenced code blocks from the docs (config JSON, CLI invocations, eslint/stylelint configs) and verify them — configs parse against the real schema, CLI examples run against the demo project, findings shown match real output verbatim | snippet-test suite in CI; a doctored example fails |
| Q4 | **Metadata & sharing**: canonical URLs, per-page descriptions enforced (build fails on a missing one), OG/Twitter tags with the brand social image, correct `lastUpdated` from git, `editLink` to the repo | metadata assertions in the build test |
| Q5 | **Search tuning**: pagefind results styled on-system; rule pages boosted; verify the five likeliest queries ("unknown token", "baseline", "tailwind", "fix", "config") land right | recorded query → first-result table |
| Q6 | **404 + redirects**: a designed 404 (on-system, helpful links); redirect map started so future URL moves never break inbound links (durability doctrine applied to URLs) | 404 styled; redirect config in place with a test entry |

**Exit:** CI proves links, snippets, and metadata; agents can consume the whole site as text.

## Sprint R — Docs writing — **DONE 2026-08-24** (glossary; Why/Troubleshooting/honest-Comparisons pages; prose gates in CI — first run caught 3 violations incl. mine; rule-template conformance with docs-defaults==code-defaults; cold-reader dry-run caught a real API-convention bug: plugin.configs now attached per ecosystem convention)

**Goal: every page earns its read — plain voice, task-first, honest, and each claim backed by something that runs.**

| # | ticket | verify |
|---|---|---|
| R1 | **Editorial pass, every page**: one voice (plain, direct, no marketing adjectives), task-first openings (what you get, then how), consistent terminology per the glossary (R2); cut anything the reader can't act on | diff-reviewed page by page; before/after word counts recorded |
| R2 | **Glossary page**: token · system · mode · role · finding · verdict · baseline · surface · skip — one canonical definition each, linked on first use across the site | every term's first use on each page links here |
| R3 | **Rule-page template locked**: every rule page in the same order — what it flags, real output block, fixability, defaults, not-flagged list, when to disable — regenerated-checked against the actual rule metadata (defaults in docs must match code) | template conformance test: doc defaults == code defaults |
| R4 | **New pages that earn their place**: *Why dscheck* (the never-guess doctrine, the FP contract, the graveyard lesson), *Troubleshooting* (top failure modes: no findings?, engine inactive?, monorepo config), *Comparisons* (honest: vs declaration-strict-value, Tailwind's own lint, Terrazzo — when *they* are the right choice) | each page reviewed against the voice rules |
| R5 | **Getting-started friction pass**: a cold reader on a Tailwind repo reaches first real finding entirely from `/guides/eslint/` — every command copy-pasteable, every output shown verbatim from a real run (Q3 keeps them true) | timed dry-run ≤ 5 minutes, logged |
| R6 | **Prose gates**: spellcheck (cspell with a project dictionary) in CI; a light style lint (no "simply/easily/just", no exclamation marks in prose, lowercase "dscheck") — the brand's typographic rules, enforced like the visual ones | planted violations fail CI |

**Exit:** cold-reader dry-run passes; prose gates green; every rule page template-conformant.

---

## Sequencing & posture

```
P (surfaces) → Q (machinery) → R (words)
```

Q3 (tested snippets) before R (rewrites) so every rewritten example lands already-verified.
The pattern stays the project's own: audits become fixtures, promises become CI gates,
and the docs get the same guarantee as the linter — **if it drifts, the build fails.**
