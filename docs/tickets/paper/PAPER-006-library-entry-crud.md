# PAPER-006 — Library entry CRUD

**Domain:** paper  
**Status:** Done  
**Spec:** docs/specs/paper/paper.md#data-ownership-model  
**Depends on:** PAPER-003, PAPER-004

## Context
The library entry (`/users/{uid}/library/{entryId}`) holds the user's confirmed copy of paper details and is the source of truth for all user-facing display. Created at commit; editable and deletable by the owner.

## Scope / Tasks
- Create entry at commit: `{ paperId, title, authors, year, keywords, synopsis, userId, shares: [], createdAt }`.
- Edit confirmed fields; delete entry (deletion + GC detailed in PAPER-016).
- Library browse (grid/list, shared/private filter) and paper detail page.

## Acceptance criteria
- [x] Entry created with the user's confirmed fields and an empty `shares`.
- [x] Owner can edit and delete their entry.
- [x] Detail/list views read from the library entry.

## Affected files
- `src/app/api/papers/commit/route.ts`
- `src/app/api/papers/update/route.ts`
- `src/app/api/papers/delete/route.ts`
- `src/app/(app)/library/` and `src/app/(app)/library/[paperId]/page.tsx`

## Test coverage
- **Component (unit) — done.** Three specs cover the real client logic:
  - `src/app/(app)/library/_components/library-client.test.tsx` — shared/private filter (rows + tab counts) and the list/grid view toggle persisted to `localStorage`.
  - `src/app/(app)/library/[paperId]/_components/edit-paper-dialog.test.tsx` — Zod validation gating, the `POST /api/papers/update` request shape, error-clear-on-change, and the success transition.
  - `src/app/(app)/library/[paperId]/_components/delete-paper-dialog.test.tsx` — the `confirm → deleting → done` machine, the `POST /api/papers/delete` request, and rewind-to-confirm on failure.
- **e2e — done.** `e2e/library-crud.spec.ts` seeds entries directly into the emulator (commit can't run offline — it needs Gemini embeddings + Cloud Storage) via `seedLibraryEntry`/`getUidByEmail` helpers, then drives browse (filters + view toggle) → detail → edit → delete, with the detail/list views reading straight from the library entry.

## Test commands
- **Unit:** `npm test` (single file: `npx vitest run "src/app/(app)/library/_components/library-client.test.tsx"`).
- **E2E:** `npm run test:e2e` (single spec: `firebase emulators:exec --project demo-paper --only auth,firestore 'npx playwright test library-crud'`).
