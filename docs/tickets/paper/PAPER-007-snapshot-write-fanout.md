# PAPER-007 — Write fan-out: library edit → org snapshots

**Domain:** paper  
**Status:** Todo — verify (likely missing)  
**Spec:** docs/specs/paper/paper.md#data-ownership-model  
**Depends on:** ORG-021

## Context
When a user edits their library entry, every org snapshot (`/orgs/{orgId}/sharedPapers/{paperId}`) created from that entry must be updated in the same write batch, so org members always see the sharer's latest version.

## Scope / Tasks
- On library-entry update, read the entry's `shares[]` and update each org's `sharedPapers/{paperId}` snapshot in the same batch.
- Snapshot carries the display fields (title, authors, year, keywords, synopsis).

## Acceptance criteria
- [ ] Editing a shared library entry updates all corresponding org snapshots atomically.
- [ ] Org members viewing the snapshot see the latest sharer values.
- [ ] Unshared (private) entries fan out to nothing.

## Affected files
- `src/app/api/papers/update/route.ts`
