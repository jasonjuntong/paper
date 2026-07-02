# PAPER-015 — publicOrgIds denormalized flag

**Domain:** paper  
**Status:** Todo  
**Spec:** docs/specs/paper/paper.md#identifying-the-public-org-pool-denormalized-flag  
**Depends on:** PAPER-006

## Context
`publicOrgIds: string[]` on `/papers/{paperId}` is the set of public orgs a paper is currently shared to — the only "public" signal on a paper. Non-empty ⇒ in the discoverable/searchable list pool. It's a query-acceleration index (pre-filter for `findNearest()`), never an access grant. A set (not a boolean) because removal must know whether any other public org still keeps the paper in the pool, and it renders "Join to read" badges.

## Scope / Tasks
- Initialize `publicOrgIds: []` at global-paper creation.
- Maintenance hooks (wired by the writers): **share to public org O** → add O; **unshare from public org O** (explicit / leave / kick / entry delete) → remove O only if no other library entry still shares the paper to O; **org O visibility toggle** → fan out add/remove across O's sharedPapers.

## Acceptance criteria
- [ ] New global papers start with `publicOrgIds: []`.
- [ ] Add/remove logic is correct for the last-sharer condition (never drifts).
- [ ] A stale flag never widens content access — only which papers appear in a list.
- [ ] Consumed by similarity search (PAPER-011) and discovery (PAPER-014).

## Affected files
- `src/app/api/papers/commit/route.ts` (init field)
- share/unshare paths (ORG-021/ORG-022), visibility toggle (ORG-003), delete (PAPER-016)
