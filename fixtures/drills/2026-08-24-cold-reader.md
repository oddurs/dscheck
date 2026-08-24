# Cold-reader dry-run (R5) — 2026-08-24

Protocol: follow `/guides/eslint/` verbatim on a fresh Tailwind repo; reach a first real
finding with no knowledge beyond the page.

| step | result |
|---|---|
| fresh repo: `@theme` css + one component (`style={{}}` + arbitrary class) | — |
| install per docs (workspace paths pre-publish; `pnpm add -D eslint-plugin-dscheck` at K1) | seconds |
| `eslint.config.js` copied verbatim from the guide | **caught a real bug**: docs used `dscheck.configs.recommended` (ecosystem convention) but the plugin only exported `configs` separately — code fixed to match convention |
| `pnpm exec eslint src` | ✔ 3 correct findings: exact-hit color, numeric-px style prop, arbitrary class — well under the 5-minute budget |

The dry-run exists to catch exactly the class of bug it caught.
