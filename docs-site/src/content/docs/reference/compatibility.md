---
title: Compatibility policy
description: Which host versions dscheck supports, and for how long.
---

| host | supported | primary (tested first) | floor policy |
|---|---|---|---|
| Node.js | ≥ 20.19 | current LTS | reviewed each April at the LTS transition; a floor bump is a **major** |
| ESLint | ≥ 9 (flat config only) | 10.x | the two newest majors |
| stylelint | ≥ 16 | 17.x | the two newest majors |
| Tailwind CSS | 4.x (`@theme`) | latest 4.x | engine features need the target repo's install ≥ 4.2; the **static path supports any 4.x** and never requires Tailwind at all |

Enforced in CI, not aspirational:

- the main matrix runs the newest majors on 3 OSes;
- an `oldest-peers` job pins eslint 9 / stylelint 16 / tailwind 4.2 — the floor can't rot silently;
- a weekly `tw-canary` job runs `tailwindcss@next` (allowed to fail — it's the early-warning line, see the upgrade playbooks in [RUNBOOK](https://github.com/oddurs/dscheck/blob/main/RUNBOOK.md));
- engine loss (no Tailwind, API change, worker failure) degrades to the static path, verified by a fallback-guarantee test: arbitrary values still checked, engine-only rules go **silent, never wrong**.
