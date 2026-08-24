---
title: Brand
description: Typography only — the brand is a set of typesetting rules, not artwork.
---

dscheck has no logo. The brand is typographic, which for a linter is the honest choice:
**a set of rules you can check**, not artwork you have to ship. It costs zero bytes —
it's a font *stack*, never a font file — and it renders everywhere a terminal does.

## The name

Always lowercase: **dscheck**. Never Dscheck, DSCheck, or DS-Check — including at the
start of a sentence. (Code identifiers follow code conventions: `DscheckConfig` is
correct TypeScript, not a brand violation.)

## The wordmark

The wordmark is the name, set like a heading — one rule, reproducible anywhere,
entirely inside the style system:

> system sans (`--font-sans`) · semibold (`--font-weight-semibold`) · lowercase ·
> tracking `--tracking-tight` · ink (`--color-ink`)

No ornament. If it can't be typed, it isn't part of the wordmark.

## The marks

The product's three verdicts are the brand's only color, always in their token:

| mark | meaning | token |
|---|---|---|
| ✔ | on-system | `--color-success` |
| ⚠ | needs judgment | `--color-warning` |
| ✖ | off-system | `--color-danger` |

Never decorate with them — a mark appears only where its meaning applies.

## Voice in type

- Prose is the system sans at the roomy scale; the mono stack is reserved for the
  wordmark, code, tokens, and verdicts — when it appears, it means *machine-checked*.
- Findings are quoted verbatim, in mono, marks included:
  `✖ Raw color #2a2520 — use var(--color-cedar-700)`.
- Numbers in tables use the same mono stack.

## The wordmark as a file

For places that need a file, the wordmark ships as **typographic SVG** — real text in
the system sans, at the face's natural width, never stretched or outlined. It weighs
under a kilobyte and always matches the reader's platform (minor per-platform width
variance is accepted — that's what typographic-only means):

- [`wordmark-light.svg`](https://github.com/oddurs/dscheck/blob/main/assets/brand/wordmark-light.svg) · [`wordmark-dark.svg`](https://github.com/oddurs/dscheck/blob/main/assets/brand/wordmark-dark.svg)
- The docs header uses exactly these files (Starlight `logo`, light/dark variants).

## Typefaces

System faces only, always with deep fallbacks — the brand is the *stack*, never a file:

- **Sans** (`--font-sans`): `ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif` — all prose.
- **Mono** (`--font-mono`): `ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, 'Liberation Mono', 'Courier New', monospace` — wordmark, code, tokens, verdicts.

Zero font payload, zero external hosts, renders identically well offline.

## Favicon & social

The favicon is the ✓ glyph typeset on the primary — still typography
([favicon.svg](/favicon.svg)). Social images are rendered terminal frames (from a
committed [vhs](https://github.com/charmbracelet/vhs) tape in `assets/brand/`), because
the terminal *is* the brand surface.

## The enforcement clause

Every rule above resolves to tokens in [this site's design system](https://github.com/oddurs/dscheck/blob/main/docs-site/src/styles/tokens.css),
and dscheck lints this site in CI — the brand is under the same guarantee as everything
else here: if it drifts, the build fails.
