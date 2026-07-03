# PAPER-005 — Embedding generation (gemini-embedding-2, 768d)

**Domain:** paper  
**Status:** Done — unit lane green (`gemini.test.ts`); e2e N/A — external provider  
**Spec:** docs/specs/paper/paper.md#5-similarity-search-ideaproposal-verification  
**Depends on:** PAPER-001

## Context
A 768-dim embedding is generated from the paper's `extractedMetadata.title + synopsis + keywords` (Groq raw output, never user edits) at commit time and stored once on the global paper, reused by all library entries that reference it. Powers Layer 2 dedup and similarity search.

## Scope / Tasks
- `gemini-embedding-2` via `@google/genai`, `outputDimensionality: 768`.
- Generate at commit only (after user confirms); store as `VectorValue(768)` in `embedding` on `/papers/{paperId}`.

## Acceptance criteria
- [x] Embedding input is always `extractedMetadata` (raw), not the user's edited copy.
- [x] Stored once per global paper as a 768-dim VectorValue; reused across referencing entries.
- [x] No embedding call if the user cancels before commit.

## Affected files
- `src/lib/gemini.ts`
- `src/app/api/papers/commit/route.ts`

## Test coverage
- **Unit — done (`src/lib/gemini.test.ts`).** The input assembly was extracted to a pure `buildPaperEmbeddingInput` (behavior-preserving; the commit route now calls it) so the raw-metadata title+synopsis+keywords ordering is unit-pinned. `generatePaperEmbedding` is tested with `@google/genai` stubbed: it sends the spec contract (`gemini-embedding-2`, `outputDimensionality: 768`), returns the values array, and swallows a missing embedding or a thrown SDK error into `[]` (which the route turns into a 500). The "stored once, reused" property is structural — the embedding lives on `/papers/{paperId}` and library entries hold only `paperId` — not a pure-unit assertion.
- **e2e — not required.** `gemini-embedding-2` is an external, non-emulated service, so a browser e2e can't exercise it hermetically; its user-visible effect is gated behind commit (covered by PAPER-006). The provider call belongs in a stubbed unit/integration test, not e2e.
