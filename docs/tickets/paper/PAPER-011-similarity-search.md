# PAPER-011 — Similarity search (idea/proposal verification)

**Domain:** paper
**Status:** Todo
**Spec:** docs/specs/paper/paper.md#5-similarity-search-ideaproposal-verification
**Depends on:** PAPER-015, PAPER-010

## Context
Free for all users. The user enters an idea/proposal as text; it is embedded and run via `findNearest()` against stored paper embeddings. Scope is the user's library + member-org papers (full access) + all public-org papers (list-only), pre-filtered on `publicOrgIds`.

## Scope / Tasks
- Embed the query (`gemini-embedding-2`, 768d).
- `findNearest()` pre-filtered to: user library ∪ member-org papers ∪ `publicOrgIds` non-empty. Never scan private papers of others.
- Return ranked results with: paper details (from user entry if owned, else org snapshot), similarity score, source indicator, access indicator.
- List-only results (public org not joined) action = **"Join [Org] to read"**; opening full view denied by `checkVisibility`.
- Zero-org users: search still runs against library + all public-org papers (no error/empty warning).

## Acceptance criteria
- [ ] Query embeds and returns a ranked list with scores.
- [ ] Scope matches spec; private papers of others never appear.
- [ ] Each result shows source + access tier; public-org-not-joined results show "Join to read" and deny full view.
- [ ] Works with zero orgs.

## Affected files
- `src/app/api/papers/search/route.ts` (new)
- search UI surface
- `src/lib/gemini.ts`, `src/lib/paper-dedup.ts`
