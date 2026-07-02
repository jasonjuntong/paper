# ORG-019 — Org discovery: search + browse

**Domain:** org  
**Status:** Partial — listing only  
**Spec:** docs/specs/org/org-discovery.md#discovery-surfaces  
**Depends on:** ORG-021, ORG-024

## Context
The Discover surface lets users find **public** orgs via Search (by name/keyword, flat list) and Browse (all public orgs). Private orgs never appear. Each list item shows name, description, `member_count`, `paper_count`.

## Scope / Tasks
- Browse: list all public orgs.
- Search: find public orgs by name/keyword (flat list, no filters/sorting).
- List item display: name, description, member_count, paper_count (from `paperCount` — ORG-024).
- Exclude ghost orgs.

## Acceptance criteria
- [x] Only public, non-ghost orgs appear in browse/search.
- [ ] Search matches name/keyword and returns a flat list.
- [ ] Each item shows name, description, member count, and paper count (single-field read).

## Affected files
- `src/app/(app)/discover/page.tsx`
- discovery query helper
