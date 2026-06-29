# PAPER-005 — Embedding generation (gemini-embedding-2, 768d)

**Domain:** paper
**Status:** Done
**Spec:** docs/specs/paper/paper.md#5-similarity-search-ideaproposal-verification
**Depends on:** PAPER-001

## Context
A 768-dim embedding is generated from the paper's `extractedMetadata.title + synopsis + keywords` (Groq raw output, never user edits) at commit time and stored once on the global paper, reused by all library entries that reference it. Powers Layer 2 dedup and similarity search.

## Scope / Tasks
- `gemini-embedding-2` via `@google/genai`, `outputDimensionality: 768`.
- Generate at commit only (after user confirms); store as `VectorValue(768)` in `embedding` on `/papers/{paperId}`.

## Acceptance criteria
- [ ] Embedding input is always `extractedMetadata` (raw), not the user's edited copy.
- [ ] Stored once per global paper as a 768-dim VectorValue; reused across referencing entries.
- [ ] No embedding call if the user cancels before commit.

## Affected files
- `src/lib/gemini.ts`
- `src/app/api/papers/commit/route.ts`
