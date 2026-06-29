# PAPER-018 — Read tracking (lastOpenedAt)

**Domain:** paper
**Status:** Done
**Spec:** docs/specs/paper/paper.md#4-pdf-reader
**Depends on:** PAPER-006

## Context
Track when a user last opened a paper to power a "Continue reading" surface.

## Scope / Tasks
- Update `lastOpenedAt` on the library entry when the paper is opened.
- Surface recently-opened papers ("Continue reading").

## Acceptance criteria
- [ ] Opening a paper records `lastOpenedAt`.
- [ ] Recently-opened papers can be listed by recency.

## Affected files
- `src/app/api/papers/touch/route.ts`
