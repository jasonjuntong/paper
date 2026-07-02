# PAPER-018 — Read tracking (lastOpenedAt)

**Domain:** paper  
**Status:** Partial — needs e2e (component test optional)  
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
- **e2e — needed (primary).** Opening a paper records `lastOpenedAt` and the paper then surfaces in "Continue reading" ordered by recency.
- **Component (unit) — light/optional.** The "Continue reading" surface has minor render logic (recency ordering, empty state) that a component test could cover; the ticket's substance is the `touch` route + timestamp, so this lane is optional here.
