# PAPER-010 — Paper visibility derivation + checkVisibility

**Domain:** paper  
**Status:** Partial  
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
- [ ] Shared to public org → owner + members full; non-members list-only.
- [x] Access is recomputed per request (stale results / open pages do not retain access).

## Affected files
- `src/lib/paper-dedup.ts` (`checkVisibility`)
