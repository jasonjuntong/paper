# PAPER-004 — Layer 2 dedup (embedding similarity + borderline confirm)

**Domain:** paper
**Status:** Partial — borderline (0.85–0.92) confirm tier pending
**Spec:** docs/specs/paper/paper.md#2-deduplication-strategy
**Depends on:** PAPER-005

## Context
At commit, an embedding of the extracted `title + synopsis + keywords` is compared via `findNearest()` against global papers. Three tiers by cosine similarity to the top result: **≥ 0.92** → automatic duplicate ("same paper, different file"); **0.85 ≤ sim < 0.92** → **borderline** (ask the user to confirm, but only if the candidate is visible to them); **< 0.85** → treat as new. Automatic hits get the same visibility-based response as Layer 1.

## Scope / Tasks
- Generate embedding from `extractedMetadata` (never user edits).
- `findNearest()` cosine similarity; apply the three thresholds.
- **≥ 0.92:** run visibility check → in-library / in-org / silent (`ensureLibraryEntry` pointing at the existing global paper).
- **0.85–0.92 (borderline):** if the candidate is **visible** to the uploader, return `status: 'borderline'` with the candidate metadata so the UI can ask "is this the same paper?"; if it is **not** visible, treat as **new** (do not surface — avoids leaking a private/other-org paper's title).
- **< 0.85:** proceed as a new paper.

## Acceptance criteria
- [ ] Near-duplicate uploads (re-exports/scans) at ≥ 0.92 are caught automatically at commit.
- [ ] Borderline matches (0.85–0.92) prompt a confirm step only when the candidate is visible; otherwise the upload proceeds as new with no title leak.
- [ ] On an automatic or confirmed hit, no new global paper or PDF is created; the library entry points to the existing paper.
- [ ] Visibility-based response for automatic hits mirrors Layer 1.

## Affected files
- `src/app/api/papers/commit/route.ts`
- `src/lib/gemini.ts`
- `src/lib/paper-dedup.ts`
