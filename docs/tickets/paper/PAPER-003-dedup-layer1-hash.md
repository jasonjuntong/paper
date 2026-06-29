# PAPER-003 — Layer 1 dedup (hash) + visibility responses

**Domain:** paper
**Status:** Done
**Spec:** docs/specs/paper/paper.md#2-deduplication-strategy
**Depends on:** PAPER-001

## Context
At `init`, the file hash is checked against `/papers`. On a hit, the server responds based on whether the matching paper is already visible to the uploader: in-library (card), in-org (card with org badges), or silent (normal flow continues).

## Scope / Tasks
- Compare SHA-256 against existing global papers.
- On hit, check visibility: user's library → `in-library`; user's member orgs → `in-org` (with orgs); else silent → return `extractedMetadata` draft + `existingPaperId`.
- In-library card ("View paper", no re-add). In-org card ("View paper" / "Proceed anyway").

## Acceptance criteria
- [ ] Byte-identical re-uploads are detected pre-processing.
- [ ] Response matches visibility: in-library / in-org cards, or silent continuation.
- [ ] No duplicate library entry is ever created for a paper the user already owns.

## Affected files
- `src/app/api/papers/init/route.ts`
- `src/lib/paper-dedup.ts`
