# PAPER-003 — Layer 1 dedup (hash) + visibility responses

**Domain:** paper  
**Status:** Done — unit (`decideVisibility`) + integration (`checkVisibility`/`ensureLibraryEntry`)  
**Spec:** docs/specs/paper/paper.md#2-deduplication-strategy  
**Depends on:** PAPER-001

## Context
At `init`, the file hash is checked against `/papers`. On a hit, the server responds based on whether the matching paper is already visible to the uploader: in-library (card), in-org (card with org badges), or silent (normal flow continues).

## Scope / Tasks
- Compare SHA-256 against existing global papers.
- On hit, check visibility: user's library → `in-library`; user's member orgs → `in-org` (with orgs); else silent → return `extractedMetadata` draft + `existingPaperId`.
- In-library card ("View paper", no re-add). In-org card ("View paper" / "Proceed anyway").

## Acceptance criteria
- [x] Byte-identical re-uploads are detected pre-processing.
- [x] Response matches visibility: in-library / in-org cards, or silent continuation.
- [x] No duplicate library entry is ever created for a paper the user already owns.

## Affected files
- `src/app/api/papers/init/route.ts`
- `src/lib/paper-dedup.ts`

## Test coverage
- **Unit — done.** The visibility decision was extracted into a pure `decideVisibility(libraryEntryId, matchingOrgs)` in `src/lib/paper-dedup.ts`; `src/lib/paper-dedup.test.ts` covers in-library / in-org / none and the in-library-beats-in-org precedence.
- **Integration — done.** `tests/integration/paper-dedup.test.ts` drives `checkVisibility` and `ensureLibraryEntry` against the Firestore emulator: the library query, the `members` collection-group lookup, and per-org `sharedPapers` reads (incl. not surfacing a non-member org), plus that a hit never creates a duplicate library entry (`ensureLibraryEntry` idempotency). Run via `npm run test:integration`.
- **e2e — N/A (documented).** The full add→re-upload loop can't be driven through the UI offline: the `commit` route needs a real Gemini embedding (the e2e uses a dummy `GEMINI_API_KEY`, so it 500s) and Cloud Storage (not booted in the `auth,firestore` emulator set). The hash→visibility→response wiring is covered by the pure unit + the emulator-backed integration lane instead.
