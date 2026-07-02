# ORG-022 — Unshare paper from org

**Domain:** org  
**Status:** Todo  
**Spec:** docs/specs/org/org-papers-permissions.md#auto-unshare-on-membership-change  
**Depends on:** ORG-021

## Context
The owner can unshare a paper from an org; the same logic runs automatically on leave/kick (ORG-008/009) and entry delete (PAPER-016). Removing the share deletes the org snapshot and maintains `paperCount` and `publicOrgIds` on the last-sharer condition.

## Scope / Tasks
- Owner unshare action; reusable internal helper for auto-unshare paths.
- On unshare: remove `orgId` from the entry's `shares[]`; if no other library entry still shares this paper to the org, delete `sharedPapers/{paperId}`, **−1 paperCount** (ORG-024), and (if public) remove the org from `publicOrgIds` (PAPER-015).

## Acceptance criteria
- [ ] Owner can unshare; the helper is reused by leave/kick/delete.
- [ ] Snapshot is deleted only when the **last** sharer unshares; counter/flag decremented under the same condition.
- [ ] Org members lose access immediately (re-derived per request).

## Affected files
- `src/app/api/papers/unshare/route.ts` (new) / shared helper
- ORG-024, PAPER-015; reused by ORG-008/009, PAPER-016
