# PAPER-014 — Paper discovery (public-org pool, ranking)

**Domain:** paper  
**Status:** Todo — placeholder recommendations  
**Spec:** docs/specs/paper/paper.md#8-paper-discovery  
**Depends on:** PAPER-013, PAPER-015, ORG-021

## Context
The Discover surface recommends papers the user doesn't have, drawn from papers shared to public orgs (`publicOrgIds` non-empty), ranked by keyword overlap with the user's `keywordProfile`. Non-members see list access only; content stays member-only.

## Scope / Tasks
- Source pool: papers with non-empty `publicOrgIds`, excluding papers already in the user's library or in orgs they belong to.
- Rank by summed weight of matching keywords vs `keywordProfile`; zero-paper users fall back to recency (most recently shared to a public org).
- Card: title, authors, year, synopsis snippet, source public-org badge(s), **"Join [Org] to read"** CTA. Reader/insights denied for non-members.

## Acceptance criteria
- [ ] Only public-org papers appear; already-owned / member-org papers are excluded.
- [ ] Ranking uses keyword overlap; empty profile falls back to recency with no error.
- [ ] Cards show source org(s) + "Join to read"; opening full view is denied for non-members.

## Affected files
- `src/app/(app)/discover/page.tsx` (replace placeholder)
- discovery API/query helper

## Test commands
- **Unit:** _No unit test yet_ — run the lane with `npm test`; add `src/…/<name>.test.{ts,tsx}` (single file: `npx vitest run <path>`).
- **E2E:** _No e2e spec yet_ — run the lane with `npm run test:e2e`; add `e2e/<name>.spec.ts`.
