---
title: no-unknown-class
description: Fabricated Tailwind utilities — the class-level typo catcher.
---

Engine-powered: when the linted repo has Tailwind installed, dscheck compiles each class
through Tailwind itself. A class that produces **no CSS** is fabricated — the class-level
version of a hallucinated token — and gets a did-you-mean from your theme:

```text
✖ Unknown class bg-brnad — did you mean bg-brand?
```

- **Requires:** Tailwind v4 installed in the linted project (otherwise the rule is silent —
  dscheck never guesses class validity from patterns alone).
- **Default severity:** error — like `no-unknown-token`, there is no legitimate steady state.
- **Not flagged:** anything when the engine is unavailable (the rule goes silent, never
  approximate), classes containing arbitrary values (those go to the value rules).
- Variants are preserved in suggestions (`md:bg-brnad` → `md:bg-brand`).
