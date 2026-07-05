# PAPER-010 — Paper visibility derivation + checkVisibility

**Domain:** paper  
**Status:** Done  
**Spec:** docs/specs/paper/paper.md#3-paper-visibility  
**Depends on:** PAPER-006

## Context
A paper's visibility is derived live from its share state, never stored. Two access tiers: **list** (metadata only) and **full** (detail page + PDF reader + AI insights). `checkVisibility` is the single access primitive used everywhere; it re-derives access on every request so revocation falls out naturally.

## Scope / Tasks
- Implement/harden `checkVisibility(uid, paperId)` returning the tier: full (own library or member org, public or private), list-only (public org the user hasn't joined), or none.
- No stored visibility flag; recompute from current shares each call.
- Used by serving (PAPER-009), search (PAPER-011), insights (PAPER-012), detail page.

## Acceptance criteria
- [x] Private library (no shares) → owner full, others none.
- [x] Shared to private org → owner + members full; others none.
- [x] Shared to public org → owner + members full; non-members list-only.
- [x] Access is recomputed per request (stale results / open pages do not retain access).

## Design notes
- `checkVisibility` returns a discriminated `Visibility`: `in-library` / `in-org` (both **full**) / `list` (public-org non-member → **list-only**) / `none`. Pure helpers `accessTier(v)` (`full`|`list`|`none`) and `isDedupVisible(v)` live in `paper-dedup-core.ts` so consumers don't hand-roll union checks.
- The **list** tier is derived from the denormalized `publicOrgIds` on the global paper — read defensively as `?? []`. Nothing populates that field yet (PAPER-015 / ORG-021 / ORG-003 own it), so the tier is **dormant-but-correct** in production today; see `docs/nuances.md` N-003.
- Consumers updated for the new tier: the PDF proxy (`src/app/api/papers/[paperId]/file/route.ts`) now serves only `full` (list-only → 403); the commit borderline branch (`src/app/api/papers/commit/route.ts`) gates on `isDedupVisible` so a public-org paper the user hasn't joined never prompts (would leak its title). The `init` route and commit auto-tier are unchanged (a `list` result falls through their `else` as silent, matching the spec).
- The **paper detail page stays owner-only** (its own library check, not `checkVisibility`), per spec §4 — org-shared/list reading has no UI until sharing lands (Phase 3). Deferred, not dropped.

## Affected files
- `src/lib/paper-dedup-core.ts` (`Visibility` `list` variant, `decideVisibility`, `accessTier`, `isDedupVisible`)
- `src/lib/paper-dedup.ts` (`checkVisibility` — public-org list derivation)
- `src/app/api/papers/[paperId]/file/route.ts` (full-only gate)
- `src/app/api/papers/commit/route.ts` (borderline gate on `isDedupVisible`)

## Test coverage
- **Unit — done.** `src/lib/paper-dedup.test.ts`: `decideVisibility` list variant + precedence (library > member-org > public-list > none); `accessTier` mapping (`in-library`/`in-org` → full, `list` → list, `none` → none); `isDedupVisible` (true for library/member-org, false for list/none).
- **Integration — done.** `tests/integration/paper-dedup.test.ts`: the Firestore-backed `checkVisibility` — public-org non-member → `list`, member of that public org → `in-org` (full), private-org non-member → `none`, and in-library precedence. Seeds `publicOrgIds` directly to exercise the tier without PAPER-015.
- **E2E — N/A.** List-only has no user-facing surface yet: public-org sharing (Phase 3), similarity search (PAPER-011), and discovery (PAPER-014) are unbuilt, and the detail page is owner-only, so a browser can't reach the tier. The access primitive is backend logic, covered by the unit + integration lanes (same rationale as PAPER-003/004/005).

## Test commands
- **Unit:**
  - Lane: `npm test`
  - Single file: `npx vitest run src/lib/paper-dedup.test.ts`
- **Integration:**
  - Lane: `npm run test:integration`
  - Single file: `firebase emulators:exec --project demo-paper --only auth,firestore 'npx vitest run --config vitest.integration.config.ts tests/integration/paper-dedup.test.ts'`
- **E2E:** none — lane is N/A (see Test coverage above).
