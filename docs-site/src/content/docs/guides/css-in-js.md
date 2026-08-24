---
title: CSS-in-JS
description: styled-components, emotion — static chunks checked, dynamics skipped.
sidebar: { order: 5 }
---

The eslint plugin understands the tagged-template and object forms the CSS-in-JS
ecosystem actually uses — the surface the incumbent linters explicitly declined to cover:

```tsx
const Button = styled.button`
  color: #1d4ed8;                  /* ✖ use var(--color-primary) — autofixes when exact */
  padding: ${(p) => p.pad}px;      /* skipped: interpolated, never guessed */
  gap: 14px;                       /* ⚠ use var(--spacing-3) (12px, Δ2px) */
  --arrow-size: 4px;               /* fine: template-local custom property */
`;

const boxStyles = css({ '&:hover': { color: '#1d4ed8' } });  // ✖ nested objects checked
<Box sx={{ padding: '14px' }} />                             // ⚠ sx props checked
```

Recognised tags: `styled.*`, `styled(Component)`, `css`, `keyframes`,
`createGlobalStyle`, `injectGlobal`. Findings carry exact editor positions inside the
template, and exact matches autofix in place.

**The rule of the house applies here too:** any declaration touched by an interpolation
is skipped entirely. dscheck reports what it can prove and stays silent otherwise.
