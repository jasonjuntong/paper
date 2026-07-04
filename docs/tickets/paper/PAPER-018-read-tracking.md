# PAPER-018 — Read tracking (lastOpenedAt)

**Domain:** paper  
**Status:** Done — e2e + component lanes green  
**Spec:** docs/specs/paper/paper.md#4-pdf-reader  
**Depends on:** PAPER-006

## Context
Track when a user last opened a paper to power a "Continue reading" surface.

## Scope / Tasks
- Update `lastOpenedAt` on the library entry when the paper is opened.
- Surface recently-opened papers ("Continue reading").

## Acceptance criteria
- [x] Opening a paper records `lastOpenedAt`.
- [x] Recently-opened papers can be listed by recency.

## Affected files
- `src/app/api/papers/touch/route.ts`

## Test coverage
- **e2e — done (primary).** `e2e/read-tracking.spec.ts`: seeds an entry (no `lastOpenedAt`), asserts the "Continue reading" empty state, opens the paper (waits on `POST /api/papers/touch`), then asserts the paper surfaces; a second test opens two papers and asserts newest-first ordering, then re-opens the older one and asserts it moves to the top (recency, not seed order).
- **Component (unit) — done.** `src/components/continue-reading.test.tsx`: empty-state branch, `href` points to the `paperId` route (row keyed by `entryId`), and keyword normalization (lowercased, hyphenated pills). Ordering is the query's job, so it's exercised in e2e, not here.

## Test commands
- **Unit:** `npm test` (single file: `npx vitest run src/components/continue-reading.test.tsx`).
- **E2E:** `npm run test:e2e` (single file: append `read-tracking` to the Playwright invocation).
