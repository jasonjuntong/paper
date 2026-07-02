# PAPER-016 — Paper deletion + global-paper lazy GC

**Domain:** paper
**Status:** Partial — verify orphan check + collection-group index
**Spec:** docs/specs/paper/paper.md#paper-deletion--global-paper-lifecycle
**Depends on:** ORG-022, PAPER-015, ORG-024, ORG-025

## Context
A global paper is shared infrastructure (many entries may reference it via dedup). It is deleted only when the **last** referencing library entry is gone. Deletion is one atomic batch plus a conditional orphan-check follow-up.

## Scope / Tasks
- Atomic batch on entry delete: delete the library entry; for each `orgId` in `shares[]` delete `/orgs/{orgId}/sharedPapers/{paperId}` (unshare) and maintain `publicOrgIds` (PAPER-015) + `paperCount` (ORG-024); decrement `keywordProfile` (PAPER-013).
- Orphan check: `collectionGroup('library').where('paperId','==',paperId).limit(1)` — if non-empty, stop; if empty, delete the Cloud Storage PDF and the global paper doc.
- Requires the `paperId` ASC collection-group index (ORG-025).

## Acceptance criteria
- [ ] Deleting an entry unshares it from all its orgs and updates publicOrgIds/paperCount/keywordProfile in the same batch.
- [x] Global paper + PDF are deleted only when no library entry anywhere references the paperId.
- [x] A paper still referenced by another user is never destroyed.
- [x] Collection-group index exists.

## Affected files
- `src/app/api/papers/delete/route.ts`
- `firestore.indexes.json`
