# ORG-020 — Org suggested/recommended (keyword overlap)

**Domain:** org
**Status:** Todo
**Spec:** docs/specs/org/org-discovery.md#suggested--recommended-logic
**Depends on:** PAPER-013, ORG-021

## Context
Suggested public orgs are ranked by keyword/tag overlap (no embeddings) between the user's `keywordProfile` and the keywords of papers shared to each public org. Org-side keywords are collected live per request (no materialized org keyword set at launch).

## Scope / Tasks
- Read the user's `keywordProfile` (PAPER-013).
- For each public org, collect keywords from its shared papers (live).
- Rank orgs by overlap (matching keywords scored by profile weight); show top as "Suggested".
- Zero-paper users: empty Suggested section; offer Search/Browse instead (no error/prompt).

## Acceptance criteria
- [ ] Suggested ranks public orgs by keyword overlap weighted by the user's profile.
- [ ] Org keywords are gathered live from shared papers.
- [ ] Zero-paper users see an empty Suggested section and fall back to Search/Browse.

## Affected files
- `src/app/(app)/discover/page.tsx`
- suggestion ranking helper
