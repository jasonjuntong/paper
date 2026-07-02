# PAPER-006 — Library entry CRUD

**Domain:** paper
**Status:** Partial — needs e2e (unit N/A)
**Spec:** docs/specs/paper/paper.md#data-ownership-model
**Depends on:** PAPER-003, PAPER-004

## Context
The library entry (`/users/{uid}/library/{entryId}`) holds the user's confirmed copy of paper details and is the source of truth for all user-facing display. Created at commit; editable and deletable by the owner.

## Scope / Tasks
- Create entry at commit: `{ paperId, title, authors, year, keywords, synopsis, userId, shares: [], createdAt }`.
- Edit confirmed fields; delete entry (deletion + GC detailed in PAPER-016).
- Library browse (grid/list, shared/private filter) and paper detail page.

## Acceptance criteria
- [ ] Entry created with the user's confirmed fields and an empty `shares`.
- [ ] Owner can edit and delete their entry.
- [ ] Detail/list views read from the library entry.

## Affected files
- `src/app/api/papers/commit/route.ts`
- `src/app/api/papers/update/route.ts`
- `src/app/api/papers/delete/route.ts`
- `src/app/(app)/library/` and `src/app/(app)/library/[paperId]/page.tsx`

## Test coverage
- **e2e — needed.** Commit → browse (grid/list, shared/private filter) → edit → delete, with detail/list views reading from the library entry.
- **Unit — not required (optional).** CRUD is Firestore I/O; the only pure surface is the thin route request-schemas, not worth an isolated unit lane. Covered adequately by the e2e/route path.
