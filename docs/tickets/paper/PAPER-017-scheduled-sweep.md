# PAPER-017 — Scheduled sweep (orphan backstop)

**Domain:** paper  
**Status:** Todo  
**Spec:** docs/specs/paper/paper.md#scheduled-sweep-safety-net  
**Depends on:** PAPER-016

## Context
Lazy GC (PAPER-016) handles the common path, but cleanup can be skipped (bulk account deletion, partial write failures, future bypass paths). A periodic background job is the backstop.

## Scope / Tasks
- Scheduled job scans `/papers`; for each, run the orphan check (`collectionGroup('library')` by `paperId`).
- Delete any global paper with zero referencing entries plus its Cloud Storage PDF.
- This is a backstop, not the primary mechanism.

## Acceptance criteria
- [ ] A scheduled job exists and runs periodically.
- [ ] It deletes only genuinely orphaned global papers and their PDFs.
- [ ] Does not touch papers still referenced by any library entry.

## Affected files
- scheduled function (e.g. Cloud Function / cron route) — new
- reuses orphan-check logic from PAPER-016

## Test commands
- **Unit:** _No unit test yet._
  - Lane: `npm test`
  - Single file: `npx vitest run <path>` (add `src/…/<name>.test.{ts,tsx}`)
- **E2E:** _No e2e spec yet._
  - Lane: `npm run test:e2e`
  - Single file: `firebase emulators:exec --project demo-paper --only auth,firestore 'npx playwright test <name>'` (add `e2e/<name>.spec.ts`)
