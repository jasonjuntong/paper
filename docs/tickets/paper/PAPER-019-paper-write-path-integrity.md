# PAPER-019 — Paper write-path integrity + dedup robustness

**Domain:** paper  
**Status:** Todo — **should-fix** (INFRA-002 Round 1, paper lane)  
**Spec:** docs/specs/paper/paper.md#2-deduplication-strategy · #data-ownership-model  
**Depends on:** [PAPER-003](PAPER-003-dedup-layer1-hash.md), [PAPER-006](PAPER-006-library-entry-crud.md)

## Context
INFRA-002 Round 1 found several integrity gaps and small smells in the paper write paths
(`commit`, `paper-dedup`, `update`). None is exploited by the happy path, but each can drop or
corrupt data under concurrency or a bad upstream response.

## Scope / Tasks
**Integrity (should-fix):**
1. **Validate `hash`** (`src/app/api/papers/commit/route.ts:66`). `hash` is read from
   `formData` *outside* `CommitSchema` and stored as `hash ?? ''`; a missing hash silently
   persists an empty Layer-1 dedup key, defeating hash dedup for that paper. Move `hash` into
   the Zod schema (required, non-empty) for the new-paper branch and `400` if absent.
2. **Make `ensureLibraryEntry` transactional** (`src/lib/paper-dedup.ts:85-108`). It does a
   `.where(paperId).limit(1).get()` then a separate `.set()`; two concurrent commits of the
   same `paperId` can both see empty and create **duplicate library entries** (spec: "no
   duplicate library entries"). Wrap the check-then-create in `runTransaction`.
3. **Zod-validate the Groq extraction output** (`src/lib/groq.ts:27-34`). The model response is
   `JSON.parse`'d and read with `json.x ?? ''` — no schema. `tech-stack.md §Zod` explicitly
   mandates the `llama-3.3-70b-versatile` output be "validated against a Zod schema
   (`title`, `authors`, `year`, `keywords`, `synopsis`) before being treated as a usable draft."
   Parse `raw` through a Zod schema (coerce/repair to the draft shape; on failure fall back to
   the empty/partial draft the manual form already expects). *(Found in INFRA-002 R1 tech-stack
   conformance pass.)*

**Robustness (nice-to-have):**
3. **Verify embedding dimensionality** (`commit/route.ts:93`). Length is only checked `=== 0`;
   assert `=== 768` before `FieldValue.vector(...)` so a wrong-dim Gemini response can't be
   written (it would later break the 768-dim vector index / `findNearest`).
4. **Resilient shared-paper fan-out** (`src/app/api/papers/update/route.ts:56`).
   `batch.update` on a `sharedPapers/{paperId}` doc that may not exist throws and fails the
   whole batch; use `set(..., { merge: true })`. Dormant until ORG-021 but latent once sharing
   lands.

**Cleanup (nice-to-have, judgement calls):**
5. Extract the duplicated `ExistingPaperInfo` mapping (init + commit) and the duplicated
   library-entry doc shape (commit + `ensureLibraryEntry`) into one helper.
6. Replace fragile `d.ref.path.split('/')[1]` (`paper-dedup.ts:33`) with
   `d.ref.parent.parent?.id`.

## Acceptance criteria
- [ ] Commit with a missing/empty `hash` on the new-paper path → `400`, nothing written.
- [ ] Concurrent commits of the same `paperId` for one user produce exactly one library entry.
- [ ] Groq extraction output is parsed through a Zod schema; a malformed response degrades to
      the manual draft form instead of propagating unchecked fields.
- [ ] A non-768-length embedding is rejected before any write.
- [ ] Update tolerates an absent `sharedPapers` doc without failing the library-entry update.
- [ ] Behavior otherwise unchanged; existing paper tests green.

## Affected files
- `src/app/api/papers/commit/route.ts`
- `src/lib/paper-dedup.ts`
- `src/lib/groq.ts`
- `src/app/api/papers/update/route.ts`
- (`src/app/api/papers/init/route.ts` — shared mapping helper)

## Test coverage
- **Unit — primary.** Route/logic tests for: hash validation (`400`), embedding-dim guard,
  and the transactional `ensureLibraryEntry` (mock a racing read). Extend
  `src/lib/paper-dedup.test.ts` / commit route test.
- **Integration.** In `tests/integration/paper-dedup.test.ts`, assert no duplicate library
  entry results from a repeated commit against the emulator.
- e2e N/A — concurrency/dim faults aren't reachable through the offline UI flow.
