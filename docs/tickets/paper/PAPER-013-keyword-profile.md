# PAPER-013 — keywordProfile maintenance

**Domain:** paper
**Status:** Todo
**Spec:** docs/specs/paper/paper.md#7-keyword-preference-profile
**Depends on:** PAPER-006

## Context
A per-user weighted keyword map (`keywordProfile` on `/users/{uid}`) built from the user's library, powering Discover ranking (papers + orgs) via keyword overlap (no embeddings). Maintained atomically with library writes so it can never drift.

## Scope / Tasks
- On library-entry create: increment count for each confirmed keyword by 1.
- On library-entry delete (incl. account cascade, dedup/auto-cleanup): decrement each keyword by 1; drop keys at 0.
- Normalize keywords (trim + lowercase) as the map key; the user's confirmed `keywords` are the source (not raw extractedMetadata).
- Write in the **same atomic operation** as the entry create/delete.

## Acceptance criteria
- [ ] Adding a paper increments normalized keyword weights atomically with the entry create.
- [ ] Deleting a paper decrements and prunes zeros atomically with the entry delete.
- [ ] Keys are normalized (`"Machine Learning"` == `"machine learning"`).
- [ ] Profile is derived from confirmed keywords, never Groq raw output.

## Affected files
- `src/app/api/papers/commit/route.ts`
- `src/app/api/papers/delete/route.ts`
