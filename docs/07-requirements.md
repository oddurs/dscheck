# dscheck — Product requirements

*Status: draft v1, 2026-08-23. Name `dscheck` (renamed from working name "offsystem", user decision 2026-08-23) (per [06 §6](06-competitors-lint.md)); rename is free until first npm publish. Companion: [05-concept-lint.md](05-concept-lint.md) (concept), [08-roadmap.md](08-roadmap.md), [09-stack-infra.md](09-stack-infra.md).*

## Product definition

The linter that knows *your* design system. Reads the token source you already have (Tailwind v4 `@theme`, DTCG JSON, CSS custom props), flags every off-system value in code, and attaches the nearest on-system token — so agents self-correct and humans one-keystroke-fix. Positioned as **the guardrail for agent-written UI**; ordinary eslint/stylelint CI adoption comes along for free.

## Personas

- **P1 — Agent-driven builder** (primary; this is us): runs Claude Code/Cursor against a repo with a `@theme`. Wants the agent's output on-system without reviewing every diff. Touchpoint: hook + `--format agent`.
- **P2 — Lone DS maintainer**: 1–2 people, can't review every PR. Wants CI to say no and a debt number that goes down. Touchpoint: eslint/stylelint plugin + baseline + SARIF.
- **P3 — DS team at scale** (later): has an org plugin (or nothing), wants generic rules + their own token metadata. Touchpoint: config, roles, deprecation maps.

## Functional requirements

### FR1 — Allowed-set resolver (the core asset)
- **FR1.1** Sources, v1: Tailwind v4 `@theme` (from entry CSS, via Tailwind's own resolution when installed; static CSS parse as fallback), DTCG 2025.10 JSON (aliases resolved, cycles detected, modes flattened to a configurable default), plain `:root`/`@property` custom props from CSS files.
- **FR1.2** Multiple sources merge into one value index, keyed by category (color, length/space, radius, font-size, font-family, weight, line-height, shadow, z-index, duration/easing). Category inferred from DTCG `$type`, Tailwind namespace (`--color-*`, `--spacing-*`…), or CSS property context.
- **FR1.3** Deterministic and offline: no network at resolve or lint time, ever.
- **FR1.4** Cached by content hash of the token sources; resolve ≤ 200 ms warm, ≤ 2 s cold on a real project.
- **FR1.5** Roles (opt-in, P3): `$extensions.dscheck.roles` in DTCG / sidecar `roles.json` mapping token patterns → roles (`bg`, `fg`, `border`, …).

### FR2 — Rules
| id | rule | phase | default severity |
|---|---|---|---|
| R1 | `no-unknown-token` — `var(--x)` / token ref not in the set; Levenshtein suggestion for typos | MVP | error |
| R2 | `no-raw-color` — color literal where color tokens exist; ΔEOK nearest suggestions | MVP | error |
| R3 | `no-raw-length` — px/rem/em literal in spacing/size/radius props; exact or ±1 scale-step suggestions | MVP | warn |
| R4 | `no-arbitrary-class` — Tailwind `[…]` value with an on-theme equivalent; wraps Tailwind's own canonical-class machinery, never reimplements it | P2 | warn |
| R5 | `no-raw-font` (size/family/weight/line-height) | P2 | warn |
| R6 | `no-raw-shadow` | P2 | warn |
| R7 | `token-role` — valid token, wrong role for the property | P3 | warn |

Per-rule allow-lists (`allow: ["transparent", "currentColor", "0", "1px"]` ship as sane defaults — `0`, `auto`, `100%`, `currentColor`, `transparent`, `inherit` are never violations).

### FR3 — Surfaces
- **MVP:** CSS/SCSS declarations (stylelint host); JSX/TSX `style={{}}` objects and string literals in `className` for Tailwind (eslint host).
- **P2:** template-literal CSS (styled-components/emotion) via the eslint plugin — one flavor, chosen by dogfood repo; Vue/Svelte `<style>` via stylelint's customSyntax.
- **P3:** more CSS-in-JS flavors, HTML/Astro class attributes.
- Dynamic/computed values (`clsx(cond && …)`, interpolations we can't resolve) are **skipped silently, never guessed** — false positives are existential (06 §4.5).

### FR4 — Findings & suggestions
Every finding: file/line/col, rule, category, raw value, up-to-3 nearest tokens with distance (ΔEOK for color, step distance for scales, edit distance for names), fixable flag. Message fits in 2 lines. Suggestion thresholds configurable; defaults: color ΔEOK ≤ 0.02 → fixable, ≤ 0.1 → suggested; lengths exact → fixable.

### FR5 — Fix policy
Autofix **only** exact/threshold matches (via host fixers). Everything else is an editor/agent *suggestion* (eslint suggestions API), never applied blind. `14px` must not silently become `12px`.

### FR6 — Outputs
Host-native (eslint/stylelint formatters work as-is); plus CLI formats: `pretty`, `json`, `agent` (NDJSON, one finding per line, suggestion first), `sarif` (2.1.0 with stable `partialFingerprints` → GitHub "new findings only on PRs" for free), `rdjson` (reviewdog). Ship the missing **stylelint SARIF formatter** as a standalone by-product (06 whitespace #6).

### FR7 — Baseline / debt ratchet
In-host: rely on the hosts' converged suppressions files (ESLint ≥ 9.24, stylelint ≥ 16.25 — same per-file/per-rule count format). CLI adds what hosts lack: `dscheck baseline` (cross-surface count snapshot), `dscheck report` (debt + suppressions + arbitrary-value trend over git history — the number nobody else produces).

### FR8 — Config & zero-config
`dscheck.config.json` (single file, read by all adapters): `tokens`, `include`, `tolerance`, `roles`, per-rule severity/allow. Zero-config: detect `app.css` with `@theme`, `tokens.json`/`*.tokens.json`, or `:root` blocks and just work. Monorepo: config discovery walks up; nearest wins (per-package brands).

### FR9 — Agent integration
`--format agent`; shipped Claude Code `PostToolUse` hook snippet (lint the written file, feed findings back); Cursor hook recipe; `dscheck mcp` (P3) exposing `lint_file`, `query_tokens`, `nearest_token`.

## Non-functional requirements

- **N1 Performance:** eslint/stylelint rule overhead ≤ 15% vs baseline run; CLI cold lint of 1,000 files ≤ 5 s on an M-series laptop; resolver per FR1.4.
- **N2 False-positive budget:** < 5% FP rate on the corpus (09 §infra); any rule breaching it gets demoted to `warn` or off-by-default. Conservative beats complete.
- **N3 Compatibility:** Node ≥ 20.19; ESM-only; ESLint ≥ 9 flat config only; stylelint ≥ 16; Tailwind v4 only (v3 out of scope); DTCG 2025.10 (Tokens Studio dialect: import-convert, not native).
- **N4 Trust:** no telemetry, no network calls, MIT license, npm provenance on every publish.
- **N5 Determinism:** same input → same output; findings ordered stably (file, line, col).
- **N6 DX:** one plugin line + one config file to adopt; error messages name the token, the value, and the distance — nothing generic.

## Out of scope (v1, deliberate)

Figma anything (Enterprise-gated, lossy — 00 angles); token *generation* or docs sites; Tailwind v3; stylelint < 16 / eslint legacy config; a hosted dashboard or any server-side service (Specify/Backlight/Omlet died there — 06); component-level API linting; visual regression.

## Success metrics

- **M1 (the demo):** same repo + same agent task, hook on vs off → off-system values in the resulting diff: **0 vs N**, N ≥ 10. This is the launch asset.
- **M2 (adoption friction):** a stranger's Tailwind v4 repo goes from `npm i` to first real finding in < 5 minutes, no docs beyond the README.
- **M3 (quality):** corpus FP rate < 5%; zero "this linter is noisy" issues in the first month that aren't config errors.
- **M4 (traction, post-launch):** 500 GitHub stars or 5k weekly downloads within 3 months of launch; ≥ 3 external repos with dscheck in CI.
