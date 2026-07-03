# PAPER-006 — Library entry CRUD

**Domain:** paper  
**Status:** Partial — needs component + e2e  
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
- **Component (unit) — needed.** The library list/grid, shared/private filter, and edit form carry real client logic (view toggle + `localStorage`, filter state, edit-form validation/submit) that should be component-tested. Route request-schemas may add a small pure-unit test too.
- **e2e — needed.** Commit → browse (grid/list, shared/private filter) → edit → delete, with detail/list views reading from the library entry.

## Test commands
- **Unit:** _No unit test yet_ — run the lane with `npm test`; add `src/…/<name>.test.{ts,tsx}` (single file: `npx vitest run <path>`).
- **E2E:** _No e2e spec yet_ — run the lane with `npm run test:e2e`; add `e2e/<name>.spec.ts`.
