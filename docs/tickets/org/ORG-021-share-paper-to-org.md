# ORG-021 — Share paper to org(s)

**Domain:** org  
**Status:** Todo  
**Spec:** docs/specs/org/org-papers-permissions.md#sharing  
**Depends on:** PAPER-010, PAPER-015, ORG-024

## Context
A paper owner can share a library entry to one or more orgs they're a current member of. Sharing writes a snapshot of the entry's details to `/orgs/{orgId}/sharedPapers/{paperId}` and maintains the org's `paperCount` and the paper's `publicOrgIds`. The library entry stays owned by the user. This unblocks org-member reading, discovery, and the public search pool.

## Scope / Tasks
- Share UI: select orgs the user is a member of (not a generic "make public").
- On share: add `orgId` to the entry's `shares[]`; create `sharedPapers/{paperId}` snapshot (title, authors, year, keywords, synopsis); **+1 paperCount** only if newly created (ORG-024); if the org is public, add it to `publicOrgIds` (PAPER-015).
- Second member sharing the same paper does not duplicate the snapshot or increment the counter.

## Acceptance criteria
- [ ] Only the owner can share, and only to orgs they're currently a member of.
- [ ] Sharing writes the org snapshot and records the org in the entry's `shares[]`.
- [ ] `paperCount` increments only on first creation of the `sharedPapers` doc; public orgs get the paper added to `publicOrgIds`.
- [ ] All org members then see the paper via the snapshot.

## Affected files
- `src/app/api/orgs/[orgId]/papers/route.ts` or `src/app/api/papers/share/route.ts` (new)
- ORG-024, PAPER-015

## Test commands
- **Unit:** _No unit test yet_ — run the lane with `npm test`; add `src/…/<name>.test.{ts,tsx}` (single file: `npx vitest run <path>`).
- **E2E:** _No e2e spec yet_ — run the lane with `npm run test:e2e`; add `e2e/<name>.spec.ts`.
