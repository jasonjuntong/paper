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
- `src/app/api/papers/init/route.ts` — consumer; unchanged this pass (already wired the hash lookup + response shaping)
- `src/lib/paper-dedup.ts` — refactored (see Implementation notes)

## Implementation notes
- **Behavior-preserving refactor (no response change).** The in-library / in-org / none choice, previously inline inside `checkVisibility`, was extracted into a pure `decideVisibility(libraryEntryId, matchingOrgs)` so the precedence rule (in-library > in-org > none) is unit-testable without Firestore. `checkVisibility` still performs the reads (library query → `members` collection-group → per-org `sharedPapers`) and now delegates the verdict. The three return shapes were also named as an exported `Visibility` union.
- **Minor efficiency win.** A library hit now returns immediately and skips the `members` + `sharedPapers` lookups entirely; previously it fell through the same path. Same result — library already won by precedence.

## Test coverage
- **Unit — done.** The visibility decision was extracted into a pure `decideVisibility(libraryEntryId, matchingOrgs)` in `src/lib/paper-dedup.ts`; `src/lib/paper-dedup.test.ts` covers in-library / in-org / none and the in-library-beats-in-org precedence.
- **Integration — done.** `tests/integration/paper-dedup.test.ts` drives `checkVisibility` and `ensureLibraryEntry` against the Firestore emulator: the library query, the `members` collection-group lookup, and per-org `sharedPapers` reads (incl. not surfacing a non-member org), plus that a hit never creates a duplicate library entry (`ensureLibraryEntry` idempotency). Run via `npm run test:integration`.
- **e2e — N/A (documented).** The full add→re-upload loop can't be driven through the UI offline: the `commit` route needs a real Gemini embedding (the e2e uses a dummy `GEMINI_API_KEY`, so it 500s) and Cloud Storage (not booted in the `auth,firestore` emulator set). The hash→visibility→response wiring is covered by the pure unit + the emulator-backed integration lane instead.

## Test commands
- **Unit:** `npx vitest run src/lib/paper-dedup.test.ts` (`decideVisibility`)
- **E2E:** N/A — offline commit can't embed/store; covered by the integration lane instead.
- **Integration:** `npm run test:integration` (`tests/integration/paper-dedup.test.ts`)
