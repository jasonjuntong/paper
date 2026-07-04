# ORG-024 — paperCount counter maintenance

**Domain:** org  
**Status:** Todo  
**Spec:** docs/specs/org/org-papers-permissions.md#papers--orgs  
**Depends on:** ORG-001

## Context
Every org doc carries an atomic `paperCount` — the number of distinct papers shared to it (size of `sharedPapers`) — so Discover and profile surfaces read one field instead of counting the subcollection. Applies to all orgs, public and private.

## Scope / Tasks
- Add `paperCount` to the org doc (default 0).
- Bump in the **same write** as the `sharedPapers/{paperId}` change: **+1** when a paper's snapshot is newly created; **−1** when removed because no other member still shares that paper to the org.
- Keyed by `paperId`: a second member sharing the same paper does not increment; the decrement fires only on the last sharer's unshare. Maintained by all auto-unshare paths too.

## Acceptance criteria
- [ ] Org doc has an atomic `paperCount`, maintained in the same write as snapshot create/remove.
- [ ] +1 only on first snapshot creation; −1 only when the last sharer unshares.
- [ ] Correct for all share/unshare/leave/kick/delete paths, public and private orgs.

## Affected files
- share (ORG-021), unshare (ORG-022), delete (PAPER-016) write paths

## Test commands
- **Unit:** _No unit test yet._
  - Lane: `npm test`
  - Single file: `npx vitest run <path>` (add `src/…/<name>.test.{ts,tsx}`)
- **E2E:** _No e2e spec yet._
  - Lane: `npm run test:e2e`
  - Single file: `firebase emulators:exec --project demo-paper --only auth,firestore 'npx playwright test <name>'` (add `e2e/<name>.spec.ts`)
