# False-positive regression corpus

Every false positive dscheck has ever produced becomes a named fixture here — a minimal
token source + code sample + the assertion that it stays silent. The suite only grows.

Naming: `NNN-short-description/` with `tokens.css` (or `.json`), the offending source
file, and an entry in `fp.test.ts`. Corpus audits, dogfooding, and user reports all feed
this directory; the FP issue template asks for exactly these pieces.

Seeded from pre-1.0 development: the FPs found (and fixed) before this suite existed are
recorded as cases 001–004.
